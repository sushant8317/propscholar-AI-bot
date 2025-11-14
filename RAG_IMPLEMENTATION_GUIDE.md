# 🚀 RAG Implementation Guide for PropScholar Discord Bot

## ✅ Files Already Created
- `src/services/embedding.service.ts` ✓
- `src/services/vector.service.ts` ✓

## 📁 Remaining Files to Create

### 1. Create `src/models/knowledge.model.ts`

```typescript
import mongoose from 'mongoose';

const KnowledgeSchema = new mongoose.Schema({
  content: { type: String, required: true },
  embedding: { type: [Number], required: true },
  metadata: {
    category: String,
    source: String,
    keywords: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

// Index for better performance
KnowledgeSchema.index({ 'metadata.category': 1 });
KnowledgeSchema.index({ createdAt: -1 });

export const Knowledge = mongoose.model('Knowledge', KnowledgeSchema);
```

### 2. Create `src/services/rag.service.ts`

```typescript
import { EmbeddingService } from './embedding.service';
import { VectorService } from './vector.service';
import axios from 'axios';

export class RAGService {
  private embeddingService: EmbeddingService;
  private vectorService: VectorService;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorService = new VectorService();
  }

  async getRelevantContext(query: string, topK: number = 3) {
    try {
      // 1. Create embedding for user query
      const queryEmbedding = await this.embeddingService.createEmbedding(query);

      // 2. Find similar content from vector store
      const similarDocs = await this.vectorService.findSimilar(queryEmbedding, topK, 0.6);

      // 3. Format context
      return similarDocs.map((doc: any) => ({
        content: doc.content,
        score: doc.score,
        metadata: doc.metadata
      }));
    } catch (error) {
      console.error('Error getting relevant context:', error);
      return [];
    }
  }

  async generateResponse(userQuery: string, conversationHistory: any[] = []) {
    try {
      // Get relevant context
      const context = await this.getRelevantContext(userQuery);

      // Build context string
      const contextString = context
        .map((item, i) => `[Context ${i + 1} - Score: ${item.score.toFixed(2)}]\n${item.content}\n`)
        .join('\n');

      // Create enhanced prompt
      const systemPrompt = `You are PropScholar's expert AI assistant specializing in prop trading and trading education.

RELEVANT KNOWLEDGE BASE:
${contextString || 'No specific context found. Use general knowledge.'}

INSTRUCTIONS:
- Answer based on the provided context above
- Be specific and cite information when possible
- If context doesn't fully answer the question, say so and provide general guidance
- Always maintain a professional, helpful tone
- Provide actionable advice when appropriate
- Keep answers concise but thorough

${conversationHistory.length > 0 ? `CONVERSATION HISTORY:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n` : ''}

Now answer the user's question:`;

      // Call Groq API
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        answer: response.data.choices[0].message.content,
        sources: context.map(c => c.metadata),
        confidence: context.length > 0 ? context[0].score : 0
      };
    } catch (error) {
      console.error('RAG Error:', error);
      throw error;
    }
  }
}
```

### 3. Create `src/scripts/ingest-data.ts`

```typescript
import mongoose from 'mongoose';
import { propScholarData } from '../data/propscholar-data';
import { EmbeddingService } from '../services/embedding.service';
import { VectorService } from '../services/vector.service';
import dotenv from 'dotenv';

dotenv.config();

async function ingestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');
    
    const embeddingService = new EmbeddingService();
    const vectorService = new VectorService();

    console.log('Starting data ingestion...');

    // Extract all Q&A pairs from your data
    const dataItems: Array<{content: string, metadata: any}> = [];
    
    // Flatten your propScholarData structure
    for (const [category, items] of Object.entries(propScholarData)) {
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          // Combine question and answer for better context
          const content = `Q: ${item.question}\nA: ${item.answer}`;
          dataItems.push({
            content,
            metadata: {
              category,
              question: item.question,
              keywords: item.keywords || []
            }
          });
        });
      }
    }

    console.log(`Found ${dataItems.length} items to process`);

    // Process in batches of 20 to avoid rate limits
    const batchSize = 20;
    let processed = 0;
    
    for (let i = 0; i < dataItems.length; i += batchSize) {
      const batch = dataItems.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(dataItems.length/batchSize)}...`);

      // Create embeddings for batch
      const texts = batch.map(item => item.content);
      const embeddings = await embeddingService.createBatchEmbeddings(texts);

      // Store in database
      for (let j = 0; j < batch.length; j++) {
        await vectorService.storeEmbedding(
          batch[j].content,
          embeddings[j],
          batch[j].metadata
        );
        processed++;
        console.log(`  Processed ${processed}/${dataItems.length}`);
      }

      // Wait a bit to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Data ingestion complete!');
  } catch (error) {
    console.error('Error during ingestion:', error);
  } finally {
    await mongoose.disconnect();
  }
}

ingestData();
```

