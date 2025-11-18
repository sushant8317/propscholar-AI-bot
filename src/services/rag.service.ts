// src/services/rag.service.ts

import OpenAI from "openai";
import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";
import { MemoryService } from "./memory.service";

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

  // Rule-based re-ranking
  private RULE_BOOSTS: Array<{ keyword: string; category?: string; boost: number }> = [
    { keyword: "daily", category: "rules", boost: 0.20 },
    { keyword: "daily drawdown", category: "rules", boost: 0.30 },
    { keyword: "max loss", category: "rules", boost: 0.25 },
    { keyword: "maximum loss", category: "rules", boost: 0.25 },
    { keyword: "payout", category: "payout", boost: 0.20 },
    { keyword: "withdraw", category: "payout", boost: 0.20 },
    { keyword: "plus", category: "plus-model", boost: 0.18 },
    { keyword: "1-step", category: "plus-model", boost: 0.18 },
    { keyword: "unfair means", category: "ufm-rules", boost: 0.25 },
    { keyword: "tick scalping", category: "ufm-rules", boost: 0.25 },
  ];

  private HALLUCINATION_THRESHOLD = 0.40;
  private TOP_K = 8;

  private expandQuery(q: string): string[] {
    const base = q.toLowerCase();
    const res = [base];

    const synonyms: Record<string, string[]> = {
      plus: ["1-step", "2-step", "plus-model"],
      daily: ["daily loss", "ddl", "daily drawdown"],
      payout: ["withdraw", "payout", "scholarship"],
      ufm: ["unfair means", "tick scalping"],
    };

    for (const k in synonyms) {
      if (base.includes(k)) res.push(...synonyms[k]);
    }

    return Array.from(new Set(res));
  }

  // Re-rank docs using boosts + exact match
  private rerankResults(results: KBDoc[], query: string): KBDoc[] {
    const q = query.toLowerCase();

    const boosted = results.map((doc) => {
      let boost = 0;
      const content = (doc.content || "").toLowerCase();
      const category = doc.metadata?.category || "";

      for (const rule of this.RULE_BOOSTS) {
        if (q.includes(rule.keyword)) {
          if (rule.category && rule.category === category) boost += rule.boost + 0.10;
          else if (content.includes(rule.keyword)) boost += rule.boost;
        }
      }

      const tokens = q.split(/\s+/);
      for (const t of tokens) {
        if (t.length > 3 && content.includes(t)) boost += 0.05;
      }

      const updatedAt = doc.metadata?.updatedAt ? new Date(doc.metadata.updatedAt).getTime() : 0;
      if (updatedAt && Date.now() - updatedAt < 365 * 24 * 60 * 60 * 1000) boost += 0.02;

      return { ...doc, score: (doc.score || 0) + boost };
    });

    return boosted.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private computeConfidence(docs: KBDoc[]): number {
    if (!docs || docs.length === 0) return 0;
    const max = Math.max(...docs.map((d) => d.score || 0));
    if (!max || max <= 0) return 0;
    return Number(Math.min(1, max).toFixed(2));
  }

  private buildKbContext(docs: KBDoc[], charLimit = 2400): string {
    let used = 0;
    const parts: string[] = [];

    for (const d of docs) {
      const title = d.metadata?.title ? `Title: ${d.metadata.title}\n` : "";
      const block = `${title}${d.content?.trim()}\n---\n`;

      if (used + block.length > charLimit) break;
      parts.push(block);
      used += block.length;
    }

    return parts.join("\n");
  }

  private safeParseJson(text: string): any {
    try {
      const trimmed = text.trim();
      const start = trimmed.indexOf("{");
      const json = start >= 0 ? trimmed.slice(start) : trimmed;
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------
  // MAIN RAG ENGINE
  // --------------------------------------------------------------------
  async generateResponse(userId: string, query: string) {
    // 1) Get memory (used only as context)
    const mem = await this.memory.getMemory(userId);
    const shortTerm = mem.shortTerm?.map((m: any) => m.text).join(" | ") || "none";
    const longTerm = mem.longTerm?.map((m: any) => m.text).join(" | ") || "none";

    // 2) Expand + embed
    const expanded = this.expandQuery(query).join(" ");
    const queryEmbedding = await EmbedText(expanded);

    // 3) Vector search
    const rawResults = await this.vector.findSimilar(queryEmbedding, this.TOP_K, 0.20);
    const docs = rawResults?.map((r: any) => ({
      _id: r._id,
      content: r.content,
      metadata: r.metadata,
      embedding: r.embedding,
      score: r.score,
    })) || [];

    // 4) Re-rank
    const reranked = this.rerankResults(docs, query);

    // 5) Compute confidence
    const confidence = this.computeConfidence(reranked);

    // 6) Hallucination guard
    if (!reranked.length || confidence < this.HALLUCINATION_THRESHOLD) {
      return {
        answer: "I do not have this information yet in the PropScholar knowledge base.",
        confidence,
        usedDocs: [],
      };
    }

    // 7) Build KB context
    const kbContext = this.buildKbContext(reranked, 2800);

    // 8) System prompt with reasoning chain
    const systemPrompt = `
You are PropScholar AI.

Rules:
- Use ONLY the KB Context + memory.
- NEVER hallucinate.
- If info missing, say: "I do not have this information yet in the PropScholar knowledge base."
- Output JSON { "analysis": "...", "answer": "..." }.
- Short, precise sentences. No emojis.
`;

    // 9) User prompt
    const userMessage = `
User Query: ${query}

Short-term memory: ${shortTerm}
Long-term memory: ${longTerm}

KB Context:
${kbContext}

Respond in required JSON format only.
`;

    // 10) Call GPT-5.1
    let finalAnswer = "";
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.0,
        max_tokens: 800,
      });

      const raw = completion.choices?.[0]?.message?.content || "";
      const parsed = this.safeParseJson(raw);

      finalAnswer = parsed?.answer?.trim() || raw.trim();
    } catch (err) {
      console.error("RAG — LLM error:", err);
      return {
        answer: "Internal LLM error. Try again later.",
        confidence,
        usedDocs: reranked.slice(0, 3),
      };
    }

    // 11) Hallucination check
    const riskyWords = ["always", "never", "guarantee"];
    if (riskyWords.some((w) => finalAnswer.toLowerCase().includes(w)) && confidence < 0.8) {
      finalAnswer += "\n\nNote: This answer is based on limited KB context.";
    }

    // IMPORTANT:
    // ❌ DO NOT WRITE MEMORY HERE.
    // Index.ts writes memory to avoid VersionError.

    return {
      answer: finalAnswer,
      confidence,
      usedDocs: reranked.slice(0, 5),
    };
  }
}
