// src/services/memory.service.ts
import MemoryModel from "../models/memory.model";

export class MemoryService {
  // list all users (dashboard)
  async listUsers() {
    return MemoryModel.find().select("userId createdAt updatedAt");
  }

  // get single user's memory doc
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

  // add a new memory message
  async addMessage(userId: string, message: string) {
    const mem = await this.getMemory(userId);

    mem.shortTerm.push({
      text: message,
      createdAt: new Date(),
    });

    // keep only last 20
    if (mem.shortTerm.length > 20) {
      mem.shortTerm.shift();
    }

    await mem.save();
    return mem;
  }
}
