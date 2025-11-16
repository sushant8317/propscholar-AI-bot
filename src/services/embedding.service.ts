// src/services/embedding.service.ts

import axios from "axios";

const OPENAI_URL = "https://api.openai.com/v1/embeddings";
const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

// ----------------------------------------
// Create embedding for one text
// ----------------------------------------
export async function EmbedText(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY");
    return [];
  }

  if (!text || text.trim().length === 0) return [];

  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: MODEL,
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data[0].embedding || [];
  } catch (err: any) {
    console.error("❌ EmbedText Error:", err.response?.data || err.message);
    return [];
  }
}

// ----------------------------------------
// Create embeddings for multiple texts
// ----------------------------------------
export async function EmbedBatch(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Missing OPENAI_API_KEY");
    return texts.map(() => []);
  }

  try {
    const response = await axios.post(
      OPENAI_URL,
      {
        model: MODEL,
        input: texts,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data.map((i: any) => i.embedding || []);
  } catch (err: any) {
    console.error("❌ Batch Embedding Error:", err.response?.data || err.message);
    return texts.map(() => []);
  }
}
