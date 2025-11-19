// src/models/memory.model.ts

import mongoose from "mongoose";

const shortTermSchema = new mongoose.Schema({
  text: String,
  createdAt: Date,
});

const longTermSchema = new mongoose.Schema({
  text: String,
  createdAt: Date,
});

const MemorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  shortTerm: { type: [shortTermSchema], default: [] },
  longTerm: { type: [longTermSchema], default: [] },
  currentTopic: { type: String, default: "general" },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Memory", MemorySchema);
