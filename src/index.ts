// src/index.ts

import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits, GuildMember } from "discord.js";
import bodyParser from "body-parser";
import basicAuth from "express-basic-auth";
import path from "path";
import OpenAI from "openai";

dotenv.config();

/* -------------------------------------------------------
   FUZZY TYPO + SLANG NORMALIZATION
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
    dly: "daily"
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
   MOOD SERVICE (PROFESSIONAL TONE ENGINE)
------------------------------------------------------- */

class MoodService {
  detectMood(message: string): string {
    const text = message.toLowerCase();

    if (/fuck|madarchod|gandu|bc|mc|idiot|stupid/.test(text)) return "angry";
    if (/sad|upset|low|depressed|tired/.test(text)) return "sad";
    if (/fast|urgent|jaldi|quick/.test(text)) return "urgent";
    if (/thank|great|nice|awesome/.test(text)) return "positive";
    if (/confused|explain again|not sure/.test(text)) return "confused";

    return "neutral";
  }

  professionalTone(mood: string): string {
    switch (mood) {
      case "angry":
        return "Maintain calm tone, de-escalate politely, stay respectful and firm.";
      case "sad":
        return "Use a gentle, supportive professional tone.";
      case "urgent":
        return "Use concise, direct, fast-response professional tone.";
      case "positive":
        return "Match positivity while keeping it professional.";
      case "confused":
        return "Use simple, clear, step-by-step professional explanation.";
      default:
        return "Use standard clean professional support tone.";
    }
  }
}

const moodService = new MoodService();

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
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_FINAL_KEY
});

/* -------------------------------------------------------
   EXPRESS APP
------------------------------------------------------- */

const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  "/admin",
  basicAuth({
    users: { admin: process.env.ADMIN_API_KEY || "propscholar2069" },
    challenge: true
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
   SMART MODEL SELECTION LOGIC
------------------------------------------------------- */

/**
 * Decide model based on
 * - complexity score
 * - mood (angry/sensitive => prefer stronger model)
 * - moderator tag => strong model
 */
function complexityScore(text: string): number {
  const len = Math.min(1200, text.length);
  let score = 0;

  // length contributes
  if (len > 300) score += 2;
  else if (len > 150) score += 1;

  // question words: more likely complex
  const qWords = ["why", "how", "explain", "compare", "difference", "steps", "strategy"];
  for (const q of qWords) {
    if (text.includes(q)) score += 0.8;
  }

  // presence of multiple clauses (commas)
  const commas = (text.match(/,/g) || []).length;
  if (commas >= 2) score += 0.6;

  // presence of specialized tokens
  const specialist = ["drawdown", "payout", "consistency", "breach", "trailing", "scalping"];
  for (const s of specialist) if (text.includes(s)) score += 0.4;

  // normalize to 0..5
  return Math.min(5, score);
}

function chooseModel(opts: {
  userText: string;
  detectedMood: string;
  isModeratorCall: boolean;
  ragConfidence?: number;
}): { model: string; reason: string } {
  const { userText, detectedMood, isModeratorCall, ragConfidence } = opts;

  // If moderator explicitly called the bot, always full model
  if (isModeratorCall) return { model: "gpt-4.1", reason: "Moderator requested full model" };

  // If mood is angry or sensitive, prefer full model for safe handling
  if (detectedMood === "angry" || detectedMood === "sad") {
    return { model: "gpt-4.1", reason: "Sensitive mood (angry/sad) detected" };
  }

  // If RAG had very low confidence, use full model to avoid mistakes
  if (typeof ragConfidence === "number" && ragConfidence < 0.2) {
    return { model: "gpt-4.1", reason: "Low RAG confidence" };
  }

  // compute complexity
  const c = complexityScore(userText);

  // threshold: 1.5 and above => use full; else use mini
  if (c >= 1.5) {
    return { model: "gpt-4.1", reason: `Complexity ${c.toFixed(2)} >= 1.5` };
  }

  return { model: "gpt-4.1-mini", reason: `Complexity ${c.toFixed(2)} < 1.5` };
}

/* -------------------------------------------------------
   FINAL ASK FUNCTION (model param)
------------------------------------------------------- */

async function askFinalLLMWithModel(prompt: string, model: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: model === "gpt-4.1" ? 0.35 : 0.15,
      max_tokens: model === "gpt-4.1" ? 600 : 400,
      messages: [
        {
          role: "system",
          content: `
You are Scholaris AI — PropScholar's official support assistant.

RULES:
- Use the PropScholar KB answer as the factual base.
- You may expand with clear explanation, examples and step-by-step reasoning.
- Do NOT invent new PropScholar rules.
- Follow the Tone Instruction provided in the prompt.
- No emojis.
- If KB has no info, respond exactly:
"I don’t have much information regarding this. Let Harris or Sikha come in, they will reply in a better way sir. Until then please have patience."
`
        },
        { role: "user", content: prompt }
      ]
    });

    return completion.choices[0].message?.content || "Error generating response.";
  } catch (err: any) {
    console.error("🔥 GPT ERROR:", err?.response?.data || err?.message || err);
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
    GatewayIntentBits.MessageContent
  ]
});

