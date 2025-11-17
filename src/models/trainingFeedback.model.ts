// src/models/trainingFeedback.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ITrainingFeedback extends Document {
  conversationId: string;
  timestamp: Date;
  userQuestion: string;
  botAnswer: string;
  wasCorrect: boolean;
  userCorrection?: string;
  correctCategory?: string;
  status: "pending" | "approved" | "rejected" | "applied";
  appliedToKB: boolean;
  kbEntryId?: string;
  notes?: string;
}

const TrainingFeedbackSchema = new Schema<ITrainingFeedback>({
  conversationId: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  userQuestion: { type: String, required: true },
  botAnswer: { type: String, required: true },
  wasCorrect: { type: Boolean, required: true },
  userCorrection: { type: String },
  correctCategory: { type: String, default: "Corrections" },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "applied"],
    default: "pending",
  },
  appliedToKB: { type: Boolean, default: false },
  kbEntryId: { type: String },
  notes: { type: String },
});

export const TrainingFeedbackModel = mongoose.model<ITrainingFeedback>(
  "TrainingFeedback",
  TrainingFeedbackSchema
);
