import { Knowledge } from '../models/knowledge.model';

export class VectorService {
  // Cosine similarity function
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async findSimilar(
    queryEmbedding: number[],
    topK: number = 5,
    minScore: number = 0.7
  ) {
    try {
      // Get all knowledge items
      const allKnowledge = await Knowledge.find().lean();
      
      // Calculate similarity scores
      const scored = allKnowledge.map((item: any) => ({
        ...item,
        score: this.cosineSimilarity(queryEmbedding, item.embedding)
      }));

      // Sort by score and filter by minimum score
      return scored
        .filter(item => item.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      console.error('Error finding similar documents:', error);
      throw error;
    }
  }

  async storeEmbedding(content: string, embedding: number[], metadata: any) {
    try {
      const knowledge = new Knowledge({
        content,
        embedding,
        metadata
      });
      return await knowledge.save();
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw error;
    }
  }
}
