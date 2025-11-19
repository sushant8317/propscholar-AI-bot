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
   MOOD + PROFESSIONAL TONE ENGINE
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
   ROUTERS + SERVICES
   (expects your existing controllers and services)
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
   MONGODB CONNECT
------------------------------------------------------- */
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

/* -------------------------------------------------------
   SMART MODEL SWITCHING
------------------------------------------------------- */
function chooseModel(query: string, moderatorSummon: boolean): "gpt-4.1" | "gpt-4.1-mini" {
  if (moderatorSummon) return "gpt-4.1";
  if (query.length < 8) return "gpt-4.1-mini";
  if (/explain|difference|compare|why|how/.test(query)) return "gpt-4.1";
  return "gpt-4.1-mini";
}

/* -------------------------------------------------------
   FINAL ASK (model param)
------------------------------------------------------- */
async function askFinalLLM(prompt: string, model: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: model === "gpt-4.1" ? 0.35 : 0.15,
      max_tokens: model === "gpt-4.1" ? 600 : 400,
      messages: [
        { role: "system", content: `
You are Scholaris AI — PropScholar's official support assistant.

Rules:
- Use the PropScholar KB answer as factual base.
- You may expand with clear explanations.
- Do not invent new PropScholar rules.
- Follow Tone Instruction provided in the user prompt.
- No emojis.
- If KB has no info, respond exactly:
"I don’t have much information regarding this. Let Harris or Sikha come in, they will reply in a better way sir. Until then please have patience."
` },
        { role: "user", content: prompt }
      ]
    });
    return completion.choices[0].message?.content || "Error generating response.";
  } catch (err: any) {
    console.error("GPT ERROR:", err?.response?.data || err?.message || err);
    return "Internal AI error.";
  }
}

/* -------------------------------------------------------
   Moderator role names (exact from your server screenshot)
   Reference image: /mnt/data/bfe00441-b6fc-4449-9586-f8fa379ad7ae.png
------------------------------------------------------- */
const MOD_ROLES = [
  "Harris | Moderator",
  "Sikha | Moderator",
  "Moderator",
  "Admin",
  "Staff"
];

/* -------------------------------------------------------
   Moderator activity tracking + pending question queue
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

const lastModeratorMessageAt: Record<string, number> = {}; // channelId -> timestamp
const pendingQuestionByChannel: Record<string, PendingQuestion | null> = {};

/* helpers */
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
   MESSAGE HANDLER (with full moderator-silent + 5min logic)
------------------------------------------------------- */

