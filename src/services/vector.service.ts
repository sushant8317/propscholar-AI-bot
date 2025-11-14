// src/services/vector.service.ts

import { Knowledge } from '../models/knowledge.model';

export class VectorService {

  // ----------------------------------------
  // COSINE SIMILARITY
  // ----------------------------------------
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;

    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));

    if (magA === 0 || magB === 0) return 0;

    return dot / (magA * magB);
  }

  // ----------------------------------------
  // BASIC STORE (USED ONLY AS FALLBACK)
  // ----------------------------------------
  async storeEmbedding(content: string, embedding: number[], metadata: any = {}) {
    try {
      return await Knowledge.create({
        content,
        embedding,
        metadata
      });
    } catch (err) {
      console.error("VectorService.storeEmbedding ERROR:", err);
      throw err;
    }
  }

  // ----------------------------------------
  // UPSERT EMBEDDING (USED BY DYNAMIC INGEST)
  // ----------------------------------------
  async upsertEmbedding(
    id: string,
    content: string,
    embedding: number[],
    metadata: any = {}
  ) {
    try {
      // Ensure sourceId appears inside metadata
      metadata = {
        ...metadata,
        sourceId: id
      };

      return await Knowledge.findOneAndUpdate(
        { 'metadata.sourceId': id },   // match based on unique sourceId
        {
          content,
          embedding,
          metadata
        },
        {
          upsert: true,                // create if missing
          new: true                    // return updated doc
        }
      );
    } catch (err) {
      console.error("VectorService.upsertEmbedding ERROR:", err);
      throw err;
    }
  }

  // ----------------------------------------
  // FIND SIMILAR DOCUMENTS
  // ----------------------------------------
  async findSimilar(queryEmbedding: number[], topK = 5, minScore = 0.7) {
    try {
      const all = await Knowledge.find().lean();

      const scored = all.map((item: any) => ({
        ...item,
        score: this.cosineSimilarity(queryEmbedding, item.embedding)
      }));

      return scored
        .filter(i => i.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    } catch (err) {
      console.error("VectorService.findSimilar ERROR:", err);
      throw err;
    }
  }
}
