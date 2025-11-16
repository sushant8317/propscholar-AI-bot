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

// ---------------- LLM (GROQ) ----------------
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
You are Scholaris AI — PropScholar Support Assistant.

Rules:
- Speak like a calm human moderator.
- Short sentences.
- Clear explanations.
- No emojis.
- No robotic tone.
- Only talk about PropScholar topics.
- Never guess.
            `,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 350,
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
    return "Something went wrong while generating the answer.";
  }
}

// ---------------- MESSAGE HANDLER ----------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  try {
    const userQuery = msg.content.trim();

    // STEP 1: Retrieve relevant KB context
    const ragResult = await rag.generateResponse(userQuery);

    // STEP 2: Build final LLM prompt with RAG context
    const llmPrompt = `
User question:
"${userQuery}"

Relevant PropScholar Knowledge:
${ragResult.answer || "No exact match. Use PropScholar rules to answer correctly."}

Behaviour:
${ragResult.behaviour}

Now produce the final answer combining context + PropScholar policy.
    `;

    // STEP 3: LLM reasoning
    const finalReply = await askGroq(llmPrompt);

    // STEP 4: Reply to user
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

// ---------------- OPTIONAL INGEST ON STARTUP ----------------
if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => {
    console.log("📥 Automatic ingestion complete.");
  });
}
