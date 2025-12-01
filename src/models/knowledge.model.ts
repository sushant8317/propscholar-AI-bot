// src/models/knowledge.model.ts

import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledge extends Document {
  title: string;
  category: string;
  content: string;
  embedding: number[];
  metadata: {
    sourceId?: string;
    category?: string;
    url?: string;
    title?: string;
    updatedAt?: Date;
  };
}

const KnowledgeSchema = new Schema<IKnowledge>(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], default: [] },

    // ⭐ THIS FIXES YOUR WHOLE PROBLEM ⭐
    metadata: {
      sourceId: { type: String, index: true },
      category: { type: String },
      url: { type: String },
      title: { type: String },
      updatedAt: { type: Date }
    }
  },
  { timestamps: true, strict: true }
);

export const KnowledgeModel = mongoose.model<IKnowledge>(
  "Knowledge",
  KnowledgeSchema
);
