// src/services/embedding.service.ts
import axios from "axios";

/**
 * Create embedding for one text
 */
export async function EmbedText(text: string): Promise<number[]> {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/embeddings",
      {
        model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        input: text
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.data[0].embedding;
  } catch (err: any) {
    console.error("❌ EmbedText Error:", err.response?.data || err.message);
    return [];
  }
}

/**
 * Embedding for many texts
 */
export async function EmbedBatch(texts: string[]): Promise<number[][]> {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/embeddings",
      {
        model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        input: texts
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.data.map((i: any) => i.embedding);
  } catch (err: any) {
    console.error("❌ Batch Embedding Error:", err.response?.data || err.message);
    return texts.map(() => []);
  }
}
