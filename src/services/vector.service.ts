// src/services/vector.service.ts

import { Knowledge } from "../models/knowledge.model";

export class VectorService {

  // ----------------------------------------
  // Cosine Similarity
  // ----------------------------------------
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;

    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));

    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  // ----------------------------------------
  // UPSERT EMBEDDING (clean, correct)
  // ----------------------------------------
  async upsertEmbedding(
    id: string,
    content: string,
    embedding: number[],
    metadata: any
  ) {
    try {
      return await Knowledge.findOneAndUpdate(
        { id },                           // ✅ store by ID directly
        {
          id,
          content,
          embedding,
          metadata
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("❌ VectorService.upsertEmbedding ERROR:", err);
      throw err;
    }
  }

  // ----------------------------------------
  // FIND SIMILAR DOCS (RAG retrieval)
  // ----------------------------------------
  async findSimilar(queryEmbedding: number[], topK = 7, min = 0.20) {
    const allDocs = await Knowledge.find().lean();

    // Filter out empty embeddings
    const validDocs = allDocs.filter(
      (d: any) => Array.isArray(d.embedding) && d.embedding.length > 0
    );

    // Score each doc
    const scored = validDocs.map((doc: any) => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    // Sort + filter by threshold
    return scored
      .filter((x: any) => x.score >= min)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, topK);
  }
}
