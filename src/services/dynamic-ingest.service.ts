// src/services/dynamic-ingest.service.ts

import { KbEntry } from '../models/kbEntry.model';
import { HELP_ARTICLES, fetchSitemap, fetchPageContent } from '../data/propscholar-data';
import { EmbeddingService } from './embedding.service';
import { VectorService } from './vector.service';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// CONFIG
const BATCH_SIZE = Number(process.env.INGEST_BATCH_SIZE || 20);
const WAIT_MS_AFTER_BATCH = Number(process.env.INGEST_WAIT_MS || 1000);

export class DynamicIngestService {
  embeddingService: EmbeddingService;
  vectorService: VectorService;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorService = new VectorService();
  }

  // Build ALL KB data (manual DB + help articles + sitemap)
  async buildDataItems(): Promise<Array<{ id: string; content: string; metadata: any }>> {
    const items: Array<{ id: string; content: string; metadata: any }> = [];

    // ============================================
    // 1) MANUAL KB ENTRIES (DB)
    // ============================================
    const manualEntries = await KbEntry.find().lean().exec();

    manualEntries.forEach((m: any) => {
      const id = `manual:${String(m._id)}`;
      const content = `Q: ${m.title}\nA: ${m.content}`;

      items.push({
        id,
        content,
        metadata: {
          source: 'manual',
          sourceId: id,
          title: m.title,
          category: m.category,
          url: m.url
        }
      });
    });

    // ============================================
    // 2) HELP_ARTICLES (from propscholar-data.ts)
    // ============================================
    (HELP_ARTICLES || []).forEach((a: any, idx: number) => {
      const id = `help_article:${idx}:${(a.title || '').slice(0, 50)}`;
      const content = `Q: ${a.title}\nA: ${a.content}`;

      items.push({
        id,
        content,
        metadata: {
          source: 'help_articles',
          sourceId: id,
          title: a.title,
          url: a.url,
          category: a.category
        }
      });
    });

    // ============================================
    // 3) WEBSITE SITEMAP PAGES
    // ============================================
    try {
      const urls = await fetchSitemap();

      for (const url of urls) {
        const page = await fetchPageContent(url);
        if (!page) continue;

        const id = `page:${Buffer.from(url).toString('base64').slice(0, 32)}`;
        const content = `PageTitle: ${page.title}\n\n${page.content}`;

        items.push({
          id,
          content,
          metadata: {
            source: 'sitemap',
            sourceId: id,
            title: page.title,
            url: page.url
          }
        });
      }
    } catch (e) {
      console.warn('⚠️ Sitemap fetch failed:', e);
    }

    return items;
  }

  // ============================================
  // INGEST EVERYTHING INTO VECTOR DB (UPSERT)
  // ============================================
  async ingestAll() {
    const items = await this.buildDataItems();

    console.log(`[ingest] Total items to index: ${items.length}`);

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const texts = batch.map(b => b.content);

      // Create embeddings for batch
      const embeddings = await this.embeddingService.createBatchEmbeddings(texts);

      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = embeddings[j];

        // Use upsert if exists
        if (typeof this.vectorService.upsertEmbedding === 'function') {
          await this.vectorService.upsertEmbedding(
            item.id,
            item.content,
            embedding,
            item.metadata
          );
        } else {
          // fallback — creates duplicates
          await this.vectorService.storeEmbedding(
            item.content,
            embedding,
            item.metadata
          );
        }
      }

      console.log(`[ingest] Indexed ${Math.min(i + BATCH_SIZE, items.length)} / ${items.length}`);
      await new Promise(resolve => setTimeout(resolve, WAIT_MS_AFTER_BATCH));
    }

    console.log('[ingest] COMPLETE');
  }

  // Trigger ingest on demand
  async trigger() {
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI!);
      }

      await this.ingestAll();
    } catch (err) {
      console.error('❌ Ingest failed:', err);
      throw err;
    }
  }
}

export default DynamicIngestService;
