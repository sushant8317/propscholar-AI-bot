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
      case "angry":
        return "Stay calm, de-escalate politely, be firm but respectful.";
      case "sad":
        return "Be supportive and gentle but professional.";
      case "urgent":
        return "Be concise and direct.";
      case "positive":
        return "Stay professional but match the energy.";
      case "confused":
        return "Explain simply in a step-by-step way.";
      default:
        return "Use a clean professional support tone.";
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
  apiKey: process.env.OPENAI_API_KEY
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
   SMART MODEL SWITCHING
------------------------------------------------------- */

function chooseModel(query: string, moderatorSummon: boolean): "gpt-4.1" | "gpt-4.1-mini" {

  if (moderatorSummon) return "gpt-4.1";  

  if (query.length < 8) return "gpt-4.1-mini";

  if (/explain|difference|compare|why|how/.test(query)) return "gpt-4.1";

  return "gpt-4.1-mini";
}

/* -------------------------------------------------------
   ASK FINAL LLM
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

Rules:
- Use KB as truth.
- Expand with intelligent clarification.
- Follow tone instructions.
- NO new PropScholar rules.
- No emojis.
- If KB is empty, say:
"I don’t have much information regarding this. Let Harris or Sikha come in, they will reply in a better way sir. Until then please have patience."
`
        },
        { role: "user", content: prompt }
      ]
    });

    return completion.choices[0].message?.content || "Error generating response.";
  } catch (err: any) {
    console.error("GPT ERROR:", err.response?.data || err.message);
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
   MESSAGE HANDLER (MOD SILENT MODE)
------------------------------------------------------- */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  const isModerator = msg.member?.roles.cache.some(r =>
    ["Moderator", "Admin", "Staff"].includes(r.name)
  );

  // Bot only replies if tagged by moderator
  const botTagged = msg.mentions.users.has(client.user?.id || "");


  // Moderator message WITHOUT tagging bot → IGNORE COMPLETELY
  if (isModerator && !botTagged) return;

  // Show typing indicator immediately and keep it alive while processing
  msg.channel.sendTyping().catch(() => {});
  const typingLoop = setInterval(() => {
    msg.channel.sendTyping().catch(() => {});
  }, 4000);

  try {
    const rawText = msg.content.trim();
    let userQuery = preprocess(rawText);
    const userId = msg.author.id;

    const detectedTopic = topics.detectTopic(userQuery);
    const mood = moodService.detectMood(userQuery);
    const toneInstruction = moodService.professionalTone(mood);

    const tox = await toxic.check(userQuery);
    const ragResult = await rag.generateResponse(userId, userQuery, detectedTopic);
    const policies = inspector.inspect(userQuery);

    const rewritten = await scholaris.regenerateWithConstraints(
      userQuery,
      [...tox, ...policies]
    );

    const model = chooseModel(userQuery, botTagged);

    const finalPrompt = `
User Query: ${userQuery}
Rewritten Query: ${rewritten.answer}

Moderator Summon: ${botTagged}
Detected Topic: ${detectedTopic}
Mood: ${mood}
Tone Instruction: ${toneInstruction}

KB Answer:
${ragResult.answer}

Policies: ${policies.join(", ") || "none"}
Toxic Flags: ${tox.join(", ") || "none"}

Respond using KB + tone.
`;

    const finalText = await askFinalLLM(finalPrompt, model);

    clearInterval(typingLoop);
    await msg.reply(finalText);

    await memory.addShortTerm(userId, `User: ${userQuery}`);
    await memory.addShortTerm(userId, `Bot: ${finalText}`);

  } catch (err) {
    console.error("FULL BOT ERROR:", err);
    clearInterval(typingLoop);
    msg.reply("Internal AI error. Try again.");
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
   START SERVER
------------------------------------------------------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

if (process.env.INGEST_ON_STARTUP === "true") {
  import("./scripts/ingest-data").then(() =>
    console.log("📥 KB Ingest complete")
  );
}
