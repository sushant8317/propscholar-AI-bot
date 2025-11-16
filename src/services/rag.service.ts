// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";
import { MemoryService } from "./memory.service";

export class RAGService {
  private vector = new VectorService();
  private memory = new MemoryService();

  private behaviourPrompt = `
You are PropScholar Support.
Explain strictly using PropScholar rules, models, payouts and policies.
Short sentences. Friendly tone. Human-like.
Always stay inside PropScholar context.
  `;

  // ----------------------------------------
  // SYNONYM EXPANSION
  // ----------------------------------------
  private SYNONYMS: Record<string, string[]> = {
    plus: ["plus", "1-step", "2-step", "profitable", "holding"],
    standard: ["standard", "consistency"],
    daily: ["daily loss", "ddl"],
    max: ["max loss"],
    payout: ["scholarship", "withdraw"],
    ufm: ["unfair means", "tick scalping"],
  };

  private expandQuery(q: string): string[] {
    const base = q.toLowerCase();
    const expanded = [base];

    for (const key in this.SYNONYMS) {
      if (base.includes(key)) expanded.push(...this.SYNONYMS[key]);
    }
    return expanded;
  }

  // ----------------------------------------
  // MAIN RAG ENGINE
  // ----------------------------------------
  async generateResponse(userId: string, query: string) {
    // 1️⃣ MEMORY FETCH
    const mem = await this.memory.getMemory(userId);

    // FIX: longTerm is array of objects
    const longTermText =
      mem.longTerm && mem.longTerm.length > 0
        ? mem.longTerm.map((m: any) => m.text).join(" | ")
        : "none";

    const memoryContext =
      "Short-term: " +
      mem.shortTerm.map((m: any) => m.text).join(" | ") +
      "\nLong-term: " +
      longTermText;

    // 2️⃣ SYNONYM EXPANSION
    const expandedQuery = this.expandQuery(query).join(" ");

    // 3️⃣ EMBEDDING
    const embedding = await EmbedText(expandedQuery);

    // 4️⃣ VECTOR SEARCH
    const results = await this.vector.findSimilar(embedding, 5, 0.40);

    let combined = "";
    let confidence = 0;

    if (results && results.length > 0) {
      combined = results
        .map((r: any) => r?.content || "")
        .filter(Boolean)
        .join("\n");

      confidence = results[0].score || 0;
    }

    // 5️⃣ FINAL OUTPUT
    return {
      answer: combined || "No matching PropScholar rule found.",
      behaviour: this.behaviourPrompt,
      memory: memoryContext,
      confidence,
    };
  }
}
