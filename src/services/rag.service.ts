// src/services/rag.service.ts

import OpenAI from "openai";
import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";
import { MemoryService } from "./memory.service";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type KBDoc = {
  _id?: string;
  content?: string;
  embedding?: number[];
  metadata?: any;
  score?: number;
};

export class RAGService {
  private vector = new VectorService();
  private memory = new MemoryService();

  private TOP_K = 8;
  private HALLUCINATION_THRESHOLD = 0.40;

  // extra boost based on topic
  private TOPIC_MAP: Record<string, number> = {
    "daily-drawdown": 0.30,
    "max-loss": 0.25,
    "payouts": 0.20,
    "plus-model": 0.18,
    "ufm": 0.25,
    "news-trading": 0.20,
    "consistency": 0.22,
    "general": 0.00,
  };

  private expandQuery(q: string): string[] {
    const s = q.toLowerCase();
    const out = [s];

    const synonyms: any = {
      plus: ["1 step", "1-step", "2 step", "plus-model"],
      daily: ["daily loss", "ddl", "daily drawdown"],
      payout: ["withdraw", "payout", "profit split"],
      ufm: ["unfair means", "tick scalping"],
    };

    for (const k in synonyms) {
      if (s.includes(k)) out.push(...synonyms[k]);
    }

    return [...new Set(out)];
  }

  private rerank(docs: KBDoc[], query: string, topic: string): KBDoc[] {
    const q = query.toLowerCase();
    const topicBoost = this.TOPIC_MAP[topic] || 0;

    return docs
      .map((d) => {
        let boost = 0;
        const content = d.content?.toLowerCase() || "";

        if (d.metadata?.category === topic) boost += topicBoost;

        if (content.includes(q)) boost += 0.05;

        return { ...d, score: (d.score || 0) + boost };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  private buildContext(docs: KBDoc[], limit = 2500) {
    let final = "";
    for (const d of docs) {
      const block = `${d.metadata?.title || ""}\n${d.content}\n---\n`;
      if (final.length + block.length > limit) break;
      final += block;
    }
    return final;
  }

  private safeJson(text: string) {
    try {
      const start = text.indexOf("{");
      if (start < 0) return null;
      return JSON.parse(text.slice(start));
    } catch {
      return null;
    }
  }

  // ---------------------------
  // MAIN RAG RESPONSE
  // ---------------------------
  async generateResponse(userId: string, query: string) {
    const mem = await this.memory.getMemory(userId);
    const topic = mem.currentTopic || "general";

    const expanded = this.expandQuery(query).join(" ");
    const qEmbed = await EmbedText(expanded);

    const raw = await this.vector.findSimilar(qEmbed, this.TOP_K, 0.20);
    const docs: KBDoc[] = raw.map((r: any) => ({
      _id: r._id,
      content: r.content,
      metadata: r.metadata,
      score: r.score,
    }));

    const ranked = this.rerank(docs, query, topic);

    const topScore = Math.max(...ranked.map((x) => x.score || 0));
    const confidence = topScore > 1 ? 1 : topScore < 0 ? 0 : topScore;

    if (confidence < this.HALLUCINATION_THRESHOLD) {
      return { answer: "I do not have this information in the knowledge base.", confidence };
    }

    const kbContext = this.buildContext(ranked);

    const systemPrompt = `
You are PropScholar AI. 
Follow these rules:
- Use ONLY the KB context.
- Never invent any rule.
- Answer cleanly, short, and professional.
Return JSON: { "analysis": "...", "answer": "..." }
    `;

    const userPrompt = `
User Query: ${query}
Detected Topic: ${topic}

KB Context:
${kbContext}
    `;

    let out = "";
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4.1",
        temperature: 0.0,
        max_tokens: 700,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const rawText = completion.choices[0].message.content || "";
      const parsed = this.safeJson(rawText);

      out = parsed?.answer || rawText;
    } catch (err) {
      console.error("RAG ERROR:", err);
      out = "Internal RAG error.";
    }

    await this.memory.addShortTerm(userId, `User: ${query}`);
    await this.memory.addShortTerm(userId, `Bot: ${out}`);

    return { answer: out, confidence };
  }
}
