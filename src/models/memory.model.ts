// src/models/memory.model.ts
import mongoose from "mongoose";

export interface IMemoryItem {
  userId: string;
  text: string;
  summary?: string;
  score?: number;
  createdAt?: Date;
}

const MemorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    summary: { type: String },
    score: { type: Number, default: 0 },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "memories" }
);

export const MemoryModel = mongoose.models.Memory || mongoose.model("Memory", MemorySchema);
