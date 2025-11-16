// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";

export class RAGService {
  private vector = new VectorService();

  // Tone & Speaking Style
  private behaviourPrompt = `
You are PropScholar Support.
Always explain answers strictly using PropScholar rules, models, payouts, and definitions.
Speak like a human moderator, not a robot.
Your reply format:
1. Short direct answer
2. Simple explanation
3. Offer help or next step
Never give general forex knowledge. Always assume the question is about PropScholar.
  `;

  // 🔥 SYNONYMS FOR SMART MATCHING
  private SYNONYMS: Record<string, string[]> = {
    "plus": ["plus", "1-step", "2-step", "holding", "profitable", "2 minutes"],
    "standard": ["standard", "consistency", "45%", "1-step", "2-step"],
    "daily": ["daily loss", "ddl", "drawdown", "intraday loss"],
    "max": ["max loss", "maximum loss", "total loss", "overall loss"],
    "profit": ["profit target", "target", "percentage", "goal"],
    "phase": ["phase 1", "phase2", "phase 2", "step"],
    "ufm": ["tick scalping", "unfair means", "forbidden", "toxic"],
    "payout": ["scholarship", "payment", "withdraw", "cashout"],
  };

  // 🔥 EXPAND USER QUERY USING SYNONYMS
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
      const expanded = this.expandQuery(query);
      const embedding = await EmbedText(query);
      const similar = await this.vector.findSimilar(embedding, 5, 0.40); // more forgiving

      let combined = "";
      let confidence = 0;

      if (similar && similar.length > 0) {
        // 🔥 BOOST MATCH SCORE IF KEYWORDS OVERLAP
        const best = similar[0];
        const textLower = best.content.toLowerCase();

        for (const term of expanded) {
          if (textLower.includes(term)) confidence += 0.15;
        }

        combined = similar.map((i: any) => i.content).join("\n\n");
        confidence = Math.min(1, best.score + confidence);
      }

      // 🔥 IF NO MATCH — ALWAYS RETURN STRONG PROP-SCHOLAR ANSWER
      if (!combined || confidence < 0.35) {
        combined = `
I couldn’t find an exact match, but here is the closest PropScholar explanation:

• PropScholar has 4 evaluation models (Plus 1-Step, Plus 2-Step, Standard 1-Step, Standard 2-Step)  
• Plus = no consistency rule, but has 2-minute average holding time + 3 profitable days  
• Standard = no holding time, no profitable days, but has 45% consistency  
• Daily Loss resets at 00:00 UTC  
• Maximum Loss is 6% or 8% depending on model  
• News trading allowed  
• Scholarship payout within 4 hours after passing  

Ask anything like:
“max loss?”, “daily loss?”, “plus details?”, “standard?”, “consistency?”, “payout?”, “holding time?”
        `;
        confidence = 0.30;
      }

      return {
        answer: combined,
        behaviour: this.behaviourPrompt,
        confidence
      };

    } catch (err) {
      console.error("RAG ERROR:", err);

      return {
        answer: "There was a technical issue, try again.",
        behaviour: this.behaviourPrompt,
        confidence: 0
      };
    }
  }
}
