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
import { RAGService } from "./services/rag.service"; // make sure correct path
// ----------------------------------------------------

const rag = new RAGService();

// ----------------------------------------------------
// Mongo Schema
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
// Mongo Connection
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
// Groq Fallback Function
// ----------------------------------------------------
async function askGroq(question: string): Promise<string> {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are PropScholar support assistant."
          },
          {
            role: "user",
            content: question
          }
        ],
        max_tokens: 500,
        temperature: 0.7
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
// Bot Ready
// ----------------------------------------------------
client.on("ready", () => {
  console.log(`🤖 Bot logged in as ${client.user?.tag}`);
});

// ----------------------------------------------------
// Message Handler
// ----------------------------------------------------
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const text = message.content.trim().toLowerCase();

  const questionKeywords = ["how", "what", "why", "can", "is", "does", "when", "where"];
  const isQuestion =
    message.content.includes("?") ||
    questionKeywords.some((w) => text.startsWith(w));

  if (!isQuestion) return;

  try {
    // SAFE TYPING FIX ✔
    if ("sendTyping" in message.channel) {
      await (message.channel as any).sendTyping();
    }

    // 1️⃣ Try RAG first
    const ragResult = await rag.generateResponse(message.content);

    if (ragResult && ragResult.answer && ragResult.confidence > 0.50) {
      return message.reply(`**Answer:**\n${ragResult.answer}`);
    }

    // 2️⃣ Fallback: Groq LLaMA
    const fallback = await askGroq(message.content);
    return message.reply(`**Answer:**\n${fallback}`);

  } catch (err) {
    console.error("Message Error:", err);
  }
});

// ----------------------------------------------------
// Start DB + Bot
// ----------------------------------------------------
connectDB().then(() => client.login(process.env.DISCORD_TOKEN));

// ----------------------------------------------------
// EXPRESS SERVER FOR RENDER
// ----------------------------------------------------
const app = express();
app.use(express.json());
app.use("/admin", adminRouter);

app.get("/", (_, res) => {
  res.send("OK - PropScholar AI Bot Online");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});

// ----------------------------------------------------
// AUTO INGEST
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
