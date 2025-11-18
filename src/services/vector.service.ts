// src/services/vector.service.ts
import { KnowledgeModel } from "../models/knowledge.model";

export class VectorService {

  // -------------------------------------------------
  // Normalize a vector (important for consistent similarity)
  // -------------------------------------------------
  private normalize(vec: number[]): number[] {
    const mag = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0));
    return mag === 0 ? vec : vec.map((v) => v / mag);
  }

  // -------------------------------------------------
  // Cosine similarity (max-safe)
  // -------------------------------------------------
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    return dot;
  }

  // -------------------------------------------------
  // Store / Update embedding
  // -------------------------------------------------
  async upsertEmbedding(
    id: string,
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {}
  ) {
    try {
      const normalized = this.normalize(embedding);

      const query = { "metadata.sourceId": id };

      const update = {
        content,
        embedding: normalized,
        metadata: {
          ...metadata,
          sourceId: id,
        },
        updatedAt: new Date(),
      };

      const opts = { upsert: true, new: true, setDefaultsOnInsert: true };

      return await KnowledgeModel.findOneAndUpdate(query, update, opts);
    } catch (err) {
      console.error("❌ VectorService upsertEmbedding ERROR:", err);
      throw err;
    }
  }

  // -------------------------------------------------
  // Main RAG vector search
  // -------------------------------------------------
  async findSimilar(
    queryEmbedding: number[],
    topK = 7,
    minScore = 0.20,
    filters: any = {}
  ) {
    // Normalize query for more stable ranking
    const normalizedQuery = this.normalize(queryEmbedding);

    // Fetch docs
    const mongoFilter: any = { ...filters };
    mongoFilter["embedding.0"] = { $exists: true };

    const docs = await KnowledgeModel.find(mongoFilter)
      .select("content embedding metadata createdAt")
      .lean();

    if (!docs || docs.length === 0) return [];

    // Score docs
    const scored = docs.map((doc) => {
      const emb = doc.embedding || [];
      const sim = this.cosineSimilarity(normalizedQuery, emb);
      return { ...doc, score: sim };
    });

    // Filter + sort + top K
    const results = scored
      .filter((d) => d.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }

  // -------------------------------------------------
  // Optional: Bulk indexing for admin tools
  // -------------------------------------------------
  async bulkUpsert(items: any[]) {
    const ops = items.map((it) => ({
      updateOne: {
        filter: { "metadata.sourceId": it.id },
        update: {
          $set: {
            content: it.content,
            embedding: this.normalize(it.embedding),
            metadata: { ...it.metadata, sourceId: it.id },
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    return KnowledgeModel.bulkWrite(ops);
  }
}
