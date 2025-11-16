// src/models/knowledge.model.ts (as you posted)
import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledge extends Document {
  title: string;
  category: string;
  content: string;
  embedding: number[];
}

const KnowledgeSchema = new Schema<IKnowledge>(
  {
    title: { type: String, required: true },
    category: { type: String, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], default: [] }
  },
  { timestamps: true }
);

export const KnowledgeModel = mongoose.model<IKnowledge>(
  "Knowledge",
  KnowledgeSchema
);
