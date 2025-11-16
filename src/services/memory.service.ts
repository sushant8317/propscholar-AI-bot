// src/services/memory.service.ts
import MemoryModel from "../models/memory.model";

export class MemoryService {
  async listUsers() {
    return MemoryModel.find().select("userId createdAt updatedAt");
  }

  async getMemory(userId: string) {
    let mem = await MemoryModel.findOne({ userId });

    if (!mem) {
      mem = await MemoryModel.create({
        userId,
        shortTerm: [],
        longTerm: [],
      });
    }

    // 🔥 FIX: Ensure fields always exist
    if (!Array.isArray(mem.shortTerm)) mem.shortTerm = [];
    if (!Array.isArray(mem.longTerm)) mem.longTerm = [];

    return mem;
  }

  async addMessage(userId: string, message: string) {
    const mem = await this.getMemory(userId);

    mem.shortTerm.push({
      text: message,
      createdAt: new Date(),
    });

    if (mem.shortTerm.length > 20) mem.shortTerm.shift();

    mem.updatedAt = new Date();
    await mem.save();
    return mem;
  }
}
