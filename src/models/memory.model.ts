import mongoose, { Schema, Document } from "mongoose";

export interface IMemory extends Document {
  userId: string;
  shortTerm: { text: string; createdAt: Date }[];
  longTerm: { text: string; createdAt: Date }[];
  currentTopic: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema(
  {
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MemorySchema = new Schema<IMemory>(
  {
    userId: { type: String, required: true, unique: true },

    shortTerm: { type: [MessageSchema], default: [] },
    longTerm: { type: [MessageSchema], default: [] },

    currentTopic: { type: String, default: "general" },
  },
  { timestamps: true }
);

const MemoryModel = mongoose.model<IMemory>("Memory", MemorySchema);

export default MemoryModel;
