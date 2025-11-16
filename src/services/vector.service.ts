// src/services/vector.service.ts

import KnowledgeModel from "../models/knowledge.model"; // ✅ FIXED: default import

export class VectorService {

  // -------------------------------------------------
  // COSINE SIMILARITY
  // -------------------------------------------------
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length === 0 || b.length === 0) return 0;

    const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));

    return magA && magB ? dot / (magA * magB) : 0;
  }

  // -------------------------------------------------
  // UPSERT EMBEDDING — CLEAN & CORRECT
  // -------------------------------------------------
  async upsertEmbedding(
    id: string,
    content: string,
    embedding: number[],
    metadata: any
  ) {
    try {
      return await KnowledgeModel.findOneAndUpdate(
        { "metadata.sourceId": id },  // 🔥 MATCH by metadata.sourceId
        {
          content,
          embedding,
          metadata: {
            ...metadata,
            sourceId: id,
          }
        },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("❌ VectorService.upsertEmbedding ERROR:", err);
      throw err;
    }
  }

  // -------------------------------------------------
  // FIND SIMILAR DOCS — RAG
  // -------------------------------------------------
  async findSimilar(queryEmbedding: number[], topK = 7, minScore = 0.20) {
    const docs = await KnowledgeModel.find().lean();

    const valid = docs.filter(
      (d: any) => Array.isArray(d.embedding) && d.embedding.length > 0
    );

    const scored = valid.map((doc: any) => ({
      ...doc,
      score: this.cosineSimilarity(queryEmbedding, doc.embedding)
    }));

    return scored
      .filter((x) => x.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
