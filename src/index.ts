import { 
  Client, 
  GatewayIntentBits, 
  Message 
} from 'discord.js';

import http from 'http';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from "express";
import cron from "node-cron";

import adminRouter from "./controllers/admin.controller";
import DynamicIngestService from "./services/dynamic-ingest.service";
import { getPropScholarData } from './data/propscholar-data';

dotenv.config();

/* ----------------------------------------------------
   Mongo Schema
---------------------------------------------------- */
const qaSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const QA = mongoose.model('QA', qaSchema);

/* ----------------------------------------------------
   Mongo Connection
---------------------------------------------------- */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

/* ----------------------------------------------------
   Discord Bot
---------------------------------------------------- */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ]
});

/* ----------------------------------------------------
   AI Answer Function
---------------------------------------------------- */
const askOpenAI = async (question: string): Promise<string> => {
  try {
    const systemPrompt = await getPropScholarData();

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    return 'Sorry, I encountered an error processing your question. Please try again later.';
  }
};

/* ----------------------------------------------------
   Bot Ready Event
---------------------------------------------------- */
client.on('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user?.tag}`);
  console.log('✅ Ready to answer questions!');
});

/* ----------------------------------------------------
   Message Handler
---------------------------------------------------- */
client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;

  const messageContent = message.content.toLowerCase();
  const member = message.member;

  // SPAM / SLANG FILTERING
  const slangs = ['fuck', 'shit', 'bitch', 'ass', 'bastard', 'wtf', 'stfu', 'retard', 'idiot', 'moron', 'stupid'];
  const spamPatterns = [
    /discord\.gg/i, /t\.me/i, /bit\.ly/i, /https?:\/\//i,
    /dm me/i, /check my/i, /free money/i, /click here/i,
    /join my/i, /telegram/i
  ];

  if (slangs.some(s => messageContent.includes(s))) {
    try {
      await message.delete();
      await member?.timeout(86400000, 'Inappropriate language');
    } catch {}
    return;
  }

  if (spamPatterns.some(p => p.test(message.content))) {
    try {
      await message.delete();
      await member?.timeout(86400000, 'Spam/unauthorized links');
    } catch {}
    return;
  }

  // QUESTION DETECTION
  const questionWords = [
    'how', 'what', 'when', 'where', 'why', 'can', 'is', 'do',
    'does', 'will', 'which', 'who', 'could', 'would', 'should'
  ];

  const hasQuestionMark = message.content.includes('?');
  const hasQuestionWord = questionWords.some(word => messageContent.includes(word));
  const isLongEnough = message.content.length > 15;

  if (!hasQuestionMark && !hasQuestionWord && !isLongEnough) {
    return;
  }

  const question = message.content.trim();
  if (!question) return;

  try {
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    const answer = await askOpenAI(question);

    const uncertain = ["i don't know", "i'm not sure", "cannot", "unclear", "not found"];
    const isUncertain = uncertain.some(p => answer.toLowerCase().includes(p));

    if (isUncertain || answer.length < 50) {
      await message.reply("I'm not sure about this one. Let me get our moderators to help you with this! <@MODERATOR_ID_HERE>");
      return;
    }

    await message.reply(`**Answer:**\n${answer}`);
  } catch (error) {
    console.error(error);
  }
});

/* ----------------------------------------------------
   Connect DB + Login Bot
---------------------------------------------------- */
connectDB().then(() => {
  client.login(process.env.DISCORD_TOKEN);
});

/* ----------------------------------------------------
   Render Health Check Server
---------------------------------------------------- */
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Discord bot is running!');
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

/* ----------------------------------------------------
   ADMIN API + DYNAMIC INGEST + CRON (ADDED HERE)
---------------------------------------------------- */

const app = express();
app.use("/admin", adminRouter);

app.listen(10001, () => {
  console.log("Admin API running on port 10001");
});

const svc = new DynamicIngestService();

// run ingest on startup
if (process.env.INGEST_ON_STARTUP === "true") {
  svc.trigger();
}

// schedule automatic re-ingest
if (process.env.AUTOMATIC_INGEST_MINUTES) {
  setInterval(
    () => svc.trigger(),
    Number(process.env.AUTOMATIC_INGEST_MINUTES) * 60 * 1000
  );
}
