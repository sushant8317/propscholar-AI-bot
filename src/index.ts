// src/index.ts

import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  Message,
  Partials
} from "discord.js";

import axios from "axios";
import mongoose from "mongoose";
import express from "express";
import path from "path";
import basicAuth from "express-basic-auth";

import adminRouter from "./controllers/admin.controller";
import adminUIRouter from "./controllers/admin-ui.controller";
import DynamicIngestService from "./services/dynamic-ingest.service";
import { RAGService } from "./services/rag.service";

const rag = new RAGService();

// ------------------- MongoDB -------------------
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
}

// ------------------- Discord -------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ---------------- STRICT PROPSCHOLAR MODE ----------------
function isPropScholarRelated(text: string) {
  const keywords = [
    "propscholar",
    "evaluation",
    "phase",
    "instant account",
    "daily loss",
    "max loss",
    "scholar phase",
    "examinee phase",
    "consistency rule",
    "drawdown",
    "eligibility",
    "prop firm",
    "challenge rules",
    "news rule",
    "profit target",
    "scholar",
    "plus model",
    "funded",
    "scalping rule",
  ];

  text = text.toLowerCase();
  return keywords.some(k => text.includes(k));
}

// ------------------- Universal LLM Wrapper -------------------
async function askGroq(prompt: string): Promise<string> {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a PropScholar support assistant.
Speak naturally like a human moderator. Keep the tone calm, friendly, and clear.
Use short sentences. Do not sound robotic.
Explain simply and ask clarifying questions if needed.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 350,
        temperature: 0.6
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch {
    return "Something went wrong.";
  }
}

// ------------------- Bot Ready -------------------
client.on("ready", () => {
  console.log(`🤖 Bot logged in as ${client.user?.tag}`);
});

// ------------------- Message Handler -------------------
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const text = message.content.toLowerCase().trim();

  const isQuestion =
    text.includes("?") ||
    ["how", "what", "why", "can", "is", "does", "when", "where"]
      .some(w => text.startsWith(w));

  if (!isQuestion) return;

  if (!isPropScholarRelated(text)) {
    return message.reply(
      "**I can only assist with PropScholar-related questions.**\nAsk me anything about rules, phases, payouts, drawdowns, challenges, or account activation."
    );
  }

  try {
    if ("sendTyping" in message.channel) {
      await (message.channel as any).sendTyping();
    }

    // -------- RAG Retrieval --------
    const ragResult = await rag.generateResponse(message.content);

    // Combine behaviour + RAG context + User Query
    const llmPrompt = `
Behaviour:
${ragResult.behaviour}

Context (Knowledge Base):
${ragResult.answer || "No matching data found."}

User Question:
${message.content}

Generate a helpful, short, human-style reply using the behaviour tone.
`;

    // -------- Ask LLM --------
    const response = await askGroq(llmPrompt);

    return message.reply(`**Answer:**\n${response}`);

  } catch (err) {
    console.error(err);
    return message.reply("Something went wrong.");
  }
});

// ------------------- Start Bot -------------------
connectDB().then(() => client.login(process.env.DISCORD_TOKEN));

// ------------------- Express (Render) -------------------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const authMiddleware = basicAuth({
  users: { admin: process.env.ADMIN_PASSWORD || "propscholar2069" },
  challenge: true
});
app.use("/admin", authMiddleware, adminUIRouter);
app.use("/admin", adminRouter);

app.get("/", (_, res) => {
  res.send("OK - PropScholar AI Online");
});

app.get("/admin/bot-status", (_, res) => {
  res.json({
    isOnline: client.isReady(),
    botTag: client.user?.tag || "Not logged in"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Server running on port ${PORT}`));

// ------------------- Auto Ingest -------------------
const svc = new DynamicIngestService();
if (process.env.INGEST_ON_STARTUP === "true") svc.trigger();
if (process.env.AUTOMATIC_INGEST_MINUTES)
  setInterval(() => svc.trigger(),
    Number(process.env.AUTOMATIC_INGEST_MINUTES) * 60 * 1000);
