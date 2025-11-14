// src/services/dynamic-ingest.service.ts
import { KbEntry } from '../models/kbEntry.model';
import { HELP_ARTICLES, fetchSitemap, fetchPageContent } from '../data/propscholar-data';
import { EmbeddingService } from './embedding.service';
import { VectorService } from './vector.service';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// config
const BATCH_SIZE = Number(process.env.INGEST_BATCH_SIZE || 20);
const WAIT_MS_AFTER_BATCH = Number(process.env.INGEST_WAIT_MS || 1000);

export class DynamicIngestService {
  embeddingService: EmbeddingService;
  vectorService: VectorService;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorService = new VectorService();
  }

  // Build all items to index: HELP_ARTICLES (already in code), pages from sitemap, and manual DB KB
  async buildDataItems(): Promise<Array<{ id: string; content: string; metadata: any }>> {
    const items: Array<{ id: string; content: string; metadata: any }> = [];

    // 1) Manual KB from DB
    const manual = await KbEntry.find().lean().exec();
    manual.forEach(m => {
      const id = `manual:${m._id.toString()}`;
      const content = `Q: ${m.title}\nA: ${m.content}`;
      items.push({
        id,
        content,
        metadata: { source: 'manual', sourceId: id, title: m.title, category: m.category, url: m.url }
      });
    });

    // 2) In-code HELP_ARTICLES (propscholar-data.ts)
    (HELP_ARTICLES || []).forEach((a: any, idx: number) => {
      const id = `help_article:${idx}:${(a.title || '').slice(0,50)}`;
      const content = `Q: ${a.title}\nA: ${a.content}`;
      items.push({
        id,
        content,
        metadata: { source: 'help_articles', sourceId: id, title: a.title, url: a.url, category: a.category }
      });
    });

    // 3) Sitemap pages (fetch & grab short content)
    try {
      const urls = await fetchSitemap();
      for (const url of urls) {
        const page = await fetchPageContent(url);
        if (!page) continue;
        const id = `page:${Buffer.from(url).toString('base64').slice(0,32)}`;
        const content = `PageTitle: ${page.title}\n\n${page.content}`;
        items.push({
          id,
          content,
          metadata: { source: 'sitemap', sourceId: id, title: page.title, url: page.url }
        });
      }
    } catch (err) {
      console.warn('Sitemap/pages fetch failed', err);
    }

    return items;
  }

  // Upsert logic: use metadata.sourceId as unique key
  async ingestAll() {
    const items = await this.buildDataItems();
    console.log(`[ingest] Found ${items.length} items to (re)index`);

    // process in batches to avoid rate limits
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const texts = batch.map(b => b.content);

      // create embeddings
      const embeddings = await this.embeddingService.createBatchEmbeddings(texts);

      // store/upsert embeddings in vector DB
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = embeddings[j];

        // Attempt to upsert by sourceId (your VectorService should accept metadata.sourceId)
        if (typeof this.vectorService.upsertEmbedding === 'function') {
          await this.vectorService.upsertEmbedding(item.id, item.content, embedding, item.metadata);
        } else {
          // fallback to storeEmbedding (may create duplicates if you ran multiple times)
          await this.vectorService.storeEmbedding(item.content, embedding, item.metadata);
        }
      }

      console.log(`[ingest] processed ${Math.min(i + BATCH_SIZE, items.length)} / ${items.length}`);
      await new Promise(r => setTimeout(r, WAIT_MS_AFTER_BATCH));
    }

    console.log('[ingest] done');
  }

  // One-shot trigger
  async trigger() {
    try {
      // ensure mongo connected (if not connected)
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI!);
      }
      await this.ingestAll();
      // optionally disconnect if you want
    } catch (err) {
      console.error('Ingest failed:', err);
      throw err;
    }
  }
}

export default DynamicIngestService;
