import mongoose from 'mongoose';

const KnowledgeSchema = new mongoose.Schema({
  content: { type: String, required: true },
  embedding: { type: [Number], required: true },
  metadata: {
    category: String,
    source: String,
    keywords: [String]
  },
  createdAt: { type: Date, default: Date.now }
});

KnowledgeSchema.index({ 'metadata.category': 1 });
KnowledgeSchema.index({ createdAt: -1 });

export const Knowledge = mongoose.model('Knowledge', KnowledgeSchema);
