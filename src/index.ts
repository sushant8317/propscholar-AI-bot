// src/index.ts

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits } from "discord.js";
import bodyParser from "body-parser";
import basicAuth from "express-basic-auth";
import path from "path";
import OpenAI from "openai";

dotenv.config();

// ---------------------------
// TYPO FIX FUNCTION
// ---------------------------
function preprocess(text: string) {
  const normalize = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/(\w)\1{2,}/g, "$1"); // heloooo → helo

  const autocorrectMap: Record<string, string> = {
    helo: "hello",
    hlo: "hello",
    hii: "hi",
    hiii: "hi",
    plz: "please",
    pls: "please",
  };

  return normalize
    .split(" ")
    .map((w) => autocorrectMap[w] || w)
    .join(" ");
}

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
import { TopicService } from "./services/topic.service";

const rag = new RAGService();
const toxic = new ToxicDetectorService();
const inspector = new PolicyInspectorService();
const scholaris = new ScholarisService();
const memory = new MemoryService();
const topics = new TopicService();

// ---------------------------
// OPENAI CLIENT
// ---------------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_FINAL_KEY,
});

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
// FINAL GPT FUNCTION
// ---------------------------
async function askFinalLLM(prompt: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content: `
You are Scholaris AI — PropScholar's official support assistant.
Rules:
Use only PropScholar KB provided in the prompt.
If KB is missing data, clearly say it.
No emojis. No hallucinations.
Professional, short, accurate sentences.
          `,
        },
        { role: "user", content: prompt },
      ],
    });

    return completion.choices[0].message?.content || "Error generating response.";
  } catch (err: any) {
    console.error("🔥 GPT-4.1 ERROR:", err.response?.data || err.message);
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

client.on("clientReady", () => console.log("🤖 Discord bot ready!"));

// ---------------------------
// BOT MESSAGE HANDLER
// ---------------------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  console.log("📩 USER:", msg.author.username, "→", msg.content);

  try {
    // CLEAN USER INPUT
    let userQuery = msg.content.trim();
    userQuery = preprocess(userQuery); // 👈 TYPO FIX APPLIED HERE

    const userId = msg.author.id;

    // 1️⃣ Topic detection
    const detectedTopic = topics.detectTopic(userQuery);

    // 2️⃣ Toxicity
    const tox = await toxic.check(userQuery);

    // 3️⃣ RAG retrieval
    const ragResult = await rag.generateResponse(userId, userQuery, detectedTopic);

    // 4️⃣ Policy Checks
    const policies = inspector.inspect(userQuery);

    // 5️⃣ Safety rewrite
    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...tox, ...policies]
    );

    // 6️⃣ Final prompt to GPT
    const finalPrompt = `
User Query: ${userQuery}
Rewritten Query: ${rewritten.answer}

Detected Topic: ${detectedTopic}

PropScholar KB Answer:
${ragResult.answer}

Policies Triggered: ${policies.join(", ") || "none"}
Toxic Flags: ${tox.join(", ") || "none"}

Give a final clean PropScholar answer.
Never hallucinate. Never invent new rules.
Use only the KB or say "no info found".
    `;

    const finalText = await askFinalLLM(finalPrompt);

    // 7️⃣ Reply
    await msg.reply(finalText);

    // 8️⃣ Memory
    await memory.addShortTerm(userId, `User: ${userQuery}`);
    await memory.addShortTerm(userId, `Bot: ${finalText}`);
  } catch (err) {
    console.error("🔥 FULL BOT ERROR:", err);
    msg.reply("Internal AI error. Please try again later.");
  }
});

// ---------------------------
// BOT LOGIN
// ---------------------------
client.login(process.env.DISCORD_TOKEN);

// ---------------------------
// ROOT PAGE
// ---------------------------
app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

// ---------------------------
// SERVER START
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

// ---------------------------
// OPTIONAL INGEST
// ---------------------------
if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => {
    console.log("📥 KB Ingest complete");
  });
}
