// src/index.ts
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits } from "discord.js";
import bodyParser from "body-parser";
import basicAuth from "express-basic-auth";
import axios from "axios";

import { router as adminRouter } from "./controllers/admin.controller";
import { router as adminUIRouter } from "./controllers/admin-ui.controller";

import { RAGService } from "./services/rag.service";
import { ToxicDetectorService } from "./services/toxicDetector.service";
import { PolicyInspectorService } from "./services/policyInspector.service";
import { ScholarisService } from "./services/scholaris.service";

dotenv.config();

// ---------------------------------------------------
// EXPRESS
// ---------------------------------------------------
const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------
// SECURITY
// ---------------------------------------------------
app.use(
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true,
  })
);

// ---------------------------------------------------
// ROUTES
// ---------------------------------------------------
app.use("/admin", adminRouter);
app.use("/admin-ui", adminUIRouter);

// ---------------------------------------------------
// DATABASE
// ---------------------------------------------------
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ---------------------------------------------------
// DISCORD BOT
// ---------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ---------------------------------------------------
// SERVICES
// ---------------------------------------------------
const rag = new RAGService();                   // RAG + Memory + Synonyms + AI auto-learning (T2)
const toxic = new ToxicDetectorService();       // Toxicity guard
const inspector = new PolicyInspectorService(); // Policy guard
const scholaris = new ScholarisService();       // Guardrail rewriting

// ---------------------------------------------------
// GROQ LLM CALL
// ---------------------------------------------------
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
You are Scholaris AI — PropScholar's support assistant.
Short sentences. No emojis. Human tone.
Only PropScholar details. No forex advice.
            `,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 350,
        temperature: 0.5,
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
    console.error("LLM ERROR:", err.response?.data || err.message);
    return "Something went wrong while generating a response.";
  }
}

// ---------------------------------------------------
// DISCORD MESSAGE HANDLER
// ---------------------------------------------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const userQuery = msg.content.trim();
  const userId = msg.author.id;

  try {
    // 1️⃣ Check toxicity
    const toxicityIssues = await toxic.check(userQuery);

    // 2️⃣ RAG + Memory + AI Auto-Learning (T2)
    const ragResult = await rag.generateResponse(userId, userQuery);

    // 3️⃣ Detect rule violations
    const policyIssues = inspector.inspect(userQuery);

    // 4️⃣ Rewrite unsafe queries via Guardrails
    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...toxicityIssues, ...policyIssues]
    );

    // 5️⃣ FINAL prompt for Groq
    const finalPrompt = `
User Query:
${userQuery}

Rewritten Safe Version:
${rewritten.answer}

User Memory:
${ragResult.memory}

Policy Violations:
${policyIssues.join(", ") || "none"}

Toxic Flags:
${toxicityIssues.join(", ") || "none"}

Relevant Knowledge:
${ragResult.answer}

Tone Rules:
${ragResult.behaviour}

Generate FINAL SAFE & ACCURATE PropScholar answer.
    `;

    const finalReply = await askGroq(finalPrompt);
    msg.reply(finalReply);

  } catch (err) {
    console.error("BOT ERROR:", err);
    msg.reply("Something went wrong. Try again.");
  }
});

// ---------------------------------------------------
// DISCORD START
// ---------------------------------------------------
client.once("ready", () => {
  console.log("🤖 Bot logged in & ready");
});

client.login(process.env.DISCORD_TOKEN);

// ---------------------------------------------------
// EXPRESS ROOT
// ---------------------------------------------------
app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

// ---------------------------------------------------
// START WEB SERVER
// ---------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Server running on port ${PORT}`);
});

// ---------------------------------------------------
// OPTIONAL INGEST
// ---------------------------------------------------
if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => {
    console.log("📥 Automatic ingestion complete");
  });
}
