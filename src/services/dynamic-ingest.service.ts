// src/services/dynamic-ingest.service.ts

import { EmbedText } from "./embedding.service";
import { VectorService } from "./vector.service";

export class DynamicIngestService {
  private vector = new VectorService();

  /**
   * Ingest a batch of KB items
   */
  async ingestItems(
    items: Array<{ id?: string; title: string; content: string; category?: string }>
  ) {
    for (const item of items) {
      console.log("📥 Ingesting:", item.title);

      // 1) Generate embedding
      const embedding = await EmbedText(item.content);

      // 2) Upsert into database + vector DB
      const upserted: any = await this.vector.upsertEmbedding(
        item.id || item.title, // unique identifier
        `${item.title}\n\n${item.content}`,
        embedding,
        {
          category: item.category || "general",
          title: item.title,
        }
      );

      // 3) Log stored item (TS-safe)
      console.log("✔ Stored:", upserted?.metadata?.title || item.title);
    }

    console.log("🎉 Dynamic ingest complete.");
  }

  /**
   * Ingest a single item
   */
  async ingestOne(title: string, content: string, category: string = "general") {
    return this.ingestItems([{ title, content, category }]);
  }
}
