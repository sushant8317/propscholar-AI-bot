// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";
import { MemoryService } from "./memory.service";

export class RAGService {
  private vector = new VectorService();
  private memory = new MemoryService();

  // Behaviour tone
  private behaviourPrompt = `
You are PropScholar Support.
Explain answers strictly using PropScholar rules, models, payouts and policies.
Short sentences. Friendly tone. Human-like.
Always stay inside PropScholar context.
  `;

  // Synonym map
  private SYNONYMS: Record<string, string[]> = {
    plus: ["plus", "1-step", "2-step", "holding", "profitable"],
    standard: ["standard", "consistency"],
    daily: ["daily loss", "ddl", "intraday"],
    max: ["max loss", "maximum loss"],
    payout: ["scholarship", "withdraw", "cashout"],
  };

  // expand synonyms
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

  // 🔥 MAIN FUNCTION USED IN INDEX.TS
  async generateResponse(userId: string, query: string) {
    // user memory
    const memoryContext = await this.memory.getContext(userId);

    // expand query
    const expanded = this.expandQuery(query);

    // RAG search
    const embedding = await EmbedText(query);
    const similar = await this.vector.findSimilar(embedding, 5, 0.40);

    let combined = "";
    let confidence = 0;

    if (similar?.length) {
      const best = similar[0];
      combined = similar.map((s) => s.content).join("\n\n");
      confidence = best.score;
    }

    return {
      answer: combined,
      memory: memoryContext,
      behaviour: this.behaviourPrompt,
      confidence,
    };
  }
}
