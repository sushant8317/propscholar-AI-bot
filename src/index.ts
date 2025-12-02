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
      case "angry":
        return "Stay calm, de-escalate politely, be firm but respectful.";
      case "sad":
        return "Be supportive and gentle but professional.";
      case "urgent":
        return "Be concise and direct.";
      case "positive":
        return "Stay professional but match the energy.";
      case "confused":
        return "Explain step-by-step.";
      default:
        return "Use a clean professional tone.";
    }
  }
}

const moodService = new MoodService();

/* -------------------------------------------------------
   ROUTERS + EXISTING SERVICES
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
   NEW SERVICES (5)
------------------------------------------------------- */

import { IntentService } from "./services/intent.service";
import { AnalyticsService } from "./services/analytics.service";
import { CacheService } from "./services/cache.service";
import { RateLimitService } from "./services/rateLimit.service";
import { ContextService } from "./services/context.service";

const intentService = new IntentService();
const analytics = new AnalyticsService();
const cache = new CacheService();
const rateLimit = new RateLimitService();
const contextManager = new ContextService();

/* -------------------------------------------------------
   OPENAI
------------------------------------------------------- */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* -------------------------------------------------------
   EXPRESS
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
   MONGO
------------------------------------------------------- */

mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

/* -------------------------------------------------------
   MODEL CHOOSER
------------------------------------------------------- */

function chooseModel(query: string, moderatorSummon: boolean): "gpt-4.1" | "gpt-4.1-mini" {
  if (moderatorSummon) return "gpt-4.1";
  if (query.length < 8) return "gpt-4.1-mini";
  if (/explain|difference|compare|why|how/.test(query)) return "gpt-4.1";
  return "gpt-4.1-mini";
}

/* -------------------------------------------------------
   LLM CALL
------------------------------------------------------- */

async function askFinalLLM(prompt: string, model: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: `
You are Scholaris AI — PropScholar's official support assistant.
Use KB only. No emojis.
If KB empty: "I don’t have much information regarding this. Let Harris or Sikha come in…"
`
        },
        { role: "user", content: prompt }
      ]
    });

    return completion.choices[0].message?.content || "AI error.";
  } catch (err) {
    console.error("GPT ERROR:", err);
    return "Internal AI error.";
  }
}

