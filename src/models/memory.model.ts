import mongoose from "mongoose";

const MemorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    shortTerm: [
      {
        text: { type: String, required: true },
        createdAt: { type: Date, default: () => new Date() },
      },
    ],
    longTerm: [
      {
        text: { type: String, required: true },
        createdAt: { type: Date, default: () => new Date() },
      },
    ],
    updatedAt: { type: Date, default: () => new Date() },
  },
  { collection: "memories" }
);

const MemoryModel =
  mongoose.models.Memory || mongoose.model("Memory", MemorySchema);

export default MemoryModel;
