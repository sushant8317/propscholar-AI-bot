// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";

export class RAGService {
  private vector = new VectorService();

  // Human behaviour prompt (tone only, no rules)
  private behaviourPrompt = `
You are PropScholar Support.
Speak like a human moderator. Keep your tone friendly, short, clear, and natural.
Do not sound robotic. Use short sentences.
Explain things simply. If you are unsure, ask the user to clarify.
Never guess. Stay calm even if the user is angry.
Your reply format should be:
1. Short direct answer
2. Simple explanation
3. Offer help or next step
  `;

  async generateResponse(query: string) {
    try {
      const embedding = await EmbedText(query);
      const similar = await this.vector.findSimilar(embedding, 5, 0.55);

      let combined = "";
      let confidence = 0;

      if (similar && similar.length > 0) {
        combined = similar.map((i: any) => i.content).join("\n\n");
        confidence = similar[0].score;
      }

      // Return using OLD KEYS + new behaviour (NO ERROR)
      return {
        answer: combined,          // keeps index.ts working
        behaviour: this.behaviourPrompt,
        confidence: confidence
      };

    } catch (err) {
      console.error("RAG ERROR:", err);

      return {
        answer: "",
        behaviour: this.behaviourPrompt,
        confidence: 0
      };
    }
  }
}
