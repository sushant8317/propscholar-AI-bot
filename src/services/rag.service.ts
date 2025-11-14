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
      const queryEmbedding = await this.embeddingService.createEmbedding(query);
      const similarDocs = await this.vectorService.findSimilar(queryEmbedding, topK, 0.6);
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
      const context = await this.getRelevantContext(userQuery);
      const contextString = context
        .map((item, i) => `[Context ${i + 1} - Score: ${item.score.toFixed(2)}]\n${item.content}\n`)
        .join('\n');
      
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
${conversationHistory.length > 0
  ? `CONVERSATION HISTORY:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n`
  : ''}
Now answer the user's question:`;

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
