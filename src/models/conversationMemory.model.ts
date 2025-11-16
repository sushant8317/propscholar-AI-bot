import { Conversation } from "../models/conversation.model";

export class ConversationMemoryService {
  async add(userId: string, message: string) {
    const conv = await Conversation.findOne({ userId });

    if (!conv) {
      return Conversation.create({
        userId,
        messages: [message],
      });
    }

    conv.messages.push(message);

    // Keep only last 10 messages
    if (conv.messages.length > 10) {
      conv.messages = conv.messages.slice(-10);
    }

    return conv.save();
  }

  async get(userId: string): Promise<string[]> {
    const conv = await Conversation.findOne({ userId });
    return conv ? conv.messages : [];
  }
}
