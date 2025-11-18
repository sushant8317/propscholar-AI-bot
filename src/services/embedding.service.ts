// src/services/embedding.service.ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function EmbedText(text: string): Promise<number[]> {
  if (!text) return [];

  try {
    const res = await client.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });

    return res.data[0].embedding || [];
  } catch (e: unknown) {
    const err = e as Error;
    console.error("❌ Embedding ERROR (first attempt):", err.message);

    // Retry once
    try {
      const res2 = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: text,
      });

      return res2.data[0].embedding || [];
    } catch (e2: unknown) {
      const err2 = e2 as Error;
      console.error("❌ Embedding ERROR (second attempt):", err2.message);
      return [];
    }
  }
}