client.on("clientReady", () => console.log("🤖 Discord bot ready!"));

/* -------------------------------------------------------
   MESSAGE HANDLER
------------------------------------------------------- */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  /* ----- MODERATOR IGNORE SYSTEM ----- */
  const moderators = ["harris_ps", "sikhaps", "harris", "sikha", "ps_admin"];
  const username = (msg.author.username || "").toLowerCase();

  // Basic username check (optionally you can use roles later)
  const isModerator = moderators.some(m => username.includes(m.toLowerCase()));

  // Did the author explicitly mention/tag Scholaris or use scholaris: prefix?
  const contentLower = (msg.content || "").toLowerCase();
  const mentionedScholaris =
    (msg.mentions && msg.mentions.users.size > 0 && msg.mentions.users.some(u => u.username.toLowerCase().includes("scholaris"))) ||
    contentLower.includes("@scholaris") ||
    contentLower.includes("scholaris:");

  if (isModerator && !mentionedScholaris) {
    console.log("⛔ Moderator message ignored:", msg.content);
    return; // do not process moderator messages unless they tag the bot
  }

  try {
    // 1) preprocess
    const rawUserMessage = msg.content.trim();
    let userQuery = preprocess(rawUserMessage);
    const userId = msg.author.id;

    // 2) topic / mood
    const detectedTopic = topics.detectTopic(userQuery);
    const mood = moodService.detectMood(userQuery);
    const toneInstruction = moodService.professionalTone(mood);

    // 3) toxicity and policies
    const tox = await toxic.check(userQuery);
    const policies = inspector.inspect(userQuery);

    // 4) RAG retrieval (this may use gpt-4.1-mini internally)
    const ragResult = await rag.generateResponse(userId, userQuery, detectedTopic);
    const ragConfidence = (ragResult && (ragResult.confidence || 0)) as number;

    // 5) rewrite for safety
    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...tox, ...policies]
    );

    // 6) decide model
    const isModeratorCall = isModerator && mentionedScholaris;
    const { model, reason } = chooseModel({
      userText: userQuery,
      detectedMood: mood,
      isModeratorCall,
      ragConfidence
    });

    console.log("Model decision:", model, reason, "topic:", detectedTopic, "mood:", mood);

    // 7) build final prompt for the LLM
    const finalPrompt = `
User Query: ${userQuery}
Rewritten Query: ${rewritten.answer}

Detected Topic: ${detectedTopic}
Detected Mood: ${mood}
Tone Instruction: ${toneInstruction}
Model Selection Reason: ${reason}

PropScholar KB Answer:
${ragResult.answer}

Policies Triggered: ${policies.join(", ") || "none"}
Toxic Flags: ${tox.join(", ") || "none"}

Your job:
- Use the KB answer as truth.
- Expand the explanation intelligently and clearly.
- Follow the Tone Instruction strictly.
- Never invent new PropScholar rules.
- If KB is empty -> reply with fallback exactly.
`;

    // 8) LLM call with chosen model
    const finalText = await askFinalLLMWithModel(finalPrompt, model);

    // 9) reply
    await msg.reply(finalText);

    // 10) memory writes
    await memory.addShortTerm(userId, `User: ${userQuery}`);
    await memory.addShortTerm(userId, `Bot: ${finalText}`);
  } catch (err) {
    console.error("🔥 FULL BOT ERROR:", err);
    try {
      await msg.reply("Internal AI error. Try again in a moment.");
    } catch (e) {
      console.error("Reply failed:", e);
    }
  }
});

/* -------------------------------------------------------
   LOGIN + SERVER
------------------------------------------------------- */

client.login(process.env.DISCORD_TOKEN);

const app = express();
app.get("/", (req, res) => res.send("PropScholar AI Bot Running"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

/* -------------------------------------------------------
   OPTIONAL INGEST
------------------------------------------------------- */

if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => console.log("📥 KB Ingest complete"));
}
