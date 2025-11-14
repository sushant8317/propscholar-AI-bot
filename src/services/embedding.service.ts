// src/services/embedding.service.ts
import OpenAI from "openai";

export default class EmbeddingService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("❌ OPENAI_API_KEY missing in .env");

    this.client = new OpenAI({ apiKey });
  }

  // Create ONE embedding
  async embed(text: string): Promise<number[]> {
    try {
      const res = await this.client.embeddings.create({
        model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        input: text
      });

      return res.data[0].embedding;
    } catch (error) {
      console.error("❌ Embedding error:", error);
      return [];
    }
  }

  // Create MANY embeddings (batch)
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const res = await this.client.embeddings.create({
        model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        input: texts
      });

      return res.data.map((d: any) => d.embedding);
    } catch (error) {
      console.error("❌ Batch Embedding error:", error);
      return texts.map(() => []);
    }
  }
}
