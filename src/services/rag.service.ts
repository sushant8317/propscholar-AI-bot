// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";
import { Knowledge } from "../models/knowledge.model";

export class RAGService {
  private vector = new VectorService();

  // Human behaviour prompt (no rules, only tone)
  private behaviourPrompt = `
You are PropScholar Support.
Speak like a human moderator: calm, friendly, clear and conversational.
Do not sound robotic. Use short sentences.
Explain things simply. If unclear, ask the user to clarify.
Never guess. Never write long essays.
Talk like you're chatting with a trader in real life.
Stay respectful even if the user is angry.
Your response format:
1. Short direct reply
2. Simple explanation
3. Offer help or next step
  `;

  // Main function: generate answer using RAG
  async generateResponse(query: string) {
    try {
      const embedding = await EmbedText(query);

      const similar = await this.vector.findSimilar(embedding, 5, 0.55);

      let combined = "";
      let confidence = 0;

      if (!similar || similar.length === 0) {
        combined = "";
        confidence = 0;
      } else {
        combined = similar.map((i: any) => i.content).join("\n\n");
        confidence = similar[0].score;
      }

      // Return both:
      // - behaviour prompt
      // - RAG context
      return {
        behaviour: this.behaviourPrompt,
        context: combined,
        confidence
      };

    } catch (err) {
      console.error("RAG ERROR:", err);
      return {
        behaviour: this.behaviourPrompt,
        context: "",
        confidence: 0
      };
    }
  }
}
