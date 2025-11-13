import { Client, GatewayIntentBits, Message, MessageReaction, User, PartialMessageReaction, PartialUser, TextChannel, DMChannel } from 'discord.js';
import http from 'http';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const qaSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  feedback: { type: String, enum: ['positive', 'negative', 'none'], default: 'none' },
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
    const response = await axios.post(
'https://api.groq.com/openai/v1/chat/completions',      {
model: 'llama-3.1-8b-instant',       messages: [          {
            role: 'system',
            content: 'You are a helpful support assistant for PropScholar, a prop trading platform. Answer questions about trading, platform features, and account management.'
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

    const botReply = await message.reply(`**Answer:**\n${answer}\n\n_React with ✅ if this helped or ❌ if it didn't_`);

    const qaRecord = new QA({
      question,
      answer,
      userId: message.author.id,
      username: message.author.username
    });
    await qaRecord.save();

    await botReply.react('✅');
    await botReply.react('❌');

  } catch (error) {
    console.error('Error handling message:', error);
    message.reply('Sorry, something went wrong. Please try again later.');
  }
});

client.on('messageReactionAdd', async (
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) => {
  if (user.bot) return;

  try {
    if (reaction.partial) {
      await reaction.fetch();
    }
    if (reaction.message.partial) {
      await reaction.message.fetch();
    }

    if (reaction.message.author?.id !== client.user?.id) return;

    const messageContent = reaction.message.content;
    if (!messageContent) return;

    const answerMatch = messageContent.match(/\*\*Answer:\*\*\\n([\\s\\S]+?)\\n\\n/);
    if (!answerMatch) return;

    const answer = answerMatch[1];
    const feedback = reaction.emoji.name === '✅' ? 'positive' : reaction.emoji.name === '❌' ? 'negative' : 'none';

    await QA.findOneAndUpdate(
      { answer: answer },
      { feedback: feedback },
      { sort: { timestamp: -1 } }
    );

    console.log(`Feedback received: ${feedback} from ${user.tag}`);
  } catch (error) {
    console.error('Error handling reaction:', error);
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
