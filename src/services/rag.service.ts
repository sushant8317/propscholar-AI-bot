// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";
import { MemoryService } from "./memory.service";

export class RAGService {
  private vector = new VectorService();
  private memory = new MemoryService();

  private behaviourPrompt = `
You are PropScholar Support.
Explain answers strictly using PropScholar rules, models, payouts and policies.
Short sentences. Friendly tone. Human-like.
Always stay inside PropScholar context.
  `;

  // Synonym expansion
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
      if (base.includes(key)) {
        expanded.push(...this.SYNONYMS[key]);
      }
    }
    return expanded;
  }

  // MAIN RAG FUNCTION
  async generateResponse(userId: string, query: string) {
    // 1️⃣ Memory handling
    const mem = await this.memory.getMemory(userId);

    const memoryContext =
      "Short-term: " +
      mem.shortTerm.map((m: any) => m.text).join(" | ") +
      "\nLong-term: " +
      (mem.longTerm?.join(", ") || "none");

    // 2️⃣ Expand synonyms
    const expandedQueryParts = this.expandQuery(query);
    const expandedQuery = expandedQueryParts.join(" ");

    // 3️⃣ Embedding
    const embedding = await EmbedText(expandedQuery);

    // 4️⃣ RAG vector search
    const results = await this.vector.findSimilar(embedding, 5, 0.40);

    let combined = "";
    let confidence = 0;

    if (results && results.length > 0) {
      combined = results.map((r) => r.content).join("\n");
      confidence = results[0].score;
    }

    // 5️⃣ Return unified RAG package
    return {
      answer: combined || "No matching PropScholar rule found.",
      behaviour: this.behaviourPrompt,
      memory: memoryContext,
      confidence,
    };
  }
}