client.on("messageCreate", async (msg: Message) => {
  if (msg.author.bot) return;

  const channelId = (msg.channel as TextChannel).id;
  const now = Date.now();
  const member = msg.member;
  const authorIsModerator = isModeratorMember(member);
  const moderatorSummon = msg.mentions.users?.some(u => u.username?.toLowerCase()?.includes("scholaris")) || msg.content.toLowerCase().includes("@scholaris") || msg.content.toLowerCase().startsWith("scholaris");

  // If author is a moderator and not summoning the bot:
  // - update lastModeratorMessageAt for this channel
  // - if there is a pending question for this channel, mark moderator replied and cancel pending
  if (authorIsModerator) {
    // update last moderator activity
    lastModeratorMessageAt[channelId] = now;

    // if moderator replies and there was a pending question, cancel it (mod handled)
    const pending = pendingQuestionByChannel[channelId];
    if (pending) {
      // moderator has replied after user question => cancel pending and clear timer
      if (pending.timer) clearTimeout(pending.timer);
      pendingQuestionByChannel[channelId] = null;
      // do not reply from bot since moderator handled it
      return;
    }

    // if moderator is summoning the bot explicitly, allow normal processing below
    if (!moderatorSummon) {
      // per request, keep entirely silent when moderator talks (no bot reply)
      return;
    }
    // else continue and treat as summon (fallthrough)
  }

  try {
    const rawUserMessage = msg.content.trim();
    // Quick ignore of non-text or empty
    if (!rawUserMessage) return;

    // Question intent detection
    const lower = rawUserMessage.toLowerCase();
    const isAddressingBot = moderatorSummon || lower.includes("scholaris") || lower.startsWith("scholaris");
    const isQuestion =
      rawUserMessage.trim().endsWith("?") ||
      /\b(what|why|how|when|where|is|are|do|does|can|could|should|help|explain|difference|compare)\b/i.test(rawUserMessage);

    // If message neither addresses bot nor looks like a question, do not reply
    if (!isAddressingBot && !isQuestion) return;

    // If message explicitly summons bot (by moderator or user) -> reply immediately
    if (isAddressingBot) {
      // normal full flow below (immediate reply)
    } else {
      // is a detected question from user without explicit summon
      // If a moderator was active recently in this channel (< 5 minutes),
      // we should wait up to remaining time for the moderator to reply.
      const modLast = lastModeratorMessageAt[channelId] || 0;
      const fiveMins = 5 * 60 * 1000;

      if (modLast && (now - modLast) < fiveMins) {
        // Moderator was recently active. We will:
        // 1) send a polite single-line and
        // 2) create a pendingQuestion that will auto-answer if moderator doesn't reply within remaining time

        // If there's already a pending question, do nothing (avoid duplicates)
        if (pendingQuestionByChannel[channelId]) {
          // already waiting for moderator; do not requeue
          return;
        }

        // polite single-line
        await msg.reply("A moderator is handling your query sir. I’ll stay silent now.");

        // prepare pending question for auto-answer after remaining time if moderator doesn't reply
        const remaining = fiveMins - (now - modLast);

        // assemble minimal info to answer later
        const userQuery = preprocess(rawUserMessage);
        const detectedTopic = topics.detectTopic(userQuery);
        const mood = moodService.detectMood(userQuery);
        const toneInstruction = moodService.professionalTone(mood);

        // precompute some items now to save time later
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
          createdAt: now,
          timer: undefined
        };

        // schedule a timer to auto-respond if no moderator reply
        pq.timer = setTimeout(async () => {
          // if moderator replied in the meantime, pendingQuestionByChannel will have been cleared
          const stillPending = pendingQuestionByChannel[channelId];
          if (!stillPending) return;

          // build final prompt and choose model
          const model = chooseModel(userQuery, false);
          const finalPrompt = `
User Query: ${userQuery}
Detected Topic: ${detectedTopic}
Tone Instruction: ${toneInstruction}

PropScholar KB Answer:
${pq.ragAnswer}

Policies Triggered: ${pq.policies.join(", ") || "none"}
Toxic Flags: ${pq.tox.join(", ") || "none"}

Note: Moderator did not reply within 5 minutes so bot is answering.
`;

          const finalText = await askFinalLLM(finalPrompt, model);
          // reply in channel
          try {
            const ch = msg.channel as TextChannel;
            await ch.send(finalText);
            // store in memory
            await memory.addShortTerm(pq.userId, `User: ${pq.userQuery}`);
            await memory.addShortTerm(pq.userId, `Bot: ${finalText}`);
          } catch (e) {
            console.error("Failed to send queued bot reply:", e);
          } finally {
            pendingQuestionByChannel[channelId] = null;
          }
        }, remaining);

        pendingQuestionByChannel[channelId] = pq;
        return;
      }
      // else moderator not active recently -> proceed to answer immediately
    }

    // ------------- NORMAL ANSWER FLOW (immediate) -------------
    const userQuery = preprocess(rawUserMessage);
    const userId = msg.author.id;
    const detectedTopic = topics.detectTopic(userQuery);
    const mood = moodService.detectMood(userQuery);
    const toneInstruction = moodService.professionalTone(mood);

    const tox = await toxic.check(userQuery);
    const policies = inspector.inspect(userQuery);

    const ragResult = await rag.generateResponse(userId, userQuery, detectedTopic);

    // decide model
    const model = chooseModel(userQuery, moderatorSummon);

    const finalPrompt = `
User Query: ${userQuery}
Detected Topic: ${detectedTopic}
Detected Mood: ${mood}
Tone Instruction: ${toneInstruction}

PropScholar KB Answer:
${ragResult.answer}

Policies Triggered: ${policies.join(", ") || "none"}
Toxic Flags: ${tox.join(", ") || "none"}

Your job:
- Use KB truth.
- Expand intelligently.
- Follow Tone Instruction.
- Never invent new PropScholar rules.
- If KB is empty -> fallback message.
`;

    const finalText = await askFinalLLM(finalPrompt, model);
    await msg.reply(finalText);

    await memory.addShortTerm(userId, `User: ${userQuery}`);
    await memory.addShortTerm(userId, `Bot: ${finalText}`);

  } catch (err) {
    console.error("FULL BOT ERROR:", err);
    try { await msg.reply("Internal AI error. Try again."); } catch (e) {}
  }
});

/* -------------------------------------------------------
   LOGIN + SERVER
------------------------------------------------------- */
client.login(process.env.DISCORD_TOKEN);

app.get("/", (req, res) => res.send("PropScholar AI Bot Running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() => console.log("📥 KB Ingest complete"));
}
