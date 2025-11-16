// src/services/memory.service.ts
import { MemoryModel } from "../models/memory.model";
import { ProfileModel } from "../models/profile.model";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

export class MemoryService {

  async maybeStore(userId: string, text: string, summaryCandidate?: string) {
    if (!text || text.length < 20) return;

    const summary =
      summaryCandidate || (await this.summarize(text));

    const doc = new MemoryModel({
      userId,
      text,
      summary,
      score: 0.5,
      createdAt: new Date()
    });
    await doc.save();

    await ProfileModel.updateOne(
      { userId },
      { $set: { lastSeen: new Date() } },
      { upsert: true }
    );
  }

  async summarize(text: string) {
    if (!GROQ_API_KEY) return text.slice(0, 150);

    try {
      const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "Summarize briefly" },
            { role: "user", content: text }
          ]
        },
        { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
      );

      return res.data?.choices?.[0]?.message?.content || text.slice(0, 150);

    } catch (err: any) {
      console.error("summary error:", err?.response?.data || err?.message);
      return text.slice(0, 150);
    }
  }

  async getProfile(userId: string) {
    return await ProfileModel.findOne({ userId }).lean() ||
      { userId, summary: "", lastSeen: null };
  }

  async getRecent(userId: string, limit = 5) {
    return await MemoryModel.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async addFlag(userId: string, payload: any) {
    await new MemoryModel({
      userId,
      text: "FLAG: " + payload.reason,
      summary: payload.reason,
      score: 1
    }).save();
  }

  // 🔥 missing method from orchestrator — ADD THIS
  async getContext(userId: string) {
    const recent = await this.getRecent(userId, 5);
    return recent.map(m => m.summary || m.text).join("\n");
  }
}
