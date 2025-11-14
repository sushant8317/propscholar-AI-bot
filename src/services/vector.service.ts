import { Knowledge } from '../models/knowledge.model';

export class VectorService {

  // ===============================
  // COSINE SIMILARITY
  // ===============================
  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
    return dot / (magA * magB);
  }

  // ===============================
  // FIND SIMILAR DOCUMENTS
  // ===============================
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

  // ===============================
  // INSERT NEW EMBEDDING
  // ===============================
  async storeEmbedding(content: string, embedding: number[], metadata: any) {
    try {
      const doc = new Knowledge({
        content,
        embedding,
        metadata
      });
      return await doc.save();
    } catch (err) {
      console.error("VectorService.storeEmbedding ERROR:", err);
      throw err;
    }
  }

  // ===============================
  // UPSERT EMBEDDING (dynamic ingest)
  // Creates if not exists, updates if already exists
  // ===============================
  async upsertEmbedding(id: string, embedding: number[], metadata: any = {}) {
    try {
      return await Knowledge.updateOne(
        { _id: id },
        {
          $set: {
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
}
