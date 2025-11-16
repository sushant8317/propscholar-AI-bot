// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";

export class RAGService {
  private vector = new VectorService();

  // Tone & speaking style
  private behaviourPrompt = `
You are PropScholar Support.
Always explain answers strictly using PropScholar rules, models, payouts, risk limits, and definitions.
Speak like a human moderator — short sentences, friendly tone.
Your reply format:
1. Short direct answer
2. Simple explanation
3. Offer help or next step
Never give general forex knowledge. Always answer in PropScholar context only.
  `;

  // Synonym expansion for better understanding
  private SYNONYMS: Record<string, string[]> = {
    "plus": ["plus", "1-step", "2-step", "holding", "profitable", "2 minutes"],
    "standard": ["standard", "consistency", "45%", "1-step", "2-step"],
    "daily": ["daily loss", "ddl", "drawdown", "intraday loss", "day loss"],
    "max": ["max loss", "maximum loss", "total loss", "overall loss"],
    "profit": ["profit target", "target", "percentage", "goal"],
    "phase": ["phase 1", "phase 2", "phase1", "phase2", "step"],
    "ufm": ["tick scalping", "unfair means", "forbidden", "toxic", "hft"],
    "payout": ["scholarship", "payment", "withdraw", "cashout", "payout"],
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

  async generateResponse(query: string) {
    try {
      const expandedQueryTerms = this.expandQuery(query);
      const embedding = await EmbedText(query);
      const similar = await this.vector.findSimilar(embedding, 5, 0.40); // lower threshold = smarter matching

      let combinedAnswers = "";
      let confidence = 0;

      if (similar && similar.length > 0) {
        const best = similar[0];
        const blockLower = best.content.toLowerCase();

        for (const term of expandedQueryTerms) {
          if (blockLower.includes(term)) {
            confidence += 0.15;
          }
        }

        combinedAnswers = similar
          .map((i: any) => i.content)
          .join("\n\n");

        confidence = Math.min(1, best.score + confidence);
      }

      // Fallback for questions not in KB
      if (!combinedAnswers || confidence < 0.35) {
        combinedAnswers = `
I couldn't find an exact match, but here is a PropScholar rules summary:

• PropScholar has 4 models: Plus 1-Step, Plus 2-Step, Standard 1-Step, Standard 2-Step  
• Plus = no consistency rule, but has 2-minute holding + 3 profitable days  
• Standard = no holding time, but has 45% consistency rule  
• Daily Loss resets at 00:00 UTC  
• Maximum Loss is 6% or 8% depending on model  
• News trading allowed  
• Scholarship/payout processed within 4 hours  

Ask me anything like:
"daily loss?", "max loss?", "plus rules?", "standard rules?", "payout?", "consistency?", "holding time?"
        `;
        confidence = 0.30;
      }

      return {
        answer: combinedAnswers,
        behaviour: this.behaviourPrompt,
        confidence,
      };
    } catch (err) {
      console.error("RAG ERROR:", err);

      return {
        answer: "There was a technical issue. Please try again.",
        behaviour: this.behaviourPrompt,
        confidence: 0,
      };
    }
  }
}
