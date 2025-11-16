// src/services/memory.service.ts

import { MemoryModel } from "../models/memory.model";

export class MemoryService {
  
  // -----------------------------
  // List all users for dashboard
  // -----------------------------
  async listUsers() {
    return MemoryModel.find().select("userId createdAt updatedAt");
  }

  // -----------------------------
  // Get or create user memory
  // -----------------------------
  async getMemory(userId: string) {
    let mem = await MemoryModel.findOne({ userId });

    if (!mem) {
      mem = await MemoryModel.create({
        userId,
        shortTerm: [],
        longTerm: [],
      });
    }

    return mem;
  }

  // -----------------------------
  // Add short-term memory item
  // -----------------------------
  async addMessage(userId: string, message: string) {
    const mem = await this.getMemory(userId);

    mem.shortTerm.push({
      text: message,
      createdAt: new Date(),
    });

    // keep ONLY last 20 messages
    if (mem.shortTerm.length > 20) {
      mem.shortTerm.shift();
    }

    mem.updatedAt = new Date();
    await mem.save();

    return mem;
  }
}
