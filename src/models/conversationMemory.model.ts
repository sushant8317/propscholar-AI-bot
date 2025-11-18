import mongoose from "mongoose";

const ConversationMemorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  messages: { type: [String], default: [] },
});

export const ConversationMemory = mongoose.model("ConversationMemory", ConversationMemorySchema);

export class ConversationMemoryService {
  async add(userId: string, message: string) {
    const conv = await ConversationMemory.findOne({ userId });

    if (!conv) {
      return ConversationMemory.create({
        userId,
        messages: [message],
      });
    }

    conv.messages.push(message);

    // Keep only last 3 messages
    if (conv.messages.length > 3) {
      conv.messages = conv.messages.slice(-3);
    }

    return conv.save();
  }

  async get(userId: string): Promise<string[]> {
    const conv = await ConversationMemory.findOne({ userId });
    return conv ? conv.messages : [];
  }
}
