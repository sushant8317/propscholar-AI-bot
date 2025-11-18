// src/services/memory.service.ts

import MemoryModel from "../models/memory.model";

export class MemoryService {

  // ---------------------------
  // Get or create memory record
  // ---------------------------
  async getMemory(userId: string) {
    let mem = await MemoryModel.findOne({ userId });

    if (!mem) {
      mem = await MemoryModel.create({
        userId,
        shortTerm: [],
        longTerm: [],
      });
    }

    if (!Array.isArray(mem.shortTerm)) mem.shortTerm = [];
    if (!Array.isArray(mem.longTerm)) mem.longTerm = [];

    return mem;
  }

  // ---------------------------
  // Add to SHORT TERM memory
  // Only keep last 3 messages
  // ---------------------------
  async addShortTerm(userId: string, text: string) {
    const mem = await this.getMemory(userId);

    mem.shortTerm.push({
      text,
      createdAt: new Date(),
    });

    // Keep only last 3 messages
    if (mem.shortTerm.length > 3) {
      mem.shortTerm = mem.shortTerm.slice(-3);
    }

    mem.updatedAt = new Date();
    await mem.save();
  }

  // ---------------------------
  // Add to LONG TERM memory
  // Used only for confirmed facts
  // ---------------------------
  async addLongTerm(userId: string, text: string) {
    const mem = await this.getMemory(userId);

    mem.longTerm.push({
      text,
      createdAt: new Date(),
    });

    // Keep long-term capped at 30
    if (mem.longTerm.length > 30) {
      mem.longTerm.shift();
    }

    mem.updatedAt = new Date();
    await mem.save();
  }

  // ---------------------------
  // Topic reset: clear short-term
  // ---------------------------
  async resetShortTerm(userId: string) {
    const mem = await this.getMemory(userId);
    mem.shortTerm = [];
    mem.updatedAt = new Date();
    await mem.save();
  }
}
