import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  messages: { type: [String], default: [] },
});

export const Conversation = mongoose.model("Conversation", ConversationSchema);
