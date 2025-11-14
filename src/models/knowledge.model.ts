import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledge extends Document {
  content: string;
  embedding: number[];
  metadata: {
    source?: string;
    sourceId?: string;   // <-- REQUIRED
    title?: string;
    url?: string;
    category?: string;
    question?: string;
    keywords?: string[];
    [key: string]: any;
  };
}

const KnowledgeSchema = new Schema<IKnowledge>({
  content: { type: String, required: true },
  embedding: { type: [Number], required: true },

  metadata: {
    type: Object,
    default: {},
  }
}, { strict: false });  // <-- ALLOWS ANY metadata fields
// IMPORTANT 🔥🔥🔥

export const Knowledge = mongoose.model<IKnowledge>(
  "Knowledge",
  KnowledgeSchema
);
