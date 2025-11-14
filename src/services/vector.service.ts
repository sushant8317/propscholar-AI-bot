// src/services/vector.service.ts

import { Knowledge } from "../models/knowledge.model";

export class VectorService {

  // -----------------------------
  // Cosine Similarity
  // -----------------------------
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;

    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));

    return magA === 0 || magB === 0 ? 0 : dot / (magA * magB);
  }

  // -----------------------------
  // UPSERT EMBEDDING
  // (Correct 4-argument version)
  // -----------------------------
  async upsertEmbedding(
    id: string,
    content: string,
    embedding: number[],
    metadata: any
  ) {
    try {
      return await Knowledge.findOneAndUpdate(
        { "metadata.sourceId": id },
        {
          content,
          embedding,
          metadata: {
            ...metadata,
            sourceId: id
          }
        },
        {
          upsert: true,
          new: true
        }
      );
    } catch (err) {
      console.error("❌ VectorService.upsertEmbedding ERROR:", err);
      throw err;
    }
  }

  // -----------------------------
  // Find Similar Documents
  // -----------------------------
  async findSimilar(queryEmbedding: number[], topK = 5, min = 0.55) {
    const all = await Knowledge.find().lean();

    const scored = all.map((doc: any) => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    return scored
      .filter((x: any) => x.score >= min)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, topK);
  }
}
