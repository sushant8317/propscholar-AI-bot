// src/scripts/ingest-data.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import { KNOWLEDGE_BASE } from "../data/kb";
import { EmbedBatch } from "../services/embedding.service";
import { VectorService } from "../services/vector.service";

dotenv.config();

async function ingestData() {
  try {
    console.log("📡 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("✅ MongoDB Connected");

    const vector = new VectorService();

    console.log("🔥 Starting ingestion...");
    console.log(`📚 Total KB items: ${KNOWLEDGE_BASE.length}`);

    const texts = KNOWLEDGE_BASE.map(k => k.content);
    const embeddings = await EmbedBatch(texts);

    for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
      const item = KNOWLEDGE_BASE[i];
      const embedding = embeddings[i];

      await vector.upsertEmbedding(
        item.id,
        item.content,
        embedding,
        { source: "kb" }
      );

      console.log(`✅ Saved embedding: ${item.id}`);
    }

    console.log("🎉 Ingestion successfully completed.");

  } catch (err) {
    console.error("❌ Ingestion error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB Disconnected");
  }
}

ingestData();
