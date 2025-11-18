import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits } from "discord.js";
import bodyParser from "body-parser";
import basicAuth from "express-basic-auth";
import axios from "axios";
import path from "path";

dotenv.config();

// ---------------------------
// ROUTERS
// ---------------------------
import { router as adminRouter } from "./controllers/admin.controller";
import { router as adminUIRouter } from "./controllers/admin-ui.controller";

// ---------------------------
// SERVICES
// ---------------------------
import { RAGService } from "./services/rag.service";
import { ToxicDetectorService } from "./services/toxicDetector.service";
import { PolicyInspectorService } from "./services/policyInspector.service";
import { ScholarisService } from "./services/scholaris.service";
import { MemoryService } from "./services/memory.service";

// instantiate services
const rag = new RAGService();
const toxic = new ToxicDetectorService();
const inspector = new PolicyInspectorService();
const scholaris = new ScholarisService();
const memory = new MemoryService();

// ---------------------------
// EXPRESS APP
// ---------------------------
const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Protect ONLY /admin routes
app.use(
  "/admin",
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true,
  })
);

app.use("/admin", adminRouter);
app.use("/admin-ui", adminUIRouter);

// ---------------------------
// MONGODB
// ---------------------------
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ---------------------------
// GROQ LLM CALL
// ---------------------------
async function askGroq(prompt: string): Promise<string> {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `
You are Scholaris AI — PropScholar's official support assistant.
Short helpful sentences. No emojis. Professional tone.
Use PropScholar rules ONLY and avoid trading advice.
            `,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 350,
        temperature: 0.4,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.choices[0].message.content.trim();
  } catch (err: any) {
    console.error("🔥 GROQ ERROR:", err.response?.data || err.message);
    return "Internal AI error.";
  }
}

// ---------------------------
// DISCORD BOT
// ---------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Ready
client.on("ready", () => console.log("🤖 Discord bot ready!"));

// Message Handler
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  try {
    const userQuery = msg.content.trim();
    const userId = msg.author.id;

    const tox = await toxic.check(userQuery);
    const ragResult = await rag.generateResponse(userId, userQuery);
    const policies = inspector.inspect(userQuery);

    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...tox, ...policies]
    );

    const finalPrompt = `
User Query: ${userQuery}

Rewritten Query: ${rewritten.answer}

PropScholar Knowledge Base:
${ragResult.answer}

Policies: ${policies.join(", ") || "none"}
Toxic Flags: ${tox.join(", ") || "none"}

Give a final, clear PropScholar answer.
Never hallucinate.
`;

    const answer = await askGroq(finalPrompt);

    await msg.reply(answer);

    // ✔ SAVE MEMORY SAFE (ONLY HERE)
    await memory.addShortTerm(userId, `User: ${userQuery}`);
    await memory.addShortTerm(userId, `Bot: ${answer}`);

  } catch (err) {
    console.error("🔥 FULL BOT ERROR:", err);
    msg.reply("Internal AI error. Try again later.");
  }
});

// Login
client.login(process.env.DISCORD_TOKEN);

// Root
app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

// Optional Ingest
if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => {
    console.log("📥 KB Ingest complete");
  });
}
