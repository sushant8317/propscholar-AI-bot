
import { MemoryService } from "./memory.service";
import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";

export class RAGService {
  private vector = new VectorService();
  private memory = new MemoryService();
  private convo = new ConversationMemoryService();

  private behaviourPrompt = `
You are Scholaris AI, PropScholar’s support agent.
Use short sentences. Be direct. Be polite.
Always stay inside PropScholar rules, models and payout structure.
Never guess forex.
`;

  private SYNONYMS = {
    plus: ["plus", "holding", "1-step"],
    standard: ["standard", "consistency"],
    daily: ["daily loss"],
    max: ["max loss"],
    payout: ["withdraw", "scholarship"],
  };

  private expandQuery(q: string) {
    const base = q.toLowerCase();
    const expanded = [base];

    for (const k in this.SYNONYMS) {
      if (base.includes(k)) expanded.push(...this.SYNONYMS[k]);
    }
    return expanded;
  }

  async generate(userId: string, query: string) {
    // Save to conversation memory
    await this.convo.add(userId, query);

    const shortTerm = await this.convo.get(userId);
    const longTerm = await this.memory.getContext(userId);

    const expanded = this.expandQuery(query);

    const embed = await EmbedText(query);
    const similar = await this.vector.findSimilar(embed, 5, 0.40);

    let combined = similar?.map(x => x.content).join("\n") || "No KB match";

    return {
      behaviour: this.behaviourPrompt,
      shortTerm,
      longTerm,
      knowledge: combined,
    };
  }
}
