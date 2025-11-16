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
import { Knowledge } from "./models/knowledge.model";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ---------- SECURITY ----------
app.use(
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true,
  })
);

// ---------- ROUTES ----------
app.use("/admin", adminRouter);
app.use("/admin-ui", adminUIRouter);

// ---------- MONGODB ----------
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ---------- DISCORD BOT ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const rag = new RAGService();

// ---------- MESSAGE HANDLER ----------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  try {
    const userQuery = msg.content.trim();
    const result = await rag.generateResponse(userQuery);

    const reply =
      result.answer && result.answer.length > 0
        ? result.answer
        : "I can answer PropScholar-related questions. Ask about rules, models, payouts, or trading conditions.";

    msg.reply(reply);
  } catch (err) {
    console.error("BOT ERROR:", err);
    msg.reply("Something went wrong. Try again.");
  }
});

// ---------- START DISCORD ----------
client.once("ready", () => {
  console.log("🤖 Bot logged in & ready");
});

client.login(process.env.DISCORD_TOKEN);

// ---------- EXPRESS ROOT ----------
app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

// ---------- START WEB SERVER ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Server running on port ${PORT}`);
});

// ---------- OPTIONAL INGEST ON STARTUP ----------
if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => {
    console.log("📥 Automatic ingestion complete.");
  });
}
