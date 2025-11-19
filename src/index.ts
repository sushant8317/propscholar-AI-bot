// src/index.ts
import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Client, GatewayIntentBits, Message, TextChannel } from "discord.js";
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
    .map((word) => slangMap[word] || fuzzyCorrect(word, dictionary))
    .join(" ");
}

/* -------------------------------------------------------
   MOOD ENGINE
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
      case "angry": return "Stay calm, de-escalate politely, be firm but respectful.";
      case "sad": return "Be supportive and gentle but professional.";
      case "urgent": return "Be concise and direct.";
      case "positive": return "Stay professional but match the energy.";
      case "confused": return "Explain simply in a step-by-step way.";
      default: return "Use a clean professional support tone.";
    }
  }
}

const moodService = new MoodService();

/* -------------------------------------------------------
   SERVICES + ROUTERS
------------------------------------------------------- */

import { router as adminRouter } from "./controllers/admin.controller";
import { router as adminUIRouter } from "./controllers/admin-ui.controller";
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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
   MONGO DB
------------------------------------------------------- */

mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

/* -------------------------------------------------------
   MODEL PICKER
------------------------------------------------------- */

function chooseModel(query: string, moderatorSummon: boolean): "gpt-4.1" | "gpt-4.1-mini" {
  if (moderatorSummon) return "gpt-4.1";
  if (query.length < 8) return "gpt-4.1-mini";
  if (/explain|difference|compare|why|how/.test(query)) return "gpt-4.1";
  return "gpt-4.1-mini";
}

/* -------------------------------------------------------
   FINAL ANSWER ENGINE
------------------------------------------------------- */

