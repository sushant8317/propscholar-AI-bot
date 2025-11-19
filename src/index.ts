// src/index.ts

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits } from "discord.js";
import bodyParser from "body-parser";
import basicAuth from "express-basic-auth";
import path from "path";
import OpenAI from "openai";

dotenv.config();

/* -------------------------------------------------------
   LEVEL 2 FUZZY TYPO + SLANG NORMALIZATION
------------------------------------------------------- */

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) =>
      i === 0 ? j : j === 0 ? i : 0
    )
  );

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function fuzzyCorrect(word: string, dictionary: string[]): string {
  let best = word;
  let lowest = Infinity;

  for (const d of dictionary) {
    const dist = levenshtein(word, d);
    if (dist < lowest && dist <= 2) {
      lowest = dist;
      best = d;
    }
  }

  return best;
}

function preprocess(text: string) {
  // Normalize repeated letters, symbols, casing
  const normalize = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/(\w)\1{2,}/g, "$1");

  const slangMap: Record<string, string> = {
    helo: "hello",
    hlo: "hello",
    hii: "hi",
    hiii: "hi",
    plz: "please",
    pls: "please",
    thnx: "thanks",
    thanx: "thanks",
    wht: "what",
    dly: "daily",
  };

  const dictionary = [
    "hello", "hi", "daily", "drawdown", "rules", "trading", "news",
    "payout", "withdraw", "profit", "split", "challenge", "account",
    "limit", "maximum", "loss", "breach", "consistency", "model",
    "plus", "funded", "reset", "evaluation", "instant", "dd", "dmax"
  ];

  return normalize
    .split(" ")
    .map((word) => {
      if (slangMap[word]) return slangMap[word];
      return fuzzyCorrect(word, dictionary);
    })
    .join(" ");
}

/* -------------------------------------------------------
   ROUTERS
------------------------------------------------------- */
import { router as adminRouter } from "./controllers/admin.controller";
import { router as adminUIRouter } from "./controllers/admin-ui.controller";

/* -------------------------------------------------------
   SERVICES
------------------------------------------------------- */
import { RAGService } from "./services/rag.service";
import { ToxicDetectorService } from "./services/toxicDetector.service";
import { PolicyInspectorService } from "./services/policyInspector.service";
import { ScholarisService } from "./services/scholaris.service";
import { MemoryService } from "./services/memory.service";
import { TopicService } from "./services/topic.service";

const rag = new RAGService();
const toxic = new ToxicDetectorService();
const inspector = new PolicyInspectorService();
const scholaris = new ScholarisService();
const memory = new MemoryService();
const topics = new TopicService();

/* -------------------------------------------------------
   OPENAI CLIENT
------------------------------------------------------- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_FINAL_KEY,
});

/* -------------------------------------------------------
   EXPRESS APP
------------------------------------------------------- */

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Protect admin routes
app.use(
  "/admin",
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true,
  })
);

app.use("/admin", adminRouter);
app.use("/admin-ui", adminUIRouter);

/* -------------------------------------------------------
   MONGODB CONNECT
------------------------------------------------------- */

mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

/* -------------------------------------------------------
   FINAL GPT FUNCTION
------------------------------------------------------- */

async function askFinalLLM(prompt: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0.4,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content: `
You are Scholaris AI — PropScholar's official support assistant.
Rules:
Use only PropScholar KB provided in the prompt.
If KB is missing data, clearly say it.
No emojis. No hallucinations.
Professional, short, accurate sentences.
          `,
        },
        { role: "user", content: prompt },
      ],
    });

    return completion.choices[0].message?.content || "Error generating response.";
  } catch (err: any) {
    console.error("🔥 GPT ERROR:", err.response?.data || err.message);
    return "Internal AI error.";
  }
}

/* -------------------------------------------------------
   DISCORD BOT
------------------------------------------------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () => console.log("🤖 Discord bot ready!"));

/* -------------------------------------------------------
   MESSAGE HANDLER
------------------------------------------------------- */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  console.log("📩 USER:", msg.author.username, "→", msg.content);

  try {
    let userQuery = msg.content.trim();
    userQuery = preprocess(userQuery);

    const userId = msg.author.id;

    const detectedTopic = topics.detectTopic(userQuery);
    const tox = await toxic.check(userQuery);
    const ragResult = await rag.generateResponse(userId, userQuery, detectedTopic);
    const policies = inspector.inspect(userQuery);

    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...tox, ...policies]
    );

    const finalPrompt = `
User Query: ${userQuery}
Rewritten Query: ${rewritten.answer}

Detected Topic: ${detectedTopic}

PropScholar KB Answer:
${ragResult.answer}

Policies Triggered: ${policies.join(", ") || "none"}
Toxic Flags: ${tox.join(", ") || "none"}

Give a final clean PropScholar answer.
Never hallucinate. Never invent new rules.
Use only the KB or say "no info found".
    `;

    const finalText = await askFinalLLM(finalPrompt);

    await msg.reply(finalText);

    await memory.addShortTerm(userId, `User: ${userQuery}`);
    await memory.addShortTerm(userId, `Bot: ${finalText}`);
  } catch (err) {
    console.error("🔥 FULL BOT ERROR:", err);
    msg.reply("Internal AI error. Try again in a moment.");
  }
});

/* -------------------------------------------------------
   LOGIN TO DISCORD
------------------------------------------------------- */

client.login(process.env.DISCORD_TOKEN);

/* -------------------------------------------------------
   ROOT PAGE
------------------------------------------------------- */

app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

/* -------------------------------------------------------
   SERVER START
------------------------------------------------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

/* -------------------------------------------------------
   INGEST (OPTIONAL)
------------------------------------------------------- */

if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() =>
    console.log("📥 KB Ingest complete")
  );
}
