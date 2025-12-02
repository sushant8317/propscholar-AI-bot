import mongoose from "mongoose";

const ConversationMemorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  messages: {
    type: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true }
      }
    ],
    default: []
  }
});

export const ConversationMemory = mongoose.model("ConversationMemory", ConversationMemorySchema);

export class ConversationMemoryService {
  
  // Store message with role (user or assistant)
  async add(userId: string, role: "user" | "assistant", content: string) {
    let conv = await ConversationMemory.findOne({ userId });

    if (!conv) {
      return ConversationMemory.create({
        userId,
        messages: [{ role, content }]
      });
    }

    conv.messages.push({ role, content });

    // Keep last 10 messages (role + content)
    if (conv.messages.length > 10) {
      conv.messages = conv.messages.slice(-10);
    }

    return conv.save();
  }

  // Retrieve full message history (last 10)
  async get(userId: string): Promise<{ role: string; content: string }[]> {
    const conv = await ConversationMemory.findOne({ userId });
    return conv ? conv.messages : [];
  }
}
