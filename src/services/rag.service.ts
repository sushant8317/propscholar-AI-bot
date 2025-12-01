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

  private HALLUCINATION_THRESHOLD = 0.25;
  private TOP_K = 12;

  private expandQuery(q: string): string[] {
    const base = q.toLowerCase();
    const res = [base];

    const synonyms: Record<string, string[]> = {
      plus: ["plus model", "ps plus", "1 step", "1-step", "instant funding", "one step", "no news rules", "no consistency rules"],
      daily: ["daily dd", "daily drawdown", "maximum daily loss", "daily limit", "dmax", "dd"],
      payout: ["withdraw", "withdrawal", "payout schedule", "profit split", "payouts"],
      ufm: ["unfair means", "unfair practices", "tick scalping", "signal trading", "copying signals", "exploitation"],
      drawdown: ["dd", "maximum loss", "loss limit", "risk limit", "overall drawdown"],
      rules: ["evaluation rules", "prop rules", "firm rules", "eligibility rules"],
            win: ["pass", "clear", "succeed", "complete"],
      fail: ["breach", "lose", "violate", "hit limit"],
      stop: ["halt", "freeze", "locked", "unable to trade"],
      money: ["gain", "earning", "return", "reward"],
      withdraw: ["extract", "claim", "receive", "cash out"]
    };

    for (const key in synonyms) {
      if (base.includes(key)) res.push(...synonyms[key]);
    }

    return Array.from(new Set(res));
  }

  private rerankByTopic(docs: KBDoc[], topic: string): KBDoc[] {
    if (!topic || topic === "general") return docs;

    return docs.map((d) => {
      const cat = (d.metadata?.category || "").toLowerCase();
      let boost = 0;
      if (cat.includes(topic.toLowerCase())) boost += 0.4;
      return { ...d, score: (d.score || 0) + boost };
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

   private shouldClarify(query: string, confidence: number): boolean {
    const ambiguous = ["it", "that", "this", "here", "there"];
    const isAmbiguous = ambiguous.some(word => query.toLowerCase().includes(word));
    return isAmbiguous && confidence < 0.4;
  }

  private inferPossibleTopics(query: string): string[] {
    const patterns: Record<string, string[]> = {
      "phase": ["Phase 1", "Phase 2", "evaluation phases"],
      "loss": ["daily loss limit", "overall loss limit", "stop out"],
      "profit": ["profit target", "profitability requirement"]
    };
    return Object.entries(patterns)
      .filter(([keyword]) => query.toLowerCase().includes(keyword))
      .flatMap(([, topics]) => topics);
  }

  async generateResponse(userId: string, query: string, topic: string) {
    const mem = await this.memory.getMemory(userId);

    const shortTerm = mem.shortTerm?.map((m: any) => m.text).join(" | ") || "none";
    const longTerm = mem.longTerm?.map((m: any) => m.text).join(" | ") || "none";
      // Add conversation context for follow-up questions
  const prevContext = mem.shortTerm?.slice(-2).map((m: any) => m.text).join(" | ") || "";
  const contextAwareQuery = prevContext ? "Previous: " + prevContext + ". Current: " + query : query;

    const expanded = this.expandQuery(contextAwareQuery).join(" ");
    const queryEmbedding = await EmbedText(expanded);

    const raw = await this.vector.findSimilar(queryEmbedding, this.TOP_K, 0.18);

    const docs: KBDoc[] = raw?.map((r: any) => ({
      _id: r._id,
      content: r.content,
      embedding: r.embedding,
      metadata: r.metadata,
      score: r.score
    })) || [];

    const ranked = this.rerankByTopic(docs, topic);
    const confidence = this.computeConfidence(ranked);

    if ((ranked.length === 0 || confidence < this.HALLUCINATION_THRESHOLD) && !prevContext) { this.shouldClarify(query, confidence)
      await this.memory.addShortTerm(userId, `User: ${query}`);
      return {
        answer:
          "I don’t have much information regarding this. Let Harris or Sikha come in, they will reply in a better way sir. Until then please have patience.",
        confidence,
        usedDocs: []
      };
    }

    const kbContext = ranked
      .slice(0, 8)
      .map((d) => `${d.metadata?.title || ""}\n${d.content}\n---\n`)
      .join("\n")
      .slice(0, 3500);

    const systemPrompt = `
You are PropScholar AI.
Use ONLY the KB context. No hallucination.
Always output JSON:
{ "analysis": "...", "answer": "..." }
Tone: short, clear, professional.
Answer ONLY the current query. Do NOT address multiple related questions or create comprehensive answers. Each response should address the specific question asked.
`;

    const userMsg = `
User Query: ${query}
Topic: ${topic}


KB Context:
${kbContext}
`;

    let rawText: string | null = null;

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ],
        max_tokens: 700,
        temperature: 0.0
      });

      rawText = completion.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("🔥 RAG LLM ERROR:", err);
      return { answer: "Internal LLM error.", confidence, usedDocs: [] };
    }

    const parsed = this.safeParseJson(rawText);

    const finalAnswer =
      parsed?.answer ||
      rawText ||
      "I don’t have much information regarding this. Let Harris or Sikha come in, they will reply in a better way sir. Until then please have patience.";

    await this.memory.addShortTerm(userId, `User: ${query}`);
    await this.memory.addShortTerm(userId, `Bot: ${finalAnswer}`);

    return {
      answer: finalAnswer,
      confidence,
      usedDocs: ranked.slice(0, 8)
    };
  }
}
