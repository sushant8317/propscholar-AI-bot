// src/services/embedding.service.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-large";

/**
 * Get embedding for single piece of text.
 * NOW WITH VALIDATION - throws errors instead of returning empty arrays
 */
export async function EmbedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot embed empty text");
  }

  const input = text.length > 20000 ? text.slice(0, 20000) : text;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input,
      });

      const embedding = res.data?.[0]?.embedding as number[];

      // CRITICAL: Validate embedding before returning
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("OpenAI returned empty embedding");
      }

      return embedding;
    } catch (err: any) {
      console.error(`EmbedText attempt ${attempt + 1} failed:`, err?.message);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
  }

  throw new Error("Failed to create embedding after 3 attempts - OpenAI API issue");
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

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: chunk,
        });

        const embeddings = res.data.map((d: any) => {
          const emb = d.embedding || [];
          // Validate each embedding
          if (!Array.isArray(emb) || emb.length === 0) {
            throw new Error("One of the embeddings is empty");
          }
          return emb;
        });

        out.push(...embeddings);
        break;
      } catch (err: any) {
        console.error(`EmbedBatch error attempt ${attempt + 1}:`, err?.message);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        } else {
          throw err; // Fail hard instead of silently pushing empty embeddings
        }
      }
    }
  }

  return out;
}
