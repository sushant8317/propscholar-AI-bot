// src/services/vector.service.ts
import { KnowledgeModel } from "../models/knowledge.model";

/**
 * Lightweight vector utilities — cosine similarity and DB helpers.
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
   * Brute-force search over KnowledgeModel embeddings.
   * Requires that KnowledgeModel documents have `embedding: number[]`.
   */
  async findSimilar(queryEmbedding: number[], topK = 7, minScore = 0.2) {
    const docs = await KnowledgeModel.find().lean().exec();
    const valid = docs.filter((d: any) => Array.isArray(d.embedding) && d.embedding.length > 0);

    const scored = valid.map((doc: any) => {
      const score = this.cosineSimilarity(queryEmbedding, doc.embedding);
      return { ...doc, score };
    });

    return scored
      .filter((s: any) => s.score >= minScore)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, topK);
  }
}