async function askFinalLLM(prompt: string, model: string): Promise<string> {
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
- Use KB as truth.
- No new rules.
- Follow tone.
- No emojis.
- If no KB info: "I don’t have much information regarding this. Let Harris or Sikha come in, they will reply in a better way sir. Until then please have patience."
`
        },
        { role: "user", content: prompt }
      ]
    });

    return completion.choices[0].message?.content || "Error generating response.";
  } catch (e) {
    console.error("GPT ERROR: ", e);
    return "Internal AI error.";
  }
}

/* -------------------------------------------------------
   MOD ROLES
------------------------------------------------------- */

const MOD_ROLES = [
  "Harris | Moderator",
  "Sikha | Moderator",
  "Moderator",
  "Admin",
  "Staff"
];

/* -------------------------------------------------------
   Pending Queue
------------------------------------------------------- */

type PendingQuestion = {
  channelId: string;
  userId: string;
  rawUserMessage: string;
  userQuery: string;
  detectedTopic: string;
  toneInstruction: string;
  tox: string[];
  policies: string[];
  ragAnswer: string;
  modelReason: string;
  timer?: NodeJS.Timeout;
  createdAt: number;
};

const lastModeratorMessageAt: Record<string, number> = {};
const pendingQuestionByChannel: Record<string, PendingQuestion | null> = {};

function isModeratorMember(member: any): boolean {
  if (!member) return false;
  const roles = member.roles?.cache;
  if (!roles) return false;
  return roles.some((r: any) => MOD_ROLES.includes(r.name));
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
   MESSAGE LOGIC (with 1-minute mod silence)
------------------------------------------------------- */

client.on("messageCreate", async (msg: Message) => {
  if (msg.author.bot) return;

  const channelId = (msg.channel as TextChannel).id;
  const now = Date.now();
  const member = msg.member;

  const rawUserMessage = msg.content.trim();
  const authorIsModerator = isModeratorMember(member);

  const explicitlySummoned =
    rawUserMessage.toLowerCase().includes("scholaris") ||
    msg.mentions.users?.some((u) => u.username?.toLowerCase()?.includes("scholaris"));

  /* -------------------------------------------------------
     HARD SILENCE FOR MODERATORS
     (Bot speaks ONLY if moderator tags it)
  ------------------------------------------------------- */
  if (authorIsModerator) {
    lastModeratorMessageAt[channelId] = now;

    const pending = pendingQuestionByChannel[channelId];
    if (pending && pending.timer) clearTimeout(pending.timer);
    pendingQuestionByChannel[channelId] = null;

    if (!explicitlySummoned) return;
  }

  try {
    if (!rawUserMessage) return;

    const lower = rawUserMessage.toLowerCase();
    const isAddressingBot =
      explicitlySummoned ||
      lower.includes("scholaris") ||
      lower.startsWith("scholaris");

    const isQuestion =
      rawUserMessage.endsWith("?") ||
      /\b(what|why|how|when|where|is|are|do|does|can|could|should|help|explain|difference|compare)\b/i.test(
        rawUserMessage
      );

    if (!isAddressingBot && !isQuestion) return;

    // If normal user asks but moderator recently active → wait 1 minute
    if (!isAddressingBot) {
      const modLast = lastModeratorMessageAt[channelId] || 0;
      const oneMinute = 1 * 60 * 1000;

      if (modLast && now - modLast < oneMinute) {

        if (pendingQuestionByChannel[channelId]) return;

        await msg.reply("A moderator is handling your query sir. I’ll stay silent for a minute.");

        const remaining = oneMinute - (now - modLast);

        const userQuery = preprocess(rawUserMessage);
        const detectedTopic = topics.detectTopic(userQuery);
        const mood = moodService.detectMood(userQuery);
        const toneInstruction = moodService.professionalTone(mood);

        const tox = await toxic.check(userQuery);
        const policies = inspector.inspect(userQuery);
        const ragResult = await rag.generateResponse(msg.author.id, userQuery, detectedTopic);

        const pq: PendingQuestion = {
          channelId,
          userId: msg.author.id,
          rawUserMessage,
          userQuery,
          detectedTopic,
          toneInstruction,
          tox,
          policies,
          ragAnswer: ragResult.answer,
          modelReason: "moderator-wait-fallback",
          createdAt: now
        };

        pq.timer = setTimeout(async () => {
          const stillPending = pendingQuestionByChannel[channelId];
          if (!stillPending) return;

          const model = chooseModel(userQuery, false);

          const finalPrompt = `
User Query: ${userQuery}
Detected Topic: ${detectedTopic}
Tone: ${toneInstruction}

KB:
${pq.ragAnswer}

Policies: ${pq.policies.join(", ") || "none"}
Toxic: ${pq.tox.join(", ") || "none"}

Note: Moderator did not reply within 1 minute.
`;

          const finalText = await askFinalLLM(finalPrompt, model);

          try {
            const ch = msg.channel as TextChannel;
            await ch.send(finalText);

            await memory.addShortTerm(pq.userId, `User: ${pq.userQuery}`);
            await memory.addShortTerm(pq.userId, `Bot: ${finalText}`);
          } finally {
            pendingQuestionByChannel[channelId] = null;
          }
        }, remaining);

        pendingQuestionByChannel[channelId] = pq;
        return;
      }
    }

    /* -------------------------------------------------------
       IMMEDIATE ANSWER FLOW
    ------------------------------------------------------- */

    const userQuery = preprocess(rawUserMessage);
    const userId = msg.author.id;
    const detectedTopic = topics.detectTopic(userQuery);
    const mood = moodService.detectMood(userQuery);
    const toneInstruction = moodService.professionalTone(mood);

    const tox = await toxic.check(userQuery);
    const policies = inspector.inspect(userQuery);
    const ragResult = await rag.generateResponse(userId, userQuery, detectedTopic);

    const model = chooseModel(userQuery, isAddressingBot);

    const finalPrompt = `
User Query: ${userQuery}
Detected Topic: ${detectedTopic}
Mood: ${mood}
Tone: ${toneInstruction}

KB:
${ragResult.answer}

Policies: ${policies.join(", ") || "none"}
Toxic: ${tox.join(", ") || "none"}
`;

    const finalText = await askFinalLLM(finalPrompt, model);

    await msg.reply(finalText);

    await memory.addShortTerm(userId, `User: ${userQuery}`);
    await memory.addShortTerm(userId, `Bot: ${finalText}`);

  } catch (e) {
    console.error("FULL BOT ERROR:", e);
    try {
      await msg.reply("Internal AI error. Try again.");
    } catch {}
  }
});

/* -------------------------------------------------------
   SERVER + LOGIN
------------------------------------------------------- */
client.login(process.env.DISCORD_TOKEN);

app.get("/", (req, res) => res.send("PropScholar AI Bot Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => console.log("📥 KB Ingest complete"));
}
