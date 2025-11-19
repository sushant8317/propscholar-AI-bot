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

  // MORE TOLERANT = more accurate retrieval
  private HALLUCINATION_THRESHOLD = 0.25;

  // Search more docs → re-rank them
  private TOP_K = 12;

  /* ----------------------------------------------------
     ADVANCED QUERY EXPANSION (v2.5)
  ---------------------------------------------------- */
  private expandQuery(q: string): string[] {
    const base = q.toLowerCase();
    const res = [base];

    const synonyms: Record<string, string[]> = {
      plus: [
        "plus model",
        "ps plus",
        "1 step",
        "1-step",
        "instant funding",
        "one step",
        "no news rules",
        "no consistency rules",
      ],

      daily: [
        "daily dd",
        "daily drawdown",
        "maximum daily loss",
        "daily limit",
        "dmax",
        "dd",
      ],

      payout: [
        "withdraw",
        "withdrawal",
        "payout schedule",
        "profit split",
        "payouts",
      ],

      ufm: [
        "unfair means",
        "unfair practices",
        "tick scalping",
        "signal trading",
        "copying signals",
        "exploitation",
      ],

      drawdown: [
        "dd",
        "maximum loss",
        "loss limit",
        "risk limit",
        "overall drawdown",
      ],

      rules: [
        "evaluation rules",
        "prop rules",
        "firm rules",
        "eligibility rules",
      ],
    };

    for (const key in synonyms) {
      if (base.includes(key)) res.push(...synonyms[key]);
    }

    return Array.from(new Set(res));
  }

  /* ----------------------------------------------------
     TOPIC-AWARE RE-RANKING (boost accuracy massively)
  ---------------------------------------------------- */
  private rerankByTopic(docs: KBDoc[], topic: string): KBDoc[] {
    if (!topic || topic === "general") return docs;

    return docs.map((d) => {
      const cat = (d.metadata?.category || "").toLowerCase();
      let boost = 0;

      // Partial match is enough
      if (cat.includes(topic.toLowerCase())) boost += 0.4;

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

  /* ----------------------------------------------------
     MAIN FUNCTION
  ---------------------------------------------------- */
  async generateResponse(userId: string, query: string, topic: string) {
    const mem = await this.memory.getMemory(userId);

    const shortTerm =
      mem.shortTerm?.map((m: any) => m.text).join(" | ") || "none";

    const longTerm =
      mem.longTerm?.map((m: any) => m.text).join(" | ") || "none";

    /* --------- SMART QUERY EXPANSION ---------- */
    const expanded = this.expandQuery(query).join(" ");
    const queryEmbedding = await EmbedText(expanded);

    /* --------- VECTOR SEARCH ---------- */
    const raw = await this.vector.findSimilar(
      queryEmbedding,
      this.TOP_K,
      0.18 // slightly lower threshold for better recall
    );

    const docs: KBDoc[] =
      raw?.map((r: any) => ({
        _id: r._id,
        content: r.content,
        embedding: r.embedding,
        metadata: r.metadata,
        score: r.score,
      })) || [];

    /* --------- TOPIC-AWARE RE-RANK ---------- */
    const ranked = this.rerankByTopic(docs, topic);
    const confidence = this.computeConfidence(ranked);

    /* --------- FALLBACK ON LOW CONFIDENCE ---------- */
    if (ranked.length === 0 || confidence < this.HALLUCINATION_THRESHOLD) {
      await this.memory.addShortTerm(userId, `User: ${query}`);
      return {
        answer: "I cannot find this in PropScholar’s knowledge base yet.",
        confidence,
        usedDocs: [],
      };
    }

    /* --------- IMPROVED KB CONTEXT (8 docs) ---------- */
    const kbContext = ranked
      .slice(0, 8)
      .map((d) => `${d.metadata?.title || ""}\n${d.content}\n---\n`)
      .join("\n")
      .slice(0, 3500);

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
        max_tokens: 700,
        temperature: 0.0,
      });

      rawText = completion.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("🔥 RAG LLM ERROR:", err);
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
      usedDocs: ranked.slice(0, 8),
    };
  }
}
