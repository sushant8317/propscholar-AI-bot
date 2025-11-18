// src/services/embedding.service.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-large";

/**
 * Get embedding for single piece of text.
 */
export async function EmbedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) return [];

  // small trim to avoid huge text
  const input = text.length > 20000 ? text.slice(0, 20000) : text;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input,
      });

      return (res.data?.[0]?.embedding as number[]) || [];
    } catch (err: any) {
      console.error("EmbedText attempt", attempt + 1, "error:", err?.message || err);
      // exponential backoff
      await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }

  return [];
}

/**
 * Batch embed an array of texts.
 * Will attempt to embed in groups of size batchSize.
 */
export async function EmbedBatch(
  texts: string[],
  batchSize = 16
): Promise<Array<number[]>> {
  const out: Array<number[]> = [];
  if (!texts || texts.length === 0) return out;

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    // try robustly
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: chunk,
        });
        const embeddings = res.data.map((d: any) => d.embedding || []);
        out.push(...embeddings);
        break;
      } catch (err: any) {
        console.error("EmbedBatch error attempt", attempt + 1, err?.message || err);
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        if (attempt === 2) {
          // push empty embeddings for failed ones
          out.push(...chunk.map(() => []));
        }
      }
    }
  }

  return out;
}
