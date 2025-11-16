// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";

export class RAGService {
  private vector = new VectorService();

  // HUMAN SUPPORT TONE + STRICT PROPSCHOLAR CONTEXT
  private behaviourPrompt = `
You are PropScholar Support.
Always answer strictly based on PropScholar rules, models, payouts, drawdown limits, and trading requirements.
Speak like a human moderator — short sentences, clear, friendly, no robotic tone.
Never answer general forex questions. Always assume the question is about PropScholar.
Your reply format:
1. Short direct answer
2. Simple explanation
3. Offer help or next step
  `;

  // SMART SYNONYM MAP FOR BETTER MATCHING
  private SYNONYMS: Record<string, string[]> = {
    "plus": ["plus", "1-step", "2-step", "holding time", "profitable days", "2 minutes"],
    "standard": ["standard", "consistency", "45%", "consistency rule"],
    "daily": ["daily loss", "ddl", "intraday loss", "daily drawdown"],
    "max": ["max loss", "maximum loss", "overall loss", "total loss"],
    "profit": ["target", "profit target", "percentage", "goal"],
    "phase": ["phase 1", "phase 2", "step", "phase"],
    "ufm": ["unfair means", "forbidden", "tick scalping", "toxic"],
    "payout": ["scholarship", "withdrawal", "cashout", "payout"],
  };

  // EXPAND QUERY WITH SYNONYMS TO BOOST MATCHING
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

      // Slightly lower threshold → more flexible
      const similar = await this.vector.findSimilar(embedding, 5, 0.40);

      let combined = "";
      let confidence = 0;

      if (similar && similar.length > 0) {
        const best = similar[0];
        const lower = best.content.toLowerCase();

        // BOOST CONFIDENCE BASED ON SYNONYM OVERLAP
        for (const term of expanded) {
          if (lower.includes(term)) confidence += 0.15;
        }

        combined = similar.map((i: any) => i.content).join("\n---\n");
        confidence = Math.min(1, best.score + confidence);
      }

      // LOW CONFIDENCE → RETURN STRONG BASELINE PROPSCHOLAR SUMMARY
      if (!combined || confidence < 0.35) {
        combined = `
Here is the closest PropScholar explanation:

• PropScholar offers 4 models: Plus 1-Step, Plus 2-Step, Standard 1-Step, Standard 2-Step  
• Plus models → No consistency rule, but have 2-minute average holding time + 3 profitable days  
• Standard models → No holding time, no profitable day requirement, but have 45% consistency rule  
• Daily Loss resets every day at 00:00 UTC  
• Maximum Loss is 6% or 8% depending on the model  
• News trading allowed in all models  
• Payouts (scholarships) processed within 4 hours after verification  

You may ask things like:
"max loss?", "daily loss?", "plus rules?", "standard rules?", "consistency?", "payout?", "holding time?"  
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
        answer: "There was a technical issue while retrieving PropScholar information.",
        behaviour: this.behaviourPrompt,
        confidence: 0
      };
    }
  }
}
