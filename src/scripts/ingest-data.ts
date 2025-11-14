// src/scripts/ingest-data.ts

import mongoose from "mongoose";
import { getPropScholarData } from "../data/propscholar-data";
import { EmbedBatch } from "../services/embedding.service";
import { VectorService } from "../services/vector.service";
import dotenv from "dotenv";

dotenv.config();

async function ingestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    const vector = new VectorService();
    const dataset = getPropScholarData();
    const items: any[] = [];

    for (const [category, arr] of Object.entries(dataset)) {
      if (!Array.isArray(arr)) continue;

      arr.forEach((item: any) => {
        const content = `Q: ${item.question}\nA: ${item.answer}`;

        items.push({
          content,
          metadata: {
            category,
            question: item.question,
            keywords: item.keywords || []
          }
        });
      });
    }

    console.log(`Found ${items.length} items`);

    const BATCH = 20;

    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);
      const texts = batch.map(b => b.content);

      const embeddings = await EmbedBatch(texts);

for (let j = 0; j < batch.length; j++) {
await vector.upsertEmbedding(
  `ingest:${i}-${j}`,      // unique ID for each entry
  batch[j].content,        // text content
  embeddings[j],           // vector
  batch[j].metadata        // metadata
);

}


      console.log(`Processed ${i + batch.length} / ${items.length}`);
      await new Promise(res => setTimeout(res, 1000));
    }

    console.log("✅ Ingestion Complete");
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

ingestData();