### 4. Update `src/index.ts` (Add RAG Integration)

Add this at the top:
```typescript
import { RAGService } from './services/rag.service';

const ragService = new RAGService();
```

Replace your message handler with:
```typescript
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Ignore messages not mentioning the bot
  if (!message.mentions.has(client.user!.id) && message.channel.type !== 'DM') return;

  try {
    // Show typing indicator
    await message.channel.sendTyping();

    // Clean the query (remove bot mention)
    const query = message.content
      .replace(`<@${client.user!.id}>`, '')
      .replace(`<@!${client.user!.id}>`, '')
      .trim();

    // Use RAG to generate response
    const result = await ragService.generateResponse(query);
    
    // Send response with optional sources
    await message.reply({
      content: result.answer,
      embeds: result.sources.length > 0 ? [{
        title: '📚 Knowledge Sources',
        description: result.sources
          .map((s: any, i: number) => `${i + 1}. ${s.category || 'General'}`)
          .join('\n'),
        color: 0x5865F2,
        footer: {
          text: `Confidence: ${(result.confidence * 100).toFixed(0)}%`
        }
      }] : []
    });
  } catch (error) {
    console.error('Error processing message:', error);
    await message.reply(
      '❌ Sorry, I encountered an error processing your question. Please try again.'
    );
  }
});
```

## 📦 Package.json Updates

Add to dependencies:
```bash
npm install openai
```

Add this script:
```json
"scripts": {
  "ingest": "ts-node src/scripts/ingest-data.ts"
}
```

## 🔧 Environment Variables

Add to your `.env`:
```
OPENAI_API_KEY=your_openai_api_key_here
```

Get your OpenAI API key from: https://platform.openai.com/api-keys

## 🚀 Deployment Steps

### Step 1: Install Dependencies
```bash
npm install openai
```

### Step 2: Add OpenAI API Key
Add `OPENAI_API_KEY` to Render environment variables

### Step 3: Run Data Ingestion (ONE TIME)
After deployment, run:
```bash
npm run ingest
```

This will convert all your PropScholar data to embeddings and store in MongoDB.

### Step 4: Deploy
Commit and push all changes. Render will auto-deploy.

### Step 5: Test
Mention your bot in Discord with a question!

## 💡 How It Works

1. **User asks question** → Discord bot receives message
2. **Create embedding** → OpenAI converts question to vector
3. **Find similar content** → Search MongoDB for relevant Q&As
4. **Build context** → Top 3 most relevant answers
5. **Generate response** → Groq LLM creates answer using context
6. **Send to user** → Response with sources

## 🎯 Benefits

✅ **Semantic Understanding** - Finds answers even with different wording
✅ **No Hallucinations** - Only uses your actual data
✅ **Source Attribution** - Shows where information came from
✅ **Scalable** - Add more Q&As without code changes
✅ **Fast** - Vector search is incredibly efficient

## 📊 Cost Estimate

- **OpenAI Embeddings**: ~$0.0001 per 1K tokens
- **For 100 Q&As**: ~$0.01 one-time
- **Per query**: ~$0.0001
- **Monthly (1000 queries)**: ~$0.10

Extremely affordable!

## 🐛 Troubleshooting

### "Cannot find module 'openai'"
→ Run `npm install openai`

### "OPENAI_API_KEY is not defined"
→ Add it to Render environment variables

### "No embeddings found"
→ Run `npm run ingest` first

### "Rate limit exceeded"
→ Wait 1 minute, OpenAI has rate limits

## 🔄 Updating Your Data

1. Update `propscholar-data.ts`
2. Clear old embeddings: Delete documents in MongoDB
3. Run `npm run ingest` again
4. New data is now searchable!

## 📈 Next Steps

- Add conversation memory (store last 5 messages)
- Implement feedback system (👍👎 reactions)
- Add more data sources (blog posts, docs)
- Track popular questions
- A/B test different prompts

---

**Ready to deploy!** Follow the steps above and your bot will be 10x smarter! 🚀
