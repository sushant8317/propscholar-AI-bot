// src/index.ts
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits } from "discord.js";
import bodyParser from "body-parser";
import basicAuth from "express-basic-auth";
import axios from "axios";
import path from "path";

import { router as adminRouter } from "./controllers/admin.controller";
import { router as adminUIRouter } from "./controllers/admin-ui.controller";

import { RAGService } from "./services/rag.service";
import { ToxicDetectorService } from "./services/toxicDetector.service";
import { PolicyInspectorService } from "./services/policyInspector.service";
import { ScholarisService } from "./services/scholaris.service";

dotenv.config();

const app = express();

// ---------------------------
// Body Parser
// ---------------------------
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------
// VIEW ENGINE (IMPORTANT)
// ---------------------------
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ---------------------------
// SECURITY
// Protect ONLY /admin
// ---------------------------
app.use(
  "/admin",
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true,
  })
);

// ---------------------------
// ROUTES
// ---------------------------
app.use("/admin", adminRouter);       // Protected
app.use("/admin-ui", adminUIRouter);  // Public dashboard

// ---------------------------
// DATABASE
// ---------------------------
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

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

// ---------------------------
// SERVICES
// ---------------------------
const rag = new RAGService();
const toxic = new ToxicDetectorService();
const inspector = new PolicyInspectorService();
const scholaris = new ScholarisService();

// ---------------------------
// GROQ LLM CALL
// ---------------------------
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
Short helpful sentences. No emojis.
Follow PropScholar rules only.
Never provide forex advice.
            `,
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 350,
        temperature: 0.4
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.data.choices[0].message.content.trim();
  } catch (err:any) {
    console.error("LLM ERROR:", err.response?.data || err.message);
    return "Error generating response.";
  }
}

// ---------------------------
// DISCORD MESSAGE HANDLER
// ---------------------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const userQuery = msg.content.trim();
  const userId = msg.author.id;

  try {
    const toxicityIssues = await toxic.check(userQuery);
    const ragResult = await rag.generateResponse(userId, userQuery);
    const policyIssues = inspector.inspect(userQuery);

    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...toxicityIssues, ...policyIssues]
    );

    const finalPrompt = `
User Query:
${userQuery}

Rewritten Safe Version:
${rewritten.answer}

Memory:
${ragResult.memory}

Relevant Knowledge:
${ragResult.answer}

Behaviour Rules:
${ragResult.behaviour}

Policies: ${policyIssues.join(", ") || "none"}
Toxic: ${toxicityIssues.join(", ") || "none"}

Generate final safe PropScholar answer.
    `;

    const finalReply = await askGroq(finalPrompt);
    msg.reply(finalReply);

  } catch (err) {
    console.error("BOT ERROR:", err);
    msg.reply("Something went wrong.");
  }
});

// ---------------------------
// DISCORD READY
// ---------------------------
client.once("ready", () => {
  console.log("🤖 Discord bot ready!");
});

client.login(process.env.DISCORD_TOKEN);

// ---------------------------
// ROOT ROUTE
// ---------------------------
app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

// ---------------------------
// START SERVER
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌍 Server running on port ${PORT}`);
});

// ---------------------------
// OPTIONAL INGEST
// ---------------------------
if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => {
    console.log("📥 Automatic ingestion complete");
  });
}
