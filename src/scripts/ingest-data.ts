// src/scripts/ingest-data.ts
import mongoose from "mongoose";
import dotenv from "dotenv";
import { DynamicIngestService } from "../services/dynamic-ingest.service";
import { info, error as logError } from "../utils/log.util";
dotenv.config();

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI not set in env");

  info("ingest-script", "Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  info("ingest-script", "✅ MongoDB Connected");

  const items = loadKBItems(); // <-- replace with your loader

  info("ingest-script", `Starting ingestion — total items: ${items.length}`);

  const ingestor = new DynamicIngestService();

  try {
    // tune batchSize and concurrency depending on quotas
    await ingestor.ingestItems(items, { batchSize: 8, concurrency: 4, skipIfExists: true });
    info("ingest-script", "✅ Ingestion finished successfully");
  } catch (err) {
    logError("ingest-script", "❌ Ingestion error:", err);
  } finally {
    await mongoose.disconnect();
    info("ingest-script", "MongoDB Disconnected");
    process.exit(0);
  }
}

/**
 * Example loader: replace or extend
 * You can load from JSON, CSV, database, or remote sources.
 */
function loadKBItems() {
  // EXAMPLE: simple hard-coded items (replace with your real KB)
  const items = [
    {
      id: "rule-daily-dd",
      title: "Daily Drawdown Rule",
      content: "The daily drawdown resets at 00:00 IST. The limit is X% of starting equity.",
      category: "rules",
      skipIfExists: true,
    },
    {
      id: "rule-max-loss",
      title: "Maximum Loss",
      content: "Maximum loss is a percentage of the initial account size. For example, 10% for a $100k account.",
      category: "rules",
      skipIfExists: true,
    },
    // add your KB items here or implement a JSON/CSV loader
  ];

  // show total
  return items;
}

run().catch((e) => {
  logError("ingest-script", "Fatal ingest error:", e);
  process.exit(1);
});
