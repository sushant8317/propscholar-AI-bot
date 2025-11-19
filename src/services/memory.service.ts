// src/services/memory.service.ts

import MemoryModel from "../models/memory.model";

export class MemoryService {
  
  // Always fetch OR recreate clean
  async getMemory(userId: string) {
    let mem = await MemoryModel.findOne({ userId });

    if (!mem) {
      mem = await MemoryModel.create({
        userId,
        shortTerm: [],
        longTerm: [],
        currentTopic: "general",
        updatedAt: new Date(),
      });
    }

    // safety checks
    if (!Array.isArray(mem.shortTerm)) mem.shortTerm = [];
    if (!Array.isArray(mem.longTerm)) mem.longTerm = [];
    if (!mem.currentTopic) mem.currentTopic = "general";

    return mem;
  }

  // 🛠 Crash-Proof Short-Term Memory
  async addShortTerm(userId: string, text: string) {
    try {
      const mem = await this.getMemory(userId);

      mem.shortTerm.push({ text, createdAt: new Date() });

      if (mem.shortTerm.length > 3) {
        mem.shortTerm = mem.shortTerm.slice(-3);
      }

      mem.updatedAt = new Date();
      await mem.save(); // <-- sometimes fails on Render (VersionError)
    } catch (err: any) {
      console.error("MEMORY SAVE ERROR (shortTerm):", err.message);

      // FIX: Recreate safe memory document
      await MemoryModel.findOneAndDelete({ userId });

      await MemoryModel.create({
        userId,
        shortTerm: [{ text, createdAt: new Date() }],
        longTerm: [],
        currentTopic: "general",
        updatedAt: new Date(),
      });
    }
  }

  // 🛠 Crash-Proof Long-Term Memory
  async addLongTerm(userId: string, text: string) {
    try {
      const mem = await this.getMemory(userId);

      mem.longTerm.push({ text, createdAt: new Date() });

      if (mem.longTerm.length > 30) {
        mem.longTerm.shift();
      }

      mem.updatedAt = new Date();
      await mem.save();
    } catch (err: any) {
      console.error("MEMORY SAVE ERROR (longTerm):", err.message);

      await MemoryModel.findOneAndDelete({ userId });

      await MemoryModel.create({
        userId,
        shortTerm: [],
        longTerm: [{ text, createdAt: new Date() }],
        currentTopic: "general",
        updatedAt: new Date(),
      });
    }
  }

  async resetShortTerm(userId: string) {
    try {
      const mem = await this.getMemory(userId);
      mem.shortTerm = [];
      mem.updatedAt = new Date();
      await mem.save();
    } catch (err: any) {
      console.error("MEMORY RESET ERROR:", err.message);
      await MemoryModel.findOneAndDelete({ userId });
      await MemoryModel.create({
        userId,
        shortTerm: [],
        longTerm: [],
        currentTopic: "general",
        updatedAt: new Date(),
      });
    }
  }

  async updateTopic(userId: string, topic: string) {
    try {
      const mem = await this.getMemory(userId);
      mem.currentTopic = topic;
      mem.updatedAt = new Date();
      await mem.save();
    } catch (err: any) {
      console.error("TOPIC UPDATE ERROR:", err.message);
      await MemoryModel.findOneAndDelete({ userId });
      await MemoryModel.create({
        userId,
        shortTerm: [],
        longTerm: [],
        currentTopic: topic,
        updatedAt: new Date(),
      });
    }
  }
}
