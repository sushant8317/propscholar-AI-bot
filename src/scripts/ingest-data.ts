// src/scripts/ingest-data.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
import { DynamicIngestService } from "../services/dynamic-ingest.service";

dotenv.config();

async function run() {
  console.log("📡 Connecting to MongoDB...");

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("✔ MongoDB connected");

  const ingestor = new DynamicIngestService();

  console.log("📥 Starting KB ingestion...");

  // Your KB items — replace/add more
  const items = [
    {
      title: "Daily Drawdown Rule",
      content: "Daily drawdown resets at 00:00 IST. Equity must not hit the limit.",
      category: "rules",
    },
    {
      title: "Maximum Loss Rule",
      content: "Account cannot go below the maximum loss from initial balance.",
      category: "rules",
    }
  ];

  await ingestor.ingestItems(items);

  console.log("🎉 KB ingestion finished.");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Ingest script error:", err);
  process.exit(1);
});
