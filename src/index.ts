// src/index.ts
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

// Protect /admin
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
// MONGO
// ---------------------------
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ---------------------------
// LLM CALL (GPT)
// ---------------------------
async function askFinalLLM(prompt: string) {
  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `
You are Scholaris AI — PropScholar's official assistant.
- Short sentences
- No emojis
- NO hallucinations.
Answer strictly from the KB and user query.
            `,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 350,
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    return res.data.choices[0].message.content.trim();
  } catch (err: any) {
    console.error("🔥 OPENAI LLM ERROR:", err.response?.data || err.message);
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

client.on("ready", () => console.log("🤖 Discord bot ready!"));

// ---------------------------
// MESSAGE HANDLER
// ---------------------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  try {
    const userQuery = msg.content.trim();
    const userId = msg.author.id;

    // 1️⃣ Update topic FIRST
    await memory.updateTopic(userId, userQuery);

    // 2️⃣ Toxic check
    const tox = await toxic.check(userQuery);

    // 3️⃣ RAG brain
    const ragResult = await rag.generateResponse(userId, userQuery);

    // 4️⃣ Policy check
    const policies = inspector.inspect(userQuery);

    // 5️⃣ Final rewrite (guardrails)
    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...tox, ...policies]
    );

    // 6️⃣ Final LLM prompt
    const finalPrompt = `
User Query: ${userQuery}
Rewritten Query: ${rewritten.answer}

PropScholar Knowledge Base:
${ragResult.answer}

Policies Triggered: ${policies.join(", ") || "none"}
Toxic Flags: ${tox.join(", ") || "none"}

Give the final PropScholar-safe answer.
NEVER invent rules.
`;

    // 7️⃣ GPT final answer
    const finalAnswer = await askFinalLLM(finalPrompt);

    // 8️⃣ Reply
    await msg.reply(finalAnswer);

    // 9️⃣ Save memory (only 3 short-term)
    await memory.addShortTerm(userId, `User: ${userQuery}`);
    await memory.addShortTerm(userId, `Bot: ${finalAnswer}`);

  } catch (err) {
    console.error("🔥 FULL BOT ERROR:", err);
    msg.reply("Internal AI error. Please try again later.");
  }
});

// login bot
client.login(process.env.DISCORD_TOKEN);

// root
app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

// ingest on startup
if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() =>
    console.log("📥 KB Ingest complete")
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
