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

// ---------------- STRICT PROPSCHOLAR FILTER ----------------
function isPropScholarRelated(text: string) {
  const keywords = [
    "propscholar",
    "evaluation",
    "phase",
    "daily loss",
    "max loss",
    "drawdown",
    "funded",
    "challenge",
    "prop firm",
    "instant account",
    "payout",
    "rule",
    "news",
    "profit target",
    "model",
    "1 step",
    "2 step"
  ];

  text = text.toLowerCase();
  return keywords.some(k => text.includes(k));
}

// ------------------- Enhanced LLM Wrapper -------------------
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
You are PropScholar Support.
PropScholar is a *prop firm*, not a school or tutoring service.
You ONLY answer in context of:
- evaluations
- phases
- payouts
- rules
- drawdowns
- news rule
- account activation
- scaling
- models (1-step, 2-step, instant)

If the question is not related to PropScholar, reply:
"I can only help with PropScholar-related questions."

Tone:
Speak like a human moderator.
Calm, short sentences, friendly but clear.
Never guess. If you do not have the info, say:
"I don’t have enough information about that in the knowledge base."
            `
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 350,
        temperature: 0.45
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
    return "Something went wrong with the response.";
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

    // -------- Combined Prompt to LLM --------
    const llmPrompt = `
Behaviour:
${ragResult.behaviour}

Context From Knowledge Base:
${ragResult.answer || "No relevant context found in knowledge base."}

User Question:
${message.content}

Instructions:
- Respond in a friendly human moderator tone.
- Keep sentences short and clear.
- Use the context strictly.
- If the context is missing info, say:
  "I don’t have enough information about that in the knowledge base."
- Never guess.
- Never say PropScholar is a school or tutoring platform.
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
