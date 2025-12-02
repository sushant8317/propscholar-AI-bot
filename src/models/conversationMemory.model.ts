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
  
  async add(userId: string, role: "user" | "assistant", content: string) {
    let conv = await ConversationMemory.findOne({ userId });

    if (!conv) {
      return ConversationMemory.create({
        userId,
        messages: [{ role, content }]
      });
    }

    // Add new message
    conv.messages.push({ role, content });

    // If more than 10 messages, keep only the last 10 in a type-safe way
    if (conv.messages.length > 10) {
      const lastTen = conv.messages.slice(-10); // JS array

      // Clear Mongoose DocumentArray properly
      conv.messages.splice(0, conv.messages.length);

      // Push back messages safely into DocumentArray
      lastTen.forEach(m => conv.messages.push(m));
    }

    return conv.save();
  }

  async get(userId: string): Promise<{ role: string; content: string }[]> {
    const conv = await ConversationMemory.findOne({ userId });
    return conv ? conv.messages : [];
  }
}
