import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  conversationId: { type: String, required: true },
  userMessage: { type: String, required: true },
  botResponse: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  confidence: { type: Number, default: 0 },
});

export const Conversation = mongoose.model("Conversation", ConversationSchema);
