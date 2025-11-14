import { KbEntry } from '../models/kbEntry.model';
import { HELP_ARTICLES, fetchSitemap, fetchPageContent } from '../data/propscholar-data';
import { EmbedBatch } from './embedding.service';
import { VectorService } from './vector.service';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const BATCH_SIZE = Number(process.env.INGEST_BATCH_SIZE || 20);
const WAIT_MS_AFTER_BATCH = Number(process.env.INGEST_WAIT_MS || 1000);

export class DynamicIngestService {
  vectorService: VectorService;

  constructor() {
    this.vectorService = new VectorService();
  }

  async buildDataItems() {
    const items: any[] = [];

    const manualEntries = await KbEntry.find().lean();
    manualEntries.forEach((m: any) => {
      const id = `manual:${String(m._id)}`;
      const content = `Q: ${m.title}\nA: ${m.content}`;

      items.push({
        id,
        content,
        metadata: {
          source: "manual",
          sourceId: id,
          title: m.title,
          category: m.category,
          url: m.url
        }
      });
    });

    HELP_ARTICLES.forEach((a: any, idx: number) => {
      const id = `help:${idx}`;
      const content = `Q: ${a.title}\nA: ${a.content}`;

      items.push({
        id,
        content,
        metadata: {
          source: "help_articles",
          sourceId: id,
          title: a.title,
          category: a.category
        }
      });
    });

    try {
      const urls = await fetchSitemap();

      for (const url of urls) {
        const page = await fetchPageContent(url);
        if (!page) continue;

        const id = `page:${Buffer.from(url).toString("base64").slice(0, 32)}`;
        const content = `PageTitle: ${page.title}\n\n${page.content}`;

        items.push({
          id,
          content,
          metadata: {
            source: "sitemap",
            sourceId: id,
            title: page.title,
            url: page.url
          }
        });
      }
    } catch (e) {
      console.warn("⚠️ Sitemap fetch failed:", e);
    }

    return items;
  }

  async ingestAll() {
    const items = await this.buildDataItems();
    console.log(`[INGEST] Total items: ${items.length}`);

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const texts = batch.map(b => b.content);

      const embeddings = await EmbedBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        await this.vectorService.upsertEmbedding(
          batch[j].id,
          batch[j].content,
          embeddings[j],
          batch[j].metadata
        );
      }

      console.log(`[INGEST] Processed ${i + batch.length} / ${items.length}`);
      await new Promise(res => setTimeout(res, WAIT_MS_AFTER_BATCH));
    }

    console.log("✅ INGEST COMPLETE");
  }

  async trigger() {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI!);
      }
      await this.ingestAll();
    } catch (err) {
      console.error("❌ Ingest failed:", err);
    }
  }
}

export default DynamicIngestService;
