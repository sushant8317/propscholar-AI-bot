// src/index.ts
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits } from "discord.js";
import bodyParser from "body-parser";
import basicAuth from "express-basic-auth";

import { router as adminRouter } from "./controllers/admin.controller";
import { router as adminUIRouter } from "./controllers/admin-ui.controller";

import { RAGService } from "./services/rag.service";
import axios from "axios";

dotenv.config();

// ---------------- EXPRESS ----------------
const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ---------------- SECURITY ----------------
app.use(
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true,
  })
);

// ---------------- ROUTES ----------------
app.use("/admin", adminRouter);
app.use("/admin-ui", adminUIRouter);

// ---------------- MONGODB ----------------
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ---------------- DISCORD BOT ----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const rag = new RAGService();

// ========== LLM CALL (GROQ) ==========
async function askGroq(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `
You are Scholaris AI — PropScholar's support assistant.
You speak like a human moderator:
- short sentences
- friendly but professional
- clear explanations
- no emojis
- no robotic tone
- always PropScholar context
- never guess unrelated topics
            `,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.6,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err: any) {
    console.error("LLM ERROR:", err.response?.data || err.message);
    return "Something went wrong generating a response.";
  }
}

// ---------------- MESSAGE HANDLER ----------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  try {
    const userQuery = msg.content.trim();

    // 1. Retrieve relevant KB context
    const ragResult = await rag.generateResponse(userQuery);

    // 2. Build intelligent prompt
    const llmPrompt = `
User question:
"${userQuery}"

Relevant PropScholar knowledge:
${ragResult.answer || "No direct match found, answer using policy understanding."}

Tone rules:
${ragResult.behaviour}

Now give the final answer combining understanding + knowledge.
    `;

    // 3. AI reasoning
    const finalReply = await askGroq(llmPrompt);

    // 4. Reply to user
    msg.reply(finalReply);
  } catch (err) {
    console.error("BOT ERROR:", err);
    msg.reply("Something went wrong. Try again.");
  }
});

// ---------------- START DISCORD ----------------
client.once("ready", () => {
  console.log("🤖 Bot logged in & ready");
});

client.login(process.env.DISCORD_TOKEN);

// ---------------- EXPRESS ROOT ----------------
app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

// ---------------- WEB SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Server running on port ${PORT}`);
});

// ---------------- OPTIONAL INGEST ----------------
if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => {
    console.log("📥 Automatic ingestion complete.");
  });
}
