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

    const vector = new VectorService();
    console.log("🔥 Starting ingestion...");

    const contents = KNOWLEDGE_BASE.map(k => k.content);

    const embeddings = await EmbedBatch(contents);

    for (let i = 0; i < KNOWLEDGE_BASE.length; i++) {
      const item = KNOWLEDGE_BASE[i];
      const emb = embeddings[i];

      await vector.upsertEmbedding(
        item.id,
        item.content,
        emb,
        { source: "kb" }
      );

      console.log("✅ Saved:", item.id);
    }

    console.log("🎉 Ingestion complete.");
  } catch (err) {
    console.error("❌ Ingestion error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

ingestData();
