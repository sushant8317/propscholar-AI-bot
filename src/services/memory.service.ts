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

    return mem as any;
  }

  // Always create a brand new memory document
  private async createFresh(userId: string, opts?: any) {
    await MemoryModel.deleteOne({ userId });

    return MemoryModel.create({
      userId,
      shortTerm: opts?.shortTerm || [],
      longTerm: opts?.longTerm || [],
      currentTopic: opts?.currentTopic || "general",
      updatedAt: new Date(),
    });
  }

  // ------------------------------
  // Short Term Memory (Crash Proof)
  // ------------------------------
  async addShortTerm(userId: string, text: string) {
    try {
      // ALWAYS fetch fresh document before each write
      let mem: any = await MemoryModel.findOne({ userId });

      if (!mem) {
        mem = await this.createFresh(userId, {
          shortTerm: [{ text, createdAt: new Date() }],
        });
        return;
      }

      if (!Array.isArray(mem.shortTerm)) mem.shortTerm = [];

      mem.shortTerm.push({ text, createdAt: new Date() });

      if (mem.shortTerm.length > 3) {
        mem.shortTerm = mem.shortTerm.slice(-3);
      }

      mem.updatedAt = new Date();
      await mem.save();
    } catch (err: any) {
      console.error("💥 MEMORY SAVE ERROR (shortTerm):", err.message);

      // Create new clean doc
      await this.createFresh(userId, {
        shortTerm: [{ text, createdAt: new Date() }],
      });
    }
  }

  // ------------------------------
  // Long Term Memory
  // ------------------------------
  async addLongTerm(userId: string, text: string) {
    try {
      let mem: any = await MemoryModel.findOne({ userId });

      if (!mem) {
        mem = await this.createFresh(userId, {
          longTerm: [{ text, createdAt: new Date() }],
        });
        return;
      }

      if (!Array.isArray(mem.longTerm)) mem.longTerm = [];

      mem.longTerm.push({ text, createdAt: new Date() });

      if (mem.longTerm.length > 30) {
        mem.longTerm.shift();
      }

      mem.updatedAt = new Date();
      await mem.save();
    } catch (err: any) {
      console.error("💥 MEMORY SAVE ERROR (longTerm):", err.message);

      await this.createFresh(userId, {
        longTerm: [{ text, createdAt: new Date() }],
      });
    }
  }

  // ------------------------------
  // Reset Short Term
  // ------------------------------
  async resetShortTerm(userId: string) {
    try {
      let mem: any = await MemoryModel.findOne({ userId });

      if (!mem) {
        await this.createFresh(userId);
        return;
      }

      mem.shortTerm = [];
      mem.updatedAt = new Date();
      await mem.save();
    } catch (err: any) {
      console.error("💥 MEMORY RESET ERROR:", err.message);
      await this.createFresh(userId);
    }
  }

  // ------------------------------
  // Update Topic
  // ------------------------------
  async updateTopic(userId: string, topic: string) {
    try {
      let mem: any = await MemoryModel.findOne({ userId });

      if (!mem) {
        await this.createFresh(userId, { currentTopic: topic });
        return;
      }

      mem.currentTopic = topic;
      mem.updatedAt = new Date();
      await mem.save();
    } catch (err: any) {
      console.error("💥 TOPIC UPDATE ERROR:", err.message);
      await this.createFresh(userId, { currentTopic: topic });
    }
  }
}
