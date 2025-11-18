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

  // ------------------------------
  // Rule-based keyword boosting
  // ------------------------------
  private RULE_BOOSTS = [
    { keyword: "daily", category: "rules", boost: 0.20 },
    { keyword: "daily drawdown", category: "rules", boost: 0.30 },
    { keyword: "max loss", category: "rules", boost: 0.25 },
    { keyword: "payout", category: "payout", boost: 0.20 },
    { keyword: "withdraw", category: "payout", boost: 0.20 },
    { keyword: "plus", category: "plus-model", boost: 0.18 },
    { keyword: "unfair means", category: "ufm-rules", boost: 0.25 },
    { keyword: "tick scalping", category: "ufm-rules", boost: 0.25 }
  ];

  // Conf threshold
  private HALLUCINATION_THRESHOLD = 0.40;

  // Vector search top-K
  private TOP_K = 8;

  // -----------------------------
  // QUERY EXPANSION
  // -----------------------------
  private expandQuery(q: string): string[] {
    const base = q.toLowerCase();
    const res = [base];

    const synonyms: Record<string, string[]> = {
      plus: ["1-step", "2-step", "plus-model"],
      payout: ["withdraw", "profit split", "scholarship"],
      daily: ["daily dd", "daily drawdown", "ddl"],
      ufm: ["unfair means", "tick scalping"]
    };

    for (const k in synonyms) {
      if (base.includes(k)) res.push(...synonyms[k]);
    }

    return [...new Set(res)];
  }

  // -----------------------------
  // RERANK RESULTS
  // -----------------------------
  private rerank(results: KBDoc[], query: string, topic: string) {
    const q = query.toLowerCase();

    return results
      .map((doc) => {
        let boost = 0;

        const content = (doc.content || "").toLowerCase();
        const category = doc.metadata?.category || "";

        // Rule boosts
        for (const rule of this.RULE_BOOSTS) {
          if (q.includes(rule.keyword)) {
            if (rule.category && category === rule.category) {
              boost += rule.boost + 0.10;
            } else if (content.includes(rule.keyword)) {
              boost += rule.boost;
            }
          }
        }

        // TOPIC BOOST
        if (topic && category === topic) {
          boost += 0.25; // strong match
        }

        // exact token match
        for (const t of q.split(" ")) {
          if (t.length > 3 && content.includes(t)) boost += 0.05;
        }

        return {
          ...doc,
          score: (doc.score || 0) + boost,
        };
      })
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // -----------------------------
  // CONFIDENCE SCORE
  // -----------------------------
  private confidence(docs: KBDoc[]) {
    if (!docs.length) return 0;
    const max = Math.max(...docs.map((d) => d.score || 0));
    return Math.min(1, Math.max(0, max));
  }

  // -----------------------------
  // TRIM KB CONTEXT
  // -----------------------------
  private buildContext(docs: KBDoc[], limit = 2500) {
    let final = "";
    for (const d of docs) {
      const block = `${d.metadata?.title || ""}\n${d.content}\n---\n`;
      if (final.length + block.length > limit) break;
      final += block;
    }
    return final;
  }

  // -----------------------------
  // SAFE JSON PARSER
  // -----------------------------
  private safeParse(text: string) {
    try {
      const start = text.indexOf("{");
      if (start === -1) return null;
      return JSON.parse(text.slice(start));
    } catch {
      return null;
    }
  }

  // =====================================================================
  //                         MAIN RAG ENGINE
  // =====================================================================
  async generateResponse(userId: string, query: string, topic: string) {
    // 1) Memory
    const mem = await this.memory.getMemory(userId);

    const short = mem.shortTerm.map((m) => m.text).join(" | ");
    const long = mem.longTerm.map((m) => m.text).join(" | ");

    // 2) Embed expanded query
    const expanded = this.expandQuery(query).join(" ");
    const embed = await EmbedText(expanded);

    // 3) Vector search
    const raw = await this.vector.findSimilar(embed, this.TOP_K, 0.2);
    const docs: KBDoc[] = raw.map((r) => ({
      _id: r._id,
      content: r.content,
      metadata: r.metadata,
      score: r.score,
    }));

    // 4) Re-rank
    const reranked = this.rerank(docs, query, topic);

    // 5) Confidence
    const confidence = this.confidence(reranked);

    // 6) Hallucination check
    if (!reranked.length || confidence < this.HALLUCINATION_THRESHOLD) {
      await this.memory.addShortTerm(userId, `User: ${query}`);
      return {
        answer: "I do not have this information yet in the PropScholar knowledge base.",
        confidence,
        usedDocs: []
      };
    }

    // 7) Build KB context
    const kbContext = this.buildContext(reranked);

    // 8) System instructions
    const systemPrompt = `
You are PropScholar AI. 
Use ONLY the KB context. No hallucinations.
Return JSON: { "analysis": "...", "answer": "..." }
Tone: short, clean, professional.
    `;

    const userMessage = `
User Query: ${query}

Detected Topic: ${topic}

Short-term memory: ${short || "none"}
Long-term memory: ${long || "none"}

KB Context:
${kbContext}
    `;

    // 9) LLM call
    let final = "";
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0.0,
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const rawText = completion.choices[0].message.content;
      const parsed = this.safeParse(rawText);

      final = parsed?.answer || rawText.trim();
    } catch (err) {
      console.error("RAG LLM error:", err);
      final = "Internal AI error. Try again.";
    }

    // 10) Save memory
    await this.memory.addShortTerm(userId, `User: ${query}`);
    await this.memory.addShortTerm(userId, `Bot: ${final}`);

    return {
      answer: final,
      confidence,
      usedDocs: reranked.slice(0, 5),
    };
  }
}
