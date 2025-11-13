import { Client, GatewayIntentBits, Message, MessageReaction, User, PartialMessageReaction, PartialUser, TextChannel, DMChannel } from 'discord.js';
import http from 'http';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getPropScholarData } from './data/propscholar-data';

dotenv.config();

const qaSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const QA = mongoose.model('QA', qaSchema);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ]
});

const askOpenAI = async (question: string): Promise<string> => {
  try {
        const systemPrompt = await getPropScholarData();
    const response = await axios.post(
'https://api.groq.com/openai/v1/chat/completions',      {
model: 'llama-3.1-8b-instant',       messages: [          {
            role: 'system',
            content: systemPrompt
                    },
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

client.on('ready', () => {
  console.log(`🤖 Bot logged in as ${client.user?.tag}`);
  console.log('✅ Ready to answer questions!');
});

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;
  // if (!message.content.startsWith('!ask')) return;


    // ==========================================
  // SPAM & SLANG FILTERING
  // ==========================================
  
  const messageContent = message.content.toLowerCase();
  const member = message.member;
  
  // Slang/Profanity words
  const slangs = ['fuck', 'shit', 'bitch', 'ass', 'bastard', 'wtf', 'stfu', 'retard', 'idiot', 'moron', 'stupid'];
  
  // Spam patterns (links, spam keywords)
  const spamPatterns = [
    /discord\.gg/i,
    /t\.me/i,
    /bit\.ly/i,
    /https?:\/\//i,
    /dm me/i,
    /check my/i,
    /free money/i,
    /click here/i,
    /join my/i,
    /telegram/i
  ];
  
  // Check for slang/profanity
  const hasSlang = slangs.some(slang => messageContent.includes(slang));
  if (hasSlang && member) {
    try {
      await message.delete();
      await member.timeout(24 * 60 * 60 * 1000, 'Inappropriate language');
      console.log(`Deleted message and timed out user ${member.user.tag} for slang`);
      return;
    } catch (error) {
      console.error('Error handling slang:', error);
    }
  }
  
  // Check for spam/links
  const isSpam = spamPatterns.some(pattern => pattern.test(message.content));
  if (isSpam && member) {
    try {
      await message.delete();
      await member.timeout(24 * 60 * 60 * 1000, 'Spam/unauthorized links');
      console.log(`Deleted message and timed out user ${member.user.tag} for spam`);
      return;
    } catch (error) {
      console.error('Error handling spam:', error);
    }
  }
  
  // Question detection - only respond to actual questions
  const questionWords = ['how', 'what', 'when', 'where', 'why', 'can', 'is', 'do', 'does', 'will', 'which', 'who', 'could', 'would', 'should'];
  const hasQuestionMark = message.content.includes('?');
  const hasQuestionWord = questionWords.some(word => messageContent.includes(word));
  const isLongEnough = message.content.length > 15;
  
  // Only respond if it's a question or substantial query
  if (!hasQuestionMark && !hasQuestionWord && !isLongEnough) {
    return; // Ignore casual chat
  }
  
  // ==========================================

  const question = message.content.trim();
  if (!question) {
        message.reply('Please provide a question.');
        return;
  }

  try {
    // Type guard to check if channel supports sendTyping
    if (message.channel && 'sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    const answer = await askOpenAI(question);

      // Check if answer is uncertain or bot can't help
  const uncertainPhrases = [
    "i don't know",
    "i'm not sure",
    "i cannot",
    "i can't",
    "unclear",
    "not found",
    "no information"
  ];
  
  const isUncertain = uncertainPhrases.some(phrase => answer.toLowerCase().includes(phrase));
  const isTooShort = answer.length < 50; // Very short answers might be uncertain
  
  if (isUncertain || isTooShort) {
    await message.reply("I'm not sure about this one. Let me get our moderators to help you with this! <@MODERATOR_ID_HERE>");
    return;
  }


    const botReply = await message.reply(`**Answer:**\n${answer}}`);

  }
});


connectDB().then(() => {
  client.login(process.env.DISCORD_TOKEN);
});

// Create a simple HTTP server for Render health checks
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Discord bot is running!');
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});
