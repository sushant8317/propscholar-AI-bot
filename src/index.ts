// ----------------------------------------------------
// Load ENV First
// ----------------------------------------------------
import dotenv from "dotenv";
dotenv.config();

// ----------------------------------------------------
// Imports
// ----------------------------------------------------
import {
  Client,
  GatewayIntentBits,
  Message,
  Partials
} from "discord.js";

import axios from "axios";
import mongoose from "mongoose";
import express from "express";

import adminRouter from "./controllers/admin.controller";
import DynamicIngestService from "./services/dynamic-ingest.service";
import { RAGService } from "./services/rag.service";

// ----------------------------------------------------
// Initialize RAG
// ----------------------------------------------------
const rag = new RAGService();

// ----------------------------------------------------
// Mongo Schema (Optional, for logging Q/A)
// ----------------------------------------------------
const qaSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const QA = mongoose.model("QA", qaSchema);

// ----------------------------------------------------
// DB Connection
// ----------------------------------------------------
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
}

// ----------------------------------------------------
// Discord Client
// ----------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ----------------------------------------------------
// Fallback to Groq (when RAG fails)
// ----------------------------------------------------
async function askGroq(question: string): Promise<string> {
  try {
    const SYSTEM_PROMPT = `
You are the official AI assistant of PropScholar.
You MUST answer ONLY questions related to:
- PropScholar evaluations
- PropScholar rules
- Daily/DD rules
- Inactivity rules
- News restrictions
- PropScholar payout system
- PropScholar dashboard
- PropScholar scholarship model

STRICT RULES:
- If the question is NOT about PropScholar → REFUSE.
- Do NOT answer general trading questions.
- Do NOT answer world knowledge or unrelated topics.
- Reply: "I can only assist with questions related to PropScholar."

Be accurate, short, clean, and based ONLY on PropScholar knowledge base.
`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question }
        ],
        max_tokens: 800,
        temperature: 0.5
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (err: any) {
    console.error("Groq API Error:", err.response?.data || err.message);
    return "Something went wrong while processing your question.";
  }
}

// ----------------------------------------------------
// On Bot Ready
// ----------------------------------------------------
client.on("ready", () => {
  console.log(`🤖 Bot logged in as ${client.user?.tag}`);
});

// ----------------------------------------------------
// Message Handler (MAIN LOGIC)
// ----------------------------------------------------
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // Detect question
  const qWords = ["how", "what", "why", "can", "is", "does", "when", "where"];
  const isQuestion =
    content.includes("?") ||
    qWords.some((w) => content.toLowerCase().startsWith(w));

  if (!isQuestion) return;

  try {
    // Send typing safely
    if ("sendTyping" in message.channel) {
      await (message.channel as any).sendTyping();
    }

    // ----------------------------------------------------
    // 1️⃣ RAG RESPONSE
    // ----------------------------------------------------
    const ragResult = await rag.generateResponse(content);

    if (ragResult.answer && ragResult.confidence > 0.55) {
      return message.reply(`**Answer:**\n${ragResult.answer}`);
    }

    // ----------------------------------------------------
    // 2️⃣ FALLBACK: GROQ
    // ----------------------------------------------------
    const fallback = await askGroq(content);
    return message.reply(`**Answer:**\n${fallback}`);

  } catch (err) {
    console.error("Message Handler Error:", err);
  }
});

// ----------------------------------------------------
// Start DB + Bot
// ----------------------------------------------------
connectDB().then(() => client.login(process.env.DISCORD_TOKEN));

// ----------------------------------------------------
// Express Server for Render
// ----------------------------------------------------
const app = express();
app.use(express.json());
app.use("/admin", adminRouter);

app.get("/", (_, res) => res.send("OK - PropScholar AI Bot Online"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Server running on port ${PORT}`));

// ----------------------------------------------------
// AUTO INGEST SYSTEM
// ----------------------------------------------------
const svc = new DynamicIngestService();

if (process.env.INGEST_ON_STARTUP === "true") {
  svc.trigger();
}

if (process.env.AUTOMATIC_INGEST_MINUTES) {
  setInterval(
    () => svc.trigger(),
    Number(process.env.AUTOMATIC_INGEST_MINUTES) * 60 * 1000
  );
}
