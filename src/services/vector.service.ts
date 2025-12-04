// src/services/vector.service.ts
import { KnowledgeModel } from "../models/knowledge.model";

/**
 * Lightweight vector utilities — cosine similarity and DB helpers.
 * NOW WITH KB VALIDATION AND BETTER LOGGING
 */
export class VectorService {
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0)
      return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;

    return dot / (magA * magB);
  }

  /**
   * Upsert a document by sourceId in metadata.
   * id is your source/unique id; content is the raw text.
   */
  async upsertEmbedding(
    id: string,
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {}
  ) {
    try {
      // VALIDATION: ensure embedding is not empty
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Cannot upsert with empty embedding");
      }

      const meta = {
        ...metadata,
        sourceId: id,
        updatedAt: new Date(),
      };

      const update = {
        content,
        embedding,
        metadata: meta,
      };

      return await KnowledgeModel.findOneAndUpdate(
        { "metadata.sourceId": id },
        update,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("VectorService.upsertEmbedding error:", err);
      throw err;
    }
  }

  /**
   * CRITICAL FIX: Brute-force search with validation and logging
   * Only searches documents that have valid embeddings
   */
  async findSimilar(queryEmbedding: number[], topK = 7, minScore = 0.2) {
    // VALIDATION: Check query embedding
    if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      console.error("❌ CRITICAL: Empty query embedding - KB cannot be searched!");
      return [];
    }

    try {
      // Only fetch documents that have embeddings
      const docs = await KnowledgeModel.find(
        {
          embedding: { $exists: true, $type: "array", $ne: [] },
        },
        { embedding: 1, content: 1, metadata: 1 }
      )
        .lean()
        .exec();

      if (docs.length === 0) {
        console.error(
          "❌ NO KB DOCUMENTS WITH EMBEDDINGS FOUND - Admin panel KB is empty or embeddings failed"
        );
        return [];
      }

      // Score all documents
      const scored = docs.map((doc: any) => {
        const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
        return { ...doc, score };
      });

      // Filter and sort
      const results = scored
        .filter((s: any) => s.score >= minScore)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, topK);

      // LOG FOR DEBUGGING
      console.log(
        `✅ KB Search: Queried ${docs.length} docs, found ${results.length} matches (minScore: ${minScore}, topK: ${topK})`
      );

      if (results.length === 0) {
        console.warn(
          `⚠️ Query matched 0 docs. Try lowering minScore or check KB content.`
        );
      }

      return results;
    } catch (err) {
      console.error("VectorService.findSimilar error:", err);
      return [];
    }
  }
}
