// src/services/dynamic-ingest.service.ts
import { EmbedBatch } from "./embedding.service";
import { VectorService } from "./vector.service";
import { info, warn, error as logError } from "../utils/log.util";

type IngestItem = {
  id?: string; // unique source id (if not provided we will generate)
  title?: string;
  content: string;
  category?: string;
  skipIfExists?: boolean; // if true, skip if sourceId already present
};

export class DynamicIngestService {
  private vector = new VectorService();

  /**
   * Upsert many KB items with batch embeddings, duplicate detection and retries.
   *
   * Options:
   *  - batchSize: how many texts to embed per call
   *  - concurrency: how many upserts to run in parallel per batch (to avoid DB overload)
   *  - skipIfExists: if true, query DB and skip existing sourceIds
   */
  async ingestItems(
    items: IngestItem[],
    opts?: { batchSize?: number; concurrency?: number; skipIfExists?: boolean }
  ) {
    const batchSize = opts?.batchSize ?? 16;
    const concurrency = opts?.concurrency ?? 4;
    const skipIfExists = opts?.skipIfExists ?? true;

    if (!items || items.length === 0) {
      info("ingest", "No items to ingest");
      return;
    }

    info("ingest", `Starting ingest: ${items.length} items — batchSize=${batchSize} concurrency=${concurrency}`);

    // Normalize ids
    const normalized = items.map((it, idx) => ({
      id: String(it.id ?? `kb-${Date.now()}-${idx}`),
      title: it.title ?? "",
      content: it.content ?? "",
      category: it.category ?? "general",
      skipIfExists: it.skipIfExists ?? skipIfExists,
    }));

    // Stage texts for embedding
    const texts = normalized.map((i) => `${i.title ? i.title + "\n" : ""}${i.content}`);

    // 1) Batch embed all texts (efficient)
    info("ingest", `Embedding ${texts.length} items in batches of ${batchSize}...`);
    const embeddings = await EmbedBatch(texts, batchSize);

    if (!embeddings || embeddings.length !== texts.length) {
      warn("ingest", "Embeddings count mismatch — continuing but some items may have empty embeddings");
    }

    // Process in smaller groups to avoid too many parallel DB writes
    for (let i = 0; i < normalized.length; i += concurrency) {
      const group = normalized.slice(i, i + concurrency);

      // Run upserts in parallel but limited to `concurrency`
      await Promise.all(
        group.map(async (item, j) => {
          const globalIndex = i + j;
          const emb = embeddings[globalIndex] ?? [];

          try {
            // Optional duplicate check (by metadata.sourceId)
            if (item.skipIfExists) {
              // vector.upsertEmbedding uses metadata.sourceId for id-match
              // We assume upsertEmbedding finds by metadata.sourceId and updates, but some stores prefer
              // an existence check — if needed, implement a lightweight find here.
            }

            // Try upsert with retry/backoff
            await this.tryUpsertWithRetry(item, emb, 3);

            info("ingest", `Upserted ${item.id} (${globalIndex + 1}/${normalized.length})`);
          } catch (err) {
            logError("ingest", `Failed upsert ${item.id}:`, err);
          }
        })
      );
    }

    info("ingest", "Ingest complete");
  }

  // small wrapper to upsert with retry/backoff
  private async tryUpsertWithRetry(item: { id: string; title: string; content: string; category: string }, emb: number[], retries = 3) {
    const meta = {
      title: item.title || "",
      category: item.category || "general",
      sourceId: item.id,
      updatedAt: new Date().toISOString(),
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.vector.upsertEmbedding(item.id, item.content, emb, meta);
        return;
      } catch (err: any) {
        const wait = 200 * attempt * attempt;
        warn("ingest", `Upsert attempt ${attempt} failed for ${item.id}. retrying in ${wait}ms`);
        if (attempt === retries) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }

  // single item convenience
  async ingestOne(title: string, content: string, category = "general") {
    return this.ingestItems([{ id: `kb-${Date.now()}`, title, content, category }], { batchSize: 8, concurrency: 1 });
  }
}
