import mongoose from "mongoose";

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

const MemoryModel =
  mongoose.models.Memory || mongoose.model("Memory", MemorySchema);

export default MemoryModel;
