// src/services/rag.service.ts

import OpenAI from "openai";
import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";
import { MemoryService } from "./memory.service";
import { TopicService } from "./topic.service";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type KBDoc = {
  _id?: string;
  content?: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  score?: number;
};

export class RAGService {
  private vector = new VectorService();
  private memory = new MemoryService();
  private topics = new TopicService();

  private HALLUCINATION_THRESHOLD = 0.35;
  private TOP_K = 8;

  private expandQuery(q: string): string[] {
    const base = q.toLowerCase();
    const res = [base];

    const synonyms: Record<string, string[]> = {
      plus: ["1 step", "1-step", "2 step", "plus model"],
      daily: ["daily dd", "daily loss", "ddl", "dmax"],
      payout: ["withdraw", "profit split"],
      ufm: ["unfair means", "tick scalping"],
    };

    for (const k in synonyms) {
      if (base.includes(k)) res.push(...synonyms[k]);
    }

    return Array.from(new Set(res));
  }

  private rerankByTopic(docs: KBDoc[], topic: string): KBDoc[] {
    if (!topic || topic === "general") return docs;

    return docs.map((d) => {
      let boost = 0;
      const cat = d.metadata?.category || "";

      if (cat === topic) boost += 0.25;

      return {
        ...d,
        score: (d.score || 0) + boost,
      };
    });
  }

  private computeConfidence(docs: KBDoc[]): number {
    if (docs.length === 0) return 0;
    const max = Math.max(...docs.map((d) => d.score || 0));
    if (max <= 0) return 0;
    return Number(Math.min(1, max).toFixed(2));
  }

  private safeParseJson(text: string | null): { analysis?: string; answer?: string } | null {
    if (!text) return null;
    try {
      const trimmed = text.trim();
      const start = trimmed.indexOf("{");
      const jsonStr = start >= 0 ? trimmed.slice(start) : trimmed;
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  async generateResponse(userId: string, query: string, topic: string) {
    const mem = await this.memory.getMemory(userId);

    const shortTerm =
      mem.shortTerm?.map((m: any) => m.text).join(" | ") || "none";

    const longTerm =
      mem.longTerm?.map((m: any) => m.text).join(" | ") || "none";

    const expanded = this.expandQuery(query).join(" ");
    const queryEmbedding = await EmbedText(expanded);

    const raw = await this.vector.findSimilar(queryEmbedding, this.TOP_K, 0.20);

    const docs: KBDoc[] =
      raw?.map((r: any) => ({
        _id: r._id,
        content: r.content,
        embedding: r.embedding,
        metadata: r.metadata,
        score: r.score,
      })) || [];

    const ranked = this.rerankByTopic(docs, topic);
    const confidence = this.computeConfidence(ranked);

    if (ranked.length === 0 || confidence < this.HALLUCINATION_THRESHOLD) {
      await this.memory.addShortTerm(userId, `User: ${query}`);
      return {
        answer:
          "I cannot find this in PropScholar’s knowledge base yet.",
        confidence,
        usedDocs: [],
      };
    }

    const kbContext = ranked
      .slice(0, 5)
      .map((d) => `${d.metadata?.title || ""}\n${d.content}\n---\n`)
      .join("\n")
      .slice(0, 2500);

    const systemPrompt = `
You are PropScholar AI.
Use ONLY the KB context. No hallucination.
Always output JSON:
{
 "analysis": "...",
 "answer": "..."
}
Tone: short, clear, professional.
`;

    const userMsg = `
User Query: ${query}

Topic: ${topic}

Short-term memory: ${shortTerm}
Long-term memory: ${longTerm}

KB Context:
${kbContext}
    `;

    let rawText: string | null = null;

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        max_tokens: 600,
        temperature: 0.0,
      });

      rawText = completion.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("RAG LLM ERROR:", err);
      return {
        answer: "Internal LLM error.",
        confidence,
        usedDocs: [],
      };
    }

    const parsed = this.safeParseJson(rawText);

    const finalAnswer =
      parsed?.answer ||
      rawText ||
      "I cannot find this in the PropScholar knowledge base.";

    await this.memory.addShortTerm(userId, `User: ${query}`);
    await this.memory.addShortTerm(userId, `Bot: ${finalAnswer}`);

    return {
      answer: finalAnswer,
      confidence,
      usedDocs: ranked.slice(0, 5),
    };
  }
}
