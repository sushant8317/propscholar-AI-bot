// src/services/vector.service.ts

import { Knowledge } from '../models/knowledge.model';

export class VectorService {
  // -----------------------------
  // COSINE SIMILARITY
  // -----------------------------
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;

    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (magA === 0 || magB === 0) return 0;

    return dot / (magA * magB);
  }

  // -----------------------------
  // STORE EMBEDDING (STATIC INGEST)
  // -----------------------------
  async storeEmbedding(content: string, embedding: number[], metadata: any = {}) {
    try {
      const knowledge = new Knowledge({
        content,
        embedding,
        metadata
      });

      return await knowledge.save();
    } catch (err) {
      console.error("VectorService.storeEmbedding ERROR:", err);
      throw err;
    }
  }

  // -----------------------------
  // UPSERT EMBEDDING (DYNAMIC INGEST)
  // -----------------------------
  async upsertEmbedding(
    id: string,
    content: string,
    embedding: number[],
    metadata: any = {}
  ) {
    try {
      return await Knowledge.updateOne(
        { _id: id },
        {
          $set: {
            content,
            embedding,
            metadata
          }
        },
        { upsert: true }
      );
    } catch (err) {
      console.error("VectorService.upsertEmbedding ERROR:", err);
      throw err;
    }
  }

  // -----------------------------
  // FIND SIMILAR EMBEDDINGS
  // -----------------------------
  async findSimilar(
    queryEmbedding: number[],
    topK: number = 5,
    minScore: number = 0.7
  ) {
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
