// src/services/dynamic-ingest.service.ts

import { KbEntry, IKbEntry } from '../models/kbEntry.model';
import {
  HELP_ARTICLES,
  fetchSitemap,
  fetchPageContent
} from '../data/propscholar-data';

import { EmbeddingService } from './embedding.service';
import { VectorService } from './vector.service';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Config
const BATCH_SIZE = Number(process.env.INGEST_BATCH_SIZE || 20);
const WAIT_MS_AFTER_BATCH = Number(process.env.INGEST_WAIT_MS || 1000);

interface DataItem {
  id: string;
  content: string;
  metadata: any;
}

export class DynamicIngestService {
  embeddingService: EmbeddingService;
  vectorService: VectorService;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorService = new VectorService();
  }

  // ---------------------------------------------------------
  // BUILD ITEMS TO INDEX
  // ---------------------------------------------------------
  async buildDataItems(): Promise<DataItem[]> {
    const items: DataItem[] = [];

    // -------------------------------------
    // 1. Manual KB from database
    // -------------------------------------
    const manualEntries = await KbEntry.find().lean().exec();
    manualEntries.forEach((m: IKbEntry) => {
      const id = `manual:${m._id.toString()}`;
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

    // -------------------------------------
    // 2. HELP_ARTICLES inside code
    // -------------------------------------
    HELP_ARTICLES.forEach((a: any, idx: number) => {
      const id = `help_article:${idx}:${(a.title || '').slice(0, 50)}`;
      const content = `Q: ${a.title}\nA: ${a.content}`;
      items.push({
        id,
        content,
        metadata: {
          source: 'help_articles',
          sourceId: id,
          title: a.title,
          category: a.category,
          url: a.url
        }
      });
    });

    // -------------------------------------
    // 3. Sitemap pages (live scraping)
    // -------------------------------------
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
    } catch (err) {
      console.warn('⚠️ Failed to fetch sitemap pages:', err);
    }

    return items;
  }

  // ---------------------------------------------------------
  // INGEST EVERYTHING → VECTOR DB
  // ---------------------------------------------------------
  async ingestAll() {
    const items = await this.buildDataItems();
    console.log(`[ingest] Found ${items.length} items to index`);

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      const texts = batch.map(b => b.content);

      // 1. Create embeddings for the batch
      const embeddings = await this.embeddingService.createBatchEmbeddings(texts);

      // 2. Store or Upsert each
      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const embedding = embeddings[j];

        // Use upsert if available to avoid duplicates
        if (typeof this.vectorService.upsertEmbedding === 'function') {
          await this.vectorService.upsertEmbedding(
            item.id,
            item.content,
            embedding,
            item.metadata
          );
        } else {
          // fallback (static mode)
          await this.vectorService.storeEmbedding(
            item.content,
            embedding,
            item.metadata
          );
        }
      }

      console.log(
        `[ingest] Processed ${
          Math.min(i + BATCH_SIZE, items.length)
        } / ${items.length}`
      );

      await new Promise(res => setTimeout(res, WAIT_MS_AFTER_BATCH));
    }

    console.log('[ingest] Ingestion complete!');
  }

  // ---------------------------------------------------------
  // PUBLIC trigger() FOR RENDER JOB
  // ---------------------------------------------------------
  async trigger() {
    try {
      // Ensure MongoDB connected
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI!);
      }

      await this.ingestAll();
    } catch (err) {
      console.error('🚨 Ingest failed:', err);
      throw err;
    }
  }
}

export default DynamicIngestService;
