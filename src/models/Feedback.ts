// src/models/Feedback.ts
import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
  question: { type: String, required: true },
  botAnswer: { type: String, required: true },
  userCorrection: { type: String },
  kbId: { type: mongoose.Schema.Types.ObjectId, ref: "Knowledge", default: null },
  createdAt: { type: Date, default: Date.now },
  processed: { type: Boolean, default: false },
  adminUser: { type: String } // optional admin id/email
});

export default mongoose.model("Feedback", FeedbackSchema);
