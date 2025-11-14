// ----------------------------------------------------
// MUST LOAD ENV FIRST
// ----------------------------------------------------
import dotenv from "dotenv";
dotenv.config();

// ----------------------------------------------------
// Imports
// ----------------------------------------------------
import {
  Client,
  GatewayIntentBits,
  Message
} from "discord.js";

import axios from "axios";
import mongoose from "mongoose";
import express from "express";

import adminRouter from "./controllers/admin.controller";
import DynamicIngestService from "./services/dynamic-ingest.service";
import { getPropScholarData } from "./data/propscholar-data";


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
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
};


// ----------------------------------------------------
// Discord Bot
// ----------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ]
});


// ----------------------------------------------------
// Ask LLaMA (Groq API)
// ----------------------------------------------------
const askOpenAI = async (question: string): Promise<string> => {
  try {
    const systemPrompt = await getPropScholarData();

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
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
    return "Sorry, something went wrong while processing your question.";
  }
};


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

  const lower = message.content.toLowerCase();
  const isQuestion =
    message.content.includes("?") ||
    ["how", "what", "why", "can", "is", "does", "when", "where"].some((w) =>
      lower.startsWith(w)
    );

  if (!isQuestion) return;

  try {
    const chan: any = message.channel;
    if (chan && typeof chan.sendTyping === "function") {
      await chan.sendTyping();
    }

    const answer = await askOpenAI(message.content);
    await message.reply(`**Answer:**\n${answer}`);
  } catch (err) {
    console.error(err);
  }
});


// ----------------------------------------------------
// Start DB + Bot
// ----------------------------------------------------
connectDB().then(() => client.login(process.env.DISCORD_TOKEN));


// ----------------------------------------------------
// MERGED EXPRESS SERVER (REQUIRED FOR RENDER)
// ----------------------------------------------------
const app = express();

// parse JSON for admin requests
app.use(express.json());

// Admin API routes
app.use("/admin", adminRouter);

// Health Check
app.get("/", (req, res) => {
  res.send("OK - PropScholar AI Bot Online");
});

// Render controls PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`);
});


// ----------------------------------------------------
// DYNAMIC INGEST SERVICE
// ----------------------------------------------------
const svc = new DynamicIngestService();

// Run ingestion on startup
if (process.env.INGEST_ON_STARTUP === "true") {
  svc.trigger();
}

// Auto re-ingest cron
if (process.env.AUTOMATIC_INGEST_MINUTES) {
  setInterval(
    () => svc.trigger(),
    Number(process.env.AUTOMATIC_INGEST_MINUTES) * 60 * 1000
  );
}
