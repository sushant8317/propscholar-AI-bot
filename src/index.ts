import { Client, GatewayIntentBits, Message, MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
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
    await mongoose.connect(process.env.MONGO_URI!);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Error:', error);
    process.exit(1);
  }
};

connectDB();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

async function askGPT(question: string): Promise<string> {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a helpful support assistant for PropScholar, a prop trading platform. Provide clear, concise answers.' },
          { role: 'user', content: question }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (error: any) {
    console.error('❌ OpenAI Error:', error.response?.data || error.message);
    return 'Sorry, I encountered an error. Please try again.';
  }
}

client.once('ready', () => {
  console.log(`🤖 Bot online as ${client.user?.tag}`);
});

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!ask ')) return;
  
  const question = message.content.slice(5).trim();
  if (!question) {
    await message.reply('Please provide a question: `!ask How do I...?`');
    return;
  }
  
  try {
    await message.channel.sendTyping();
    const answer = await askGPT(question);
    const reply = await message.reply(`${answer}\n\n─────────────\n*Helpful?* React ✅ or ❌`);
    
    await reply.react('✅');
    await reply.react('❌');
    
    await QA.create({ question, answer, userId: message.author.id, username: message.author.username, feedback: 'none' });
    console.log(`✅ Answered: ${message.author.username}`);
  } catch (error) {
    console.error('Error:', error);
    await message.reply('❌ Something went wrong. Try again.');
  }
});

client.on('messageReactionAdd', async (reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) => {
  if (reaction.partial) await reaction.fetch();
  if (user.partial) await user.fetch();
  if (user.bot) return;
  if (reaction.message.author?.id !== client.user?.id) return;
  
  const emoji = reaction.emoji.name;
  if (emoji !== '✅' && emoji !== '❌') return;
  
  try {
    const feedback = emoji === '✅' ? 'positive' : 'negative';
    await QA.findOneAndUpdate(
      { userId: user.id, feedback: 'none' },
      { feedback },
      { sort: { timestamp: -1 } }
    );
    console.log(`📊 Feedback: ${feedback} from ${user.username}`);
    
    if (feedback === 'negative') {
      await reaction.message.reply(`Thanks for feedback, ${user.username}! We'll improve this.`);
    }
  } catch (error) {
    console.error('Reaction error:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