/* -------------------------------------------------------
   DISCORD CLIENT
------------------------------------------------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => console.log("🤖 Discord ready!"));

/* -------------------------------------------------------
   UPGRADED MESSAGE HANDLER
------------------------------------------------------- */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const startTime = Date.now();
  const userId = msg.author.id;
  const botId = client.user?.id || "";

  // Moderator check
  const isModerator =
    msg.member?.roles.cache.some(r =>
      r.name.toLowerCase().includes("mod") || r.name.toLowerCase().includes("moderator")
    ) || false;

  // Detect if bot was tagged
  const botTagged =
    msg.mentions.users.has(botId) ||
    msg.content.includes(`<@${botId}>`) ||
    msg.content.includes(`<@!${botId}>`);

       /* -------------------------------------------------------
            MODERATOR COMMAND SYSTEM
              ------------------------------------------------------- */
     if (botTagged && isModerator) {
            const content = msg.content.replace(/<@!?\d+>/g, "").trim();

            // ANNOUNCE command
            if (/^announce\s+/i.test(content)) {
                     const text = content.replace(/^announce\s+/i, "").trim();
                     await msg.channel.send(`📢 **ANNOUNCEMENT**\n\n${text}`);
                     await msg.reply("✅ Announcement posted!");
                     return;
                   }

            // REPLY command
            const replyMatch = content.match(/^reply\s+<@!?(\d+)>\s+(.+)/i);
            if (replyMatch) {
                     const targetUser = await msg.guild?.members.fetch(replyMatch[1]);
                     if (targetUser) await msg.channel.send(`${targetUser}, ${replyMatch[2]}`);
                     await msg.reply("✅ Replied to user!"); return;
                   }

            // DM command
    const dmMatch = content.match(/^dm\s+<@!?(\d+)>\s+(.+)/i);
    if (dmMatch) {
      const targetUser = await msg.guild?.members.fetch(dmMatch[1]);
      if (targetUser) await targetUser.send(dmMatch[2]);
      await msg.reply("✅ DM sent!"); return;
    }

    // ANSWER command
    const answerMatch = content.match(/^answer\s+<@!?(\d+)>\s+about\s+(.+)/i);
    if (answerMatch) {
      const topic = answerMatch[2];
      const ragResp = await rag.generateResponse(userId, topic, topic);
      const targetUser = await msg.guild?.members.fetch(answerMatch[1]);
      if (targetUser) await msg.channel.send(`${targetUser}, ${ragResp.answer}`);
      await msg.reply("✅ Answered!"); return;
    }
            }

            

  // Silent mode
  if (isModerator && !botTagged) return;

  /* -------------------------------------------------------
     RATE LIMIT
  ------------------------------------------------------- */
  const rateCheck = rateLimit.check(userId, msg.content.trim());

  if (!rateCheck.allow) {
    return msg.reply("⏰ Please wait 10 seconds before asking another question!");
  }

  /* -------------------------------------------------------
     MODERATOR WAIT
  ------------------------------------------------------- */
  let modReplied = false;

  const collector = msg.channel.createMessageCollector({
    time: 20000,
    filter: (m) => {
      const isMod =
        m.member?.roles.cache.some(r =>
          r.name.toLowerCase().includes("mod")
        ) || false;

      if (isMod && !m.author.bot) {
        modReplied = true;

                 // Skip if moderator is using bot commands
        const isBotTagged = m.mentions.users.has(botId) || m.content.includes(`<@${botId}>`) || m.content.includes(`<@!${botId}>`);                 if (isBotTagged) return false;
                 if (isBotTagged) return false;
        collector.stop();
        return true;
         
      }
      return false;
    }
  });

  await new Promise(resolve => collector.on("end", resolve));

  if (modReplied) {
    console.log("⏭️ Moderator replied, skipping bot");
    return;
  }

  /* -------------------------------------------------------
     START TYPING LOOP
  ------------------------------------------------------- */
  msg.channel.sendTyping();
  const typingLoop = setInterval(() => msg.channel.sendTyping(), 3500);

  try {
    const raw = msg.content.trim();
    const userQuery = preprocess(raw);

    /* -------------------------------------------------------
       INTENT DETECTION
    ------------------------------------------------------- */
    const intent = intentService.detectIntent(userQuery);
    const quick = intentService.getQuickResponse(intent.intent);

    if (quick && !botTagged) {
      await msg.channel.send(quick);
      return;
    }

    /* -------------------------------------------------------
       CACHE CHECK
    ------------------------------------------------------- */
    const cached = cache.get(userQuery);
    if (cached && !botTagged) {
      await msg.channel.send(cached);
      await analytics.log({
        userId,
        query: userQuery,
        intent: intent.intent,
        cached: true,
        modelUsed: "cache",
        responseTime: Date.now() - startTime
      });
      return;
    }

    /* -------------------------------------------------------
       CONTEXT
    ------------------------------------------------------- */
    const context = contextManager.get(userId);

    /* -------------------------------------------------------
       EXISTING PIPELINE (RAG + REWRITE + POLICIES)
    ------------------------------------------------------- */
    const topic = topics.detectTopic(userQuery);
    const mood = moodService.detectMood(userQuery);
    const tone = moodService.professionalTone(mood);

    const tox = await toxic.check(userQuery);
    const ragResult = await rag.generateResponse(userId, userQuery, topic);

         // Active document highlighting & follow-up suggestions
         let kbHighlightBlock = "";
         if (ragResult.answer) {
                  kbHighlightBlock = `**From Knowledge Base:**\n> ${ragResult.answer}\n\n`;
                }
    const policies = inspector.inspect(userQuery);
    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...tox, ...policies]
    );

    const model = chooseModel(userQuery, botTagged);

    const finalPrompt = `
${context}

User Query: ${userQuery}
Rewritten: ${rewritten.answer}
Intent: ${intent.intent}
Topic: ${topic}
Mood: ${mood}
Tone: ${tone}

KB:
${kbHighlightBlock}

Policies: ${policies.join(", ") || "none"}
Toxic: ${tox.join(", ") || "none"}
`;

    /* -------------------------------------------------------
       LLM FINAL ANSWER
    ------------------------------------------------------- */
    const finalText = await askFinalLLM(finalPrompt, model);

    const response = await msg.reply(finalText);

    /* -------------------------------------------------------
       ADD TO CACHE + CONTEXT + ANALYTICS + MEMORY
    ------------------------------------------------------- */
    cache.set(userQuery, finalText);

    contextManager.add(userId, "user", userQuery, topic);
    contextManager.add(userId, "assistant", finalText, topic);

    await analytics.log({
      userId,
      query: userQuery,
      intent: intent.intent,
      cached: false,
      modelUsed: model,
      responseTime: Date.now() - startTime
    });

    try {
      await memory.addShortTerm(userId, `User: ${userQuery}`);
      await memory.addShortTerm(userId, `Bot: ${finalText}`);
    } catch (e) {
      console.error("MEMORY error:", e);
    }

  } catch (err) {
    console.error("BOT ERROR:", err);
    msg.channel.send("Internal AI error.");
  } finally {
    clearInterval(typingLoop);
  }
});

/* -------------------------------------------------------
   LOGIN + EXPRESS ROOT
------------------------------------------------------- */

client.login(process.env.DISCORD_TOKEN);

app.get("/", (req, res) => {
  res.send("PropScholar AI Bot Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() =>
    console.log("📥 KB Ingested")
  );
}
