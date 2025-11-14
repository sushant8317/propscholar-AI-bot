// src/services/rag.service.ts

import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";   // FIXED name
import { Knowledge } from "../models/knowledge.model";

export class RAGService {
  private vector = new VectorService();

  // Main function: generate answer using RAG
  async generateResponse(query: string) {
    try {
      const embedding = await EmbedText(query);   // FIXED name

      const similar = await this.vector.findSimilar(embedding, 5, 0.55);

      if (!similar || similar.length === 0) {
        return {
          answer: null,
          confidence: 0
        };
      }

      // Combine answers
      const combined = similar
        .map((i: any) => i.content)
        .join("\n\n");

      return {
        answer: combined,
        confidence: similar[0].score
      };

    } catch (err) {
      console.error("RAG ERROR:", err);
      return { answer: null, confidence: 0 };
    }
  }
}
