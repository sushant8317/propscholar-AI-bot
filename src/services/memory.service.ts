// src/services/memory.service.ts

import MemoryModel from "../models/memory.model";

export class MemoryService {
  
  // Fetch or create memory record
  async getMemory(userId: string) {
    let mem = await MemoryModel.findOne({ userId });

    if (!mem) {
      mem = await MemoryModel.create({
        userId,
        shortTerm: [],
        longTerm: [],
        currentTopic: "general",
      });
    }

    if (!Array.isArray(mem.shortTerm)) mem.shortTerm = [];
    if (!Array.isArray(mem.longTerm)) mem.longTerm = [];

    return mem;
  }

  // Add short-term memory (keep 3)
  async addShortTerm(userId: string, text: string) {
    const mem = await this.getMemory(userId);

    mem.shortTerm.push({ text, createdAt: new Date() });

    if (mem.shortTerm.length > 3) {
      mem.shortTerm = mem.shortTerm.slice(-3);
    }

    mem.updatedAt = new Date();
    await mem.save();
  }

  // Add long-term memory (keep 30)
  async addLongTerm(userId: string, text: string) {
    const mem = await this.getMemory(userId);

    mem.longTerm.push({ text, createdAt: new Date() });

    if (mem.longTerm.length > 30) {
      mem.longTerm.shift();
    }

    mem.updatedAt = new Date();
    await mem.save();
  }

  // Reset short-term memory only
  async resetShortTerm(userId: string) {
    const mem = await this.getMemory(userId);
    mem.shortTerm = [];
    mem.updatedAt = new Date();
    await mem.save();
  }

  // ✔ ADD THIS — FIXES YOUR ERROR
  async updateTopic(userId: string, topic: string) {
    const mem = await this.getMemory(userId);
    mem.currentTopic = topic;
    mem.updatedAt = new Date();
    await mem.save();
  }
}
