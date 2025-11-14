// src/models/kbEntry.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IKbEntry extends Document {
  title: string;
  url?: string;
  category?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  sourceId?: string; // optional unique id for upserts
}

const KbEntrySchema = new Schema<IKbEntry>({
  title: { type: String, required: true },
  url: { type: String },
  category: { type: String, default: 'Manual' },
  content: { type: String, required: true },
  sourceId: { type: String, index: true, unique: false }, // optional
}, { timestamps: true });

export const KbEntry = mongoose.model<IKbEntry>('KbEntry', KbEntrySchema);
export default KbEntry;

