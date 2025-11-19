// src/services/memory.service.ts

import MemoryModel from "../models/memory.model";

export class MemoryService {

  // Always fetch OR create new
  async getMemory(userId: string) {
    let mem = await MemoryModel.findOne({ userId });

    // If missing → create fresh document
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

  /* --------------------------------------------------------
     SAFE createNewMemory — always returns a fresh NEW doc
  -------------------------------------------------------- */
  private async createNewMemory(userId: string, opts?: any) {
    await MemoryModel.deleteOne({ userId });
    return MemoryModel.create({
      userId,
      shortTerm: opts?.shortTerm || [],
      longTerm: opts?.longTerm || [],
      currentTopic: opts?.currentTopic || "general",
      updatedAt: new Date(),
    });
  }

  /* --------------------------------------------------------
     Short Term Memory (Crash Proof)
  -------------------------------------------------------- */
  async addShortTerm(userId: string, text: string) {
    try {
      let mem: any = await this.getMemory(userId);

      // Force array shape
      if (!Array.isArray(mem.shortTerm)) mem.shortTerm = [];

      mem.shortTerm.push({ text, createdAt: new Date() });

      if (mem.shortTerm.length > 3) {
        mem.shortTerm = mem.shortTerm.slice(-3);
      }

      mem.updatedAt = new Date();
      await mem.save(); // MAIN PLACE THAT WAS FAILING

    } catch (err: any) {
      console.error("MEMORY SAVE ERROR (shortTerm):", err?.message);

      // CREATE A TOTALLY NEW CLEAN MEMORY DOC
      await this.createNewMemory(userId, {
        shortTerm: [{ text, createdAt: new Date() }],
        longTerm: [],
        currentTopic: "general",
      });
    }
  }

  /* --------------------------------------------------------
     Long Term Memory (Crash Proof)
  -------------------------------------------------------- */
  async addLongTerm(userId: string, text: string) {
    try {
      let mem: any = await this.getMemory(userId);

      if (!Array.isArray(mem.longTerm)) mem.longTerm = [];

      mem.longTerm.push({ text, createdAt: new Date() });

      if (mem.longTerm.length > 30) {
        mem.longTerm.shift();
      }

      mem.updatedAt = new Date();
      await mem.save();

    } catch (err: any) {
      console.error("MEMORY SAVE ERROR (longTerm):", err?.message);

      await this.createNewMemory(userId, {
        shortTerm: [],
        longTerm: [{ text, createdAt: new Date() }],
        currentTopic: "general",
      });
    }
  }

  /* --------------------------------------------------------
     Reset Short Term
  -------------------------------------------------------- */
  async resetShortTerm(userId: string) {
    try {
      let mem: any = await this.getMemory(userId);

      mem.shortTerm = [];
      mem.updatedAt = new Date();
      await mem.save();

    } catch (err: any) {
      console.error("MEMORY RESET ERROR:", err?.message);
      await this.createNewMemory(userId);
    }
  }

  /* --------------------------------------------------------
     Update Topic
  -------------------------------------------------------- */
  async updateTopic(userId: string, topic: string) {
    try {
      let mem: any = await this.getMemory(userId);

      mem.currentTopic = topic;
      mem.updatedAt = new Date();
      await mem.save();

    } catch (err: any) {
      console.error("TOPIC UPDATE ERROR:", err?.message);

      await this.createNewMemory(userId, {
        shortTerm: [],
        longTerm: [],
        currentTopic: topic,
      });
    }
  }
}
