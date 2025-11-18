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
  metadata?: Record<string, any>;
  score?: number;
};

export class RAGService {
  private vector = new VectorService();
  private memory = new MemoryService();

  // Rules used for re-ranking (category boosts, keyword boosts)
  private RULE_BOOSTS: Array<{ keyword: string; category?: string; boost: number }> = [
    { keyword: "daily", category: "rules", boost: 0.20 },
    { keyword: "daily drawdown", category: "rules", boost: 0.30 },
    { keyword: "max loss", category: "rules", boost: 0.25 },
    { keyword: "maximum loss", category: "rules", boost: 0.25 },
    { keyword: "payout", category: "payout", boost: 0.20 },
    { keyword: "withdraw", category: "payout", boost: 0.20 },
    { keyword: "plus", category: "plus-model", boost: 0.18 },
    { keyword: "1-step", category: "plus-model", boost: 0.18 },
    { keyword: "unfair means", category: "ufm-rules", boost: 0.25 },
    { keyword: "tick scalping", category: "ufm-rules", boost: 0.25 },
  ];

  // minimum confidence threshold below which we refuse to answer and fallback
  private HALLUCINATION_THRESHOLD = 0.40;

  // How many docs to retrieve and pass to the model
  private TOP_K = 8;

  private expandQuery(q: string): string[] {
    const base = q.toLowerCase();
    const res = [base];

    // expand with simple synonyms — keeps things robust
    const synonyms: Record<string, string[]> = {
      plus: ["1-step", "2-step", "plus-model"],
      daily: ["daily loss", "ddl", "daily drawdown"],
      payout: ["withdraw", "payout", "scholarship"],
      ufm: ["unfair means", "tick scalping"],
    };

    for (const k in synonyms) {
      if (base.includes(k)) res.push(...synonyms[k]);
    }

    return Array.from(new Set(res));
  }

  // Re-rank vector results using rule-based boosts and exact matches
  private rerankResults(results: KBDoc[], query: string): KBDoc[] {
    const q = query.toLowerCase();

    // apply boosts
    const boosted = results.map((doc) => {
      let boost = 0;

      const category = (doc.metadata && doc.metadata.category) || "";
      const content = (doc.content || "").toLowerCase();

      // rule boosts from configuration
      for (const rule of this.RULE_BOOSTS) {
        if (q.includes(rule.keyword)) {
          // category match gives extra boost
          if (rule.category && category === rule.category) {
            boost += rule.boost + 0.10; // stronger if category matches
          } else if (content.includes(rule.keyword)) {
            boost += rule.boost;
          }
        }
      }

      // exact keyword match in content: big bump
      const queryTokens = q.split(/\s+/).filter(Boolean);
      for (const t of queryTokens) {
        if (t.length > 3 && content.includes(t)) {
          boost += 0.05;
        }
      }

      // prefer recent/updated docs slightly if metadata has updatedAt
      const updatedAt = doc.metadata?.updatedAt ? new Date(doc.metadata.updatedAt).getTime() : 0;
      const now = Date.now();
      if (updatedAt && now - updatedAt < 1000 * 60 * 60 * 24 * 365) {
        // updated within a year
        boost += 0.02;
      }

      return {
        ...doc,
        score: (doc.score || 0) + boost,
      };
    });

    return boosted.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  // Normalize scores to [0,1] for a confidence estimate
  private computeConfidence(docs: KBDoc[]): number {
    if (!docs || docs.length === 0) return 0;
    const maxScore = Math.max(...docs.map((d) => d.score || 0));
    // if negative or zero, return 0
    if (!maxScore || maxScore <= 0) return 0;
    // scale top score between 0-1, clamp
    const conf = Math.min(1, Math.max(0, maxScore));
    return Number(conf.toFixed(2));
  }

  // Build a compact KB context to send to the model (limit total size)
  private buildKbContext(docs: KBDoc[], charLimit = 2400): string {
    const chunks: string[] = [];
    let used = 0;
    for (const d of docs) {
      const content = d.content?.trim() || "";
      const metaTitle = d.metadata?.title ? `Title: ${d.metadata.title}\n` : "";
      const block = `${metaTitle}${content}\n---\n`;
      if (used + block.length > charLimit) break;
      chunks.push(block);
      used += block.length;
    }
    return chunks.join("\n");
  }

  // Parse model output which we ask to return as JSON { analysis: string, answer: string }
  private safeParseJson(text: string): { analysis?: string; answer?: string } | null {
    try {
      const trimmed = text.trim();
      // sometimes model returns JSON wrapped in triple backticks or with surrounding text
      const jsonStart = trimmed.indexOf("{");
      const jsonStr = jsonStart >= 0 ? trimmed.slice(jsonStart) : trimmed;
      const parsed = JSON.parse(jsonStr);
      if (parsed && (parsed.answer || parsed.analysis)) return parsed;
      return null;
    } catch (err) {
      return null;
    }
  }

  // ----------------------------------------
  // MAIN RAG ENGINE — upgraded with reason chain and reranking
  // ----------------------------------------
  async generateResponse(userId: string, query: string) {
    // 1️⃣ Fetch memory
    const mem = await this.memory.getMemory(userId);
    const shortTerm = mem.shortTerm?.map((m: any) => m.text).join(" | ") || "";
    const longTerm = mem.longTerm?.map((m: any) => m.text).join(" | ") || "";

    // 2️⃣ Expand query and embed
    const expanded = this.expandQuery(query).join(" ");
    const queryEmbedding = await EmbedText(expanded);

    // 3️⃣ Retrieve top-K vector docs
    const rawResults = await this.vector.findSimilar(queryEmbedding, this.TOP_K, 0.20);
    const docs: KBDoc[] = (rawResults || []).map((r: any) => ({
      _id: r._id,
      content: r.content,
      embedding: r.embedding,
      metadata: r.metadata,
      score: r.score || 0,
    }));

    // 4️⃣ Rerank using PropScholar rules
    const reranked = this.rerankResults(docs, query);

    // 5️⃣ Compute confidence
    const confidence = this.computeConfidence(reranked);

    // 6️⃣ Hallucination guard: if no docs or low confidence, return safe fallback
    if (!reranked || reranked.length === 0 || confidence < this.HALLUCINATION_THRESHOLD) {
      // still save short-term memory of the question
      await this.memory.addShortTerm(userId, `User: ${query}`);
      return {
        answer: "I do not have this information yet in the PropScholar knowledge base.",
        confidence,
        usedDocs: [],
      };
    }

    // 7️⃣ Build KB context text (compact)
    const kbContext = this.buildKbContext(reranked, 2800);

    // 8️⃣ Build the system prompt with style consistency + instruction for reason chain
    const systemPrompt = `
You are PropScholar AI, the official support assistant for PropScholar.

Rules:
- Use ONLY the information present in the provided KB Context or the user's memory.
- Do NOT invent or hallucinate any rule. If the KB does not support a statement, say "I do not have this information yet in the PropScholar knowledge base."
- Produce two outputs in JSON: { "analysis": "<brief internal reasoning>", "answer": "<final user-facing answer>" }.
- The "analysis" is internal reasoning and should be concise (1-3 short bullets). The "answer" should be a clean, user-facing paragraph or short list.
- Tone: friendly, professional, crisp. No emojis. Keep sentences short.
- When citing a rule, prefer exact wording and title from KB if present.
`;

    // 9️⃣ Build user message that includes memory and KB context
    const userMessage = `
User Query: ${query}

Short-term memory: ${shortTerm || "none"}
Long-term memory: ${longTerm || "none"}

KB Context (selected documents):
${kbContext}

Instructions:
- Use the KB Context and memory only.
- If the KB is unclear or does not explicitly answer, reply with the safe fallback message.
- Return JSON exactly as specified.
`;

    // 10️⃣ Ask the model to generate analysis + final answer (reason chain)
    let finalAnswer = "";
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.0, // deterministic
        max_tokens: 800,
      });

      const raw = completion.choices?.[0]?.message?.content ?? "";
      const parsed = this.safeParseJson(raw);

      if (parsed && parsed.answer) {
        finalAnswer = parsed.answer.trim();
      } else {
        // fallback: try to extract last JSON object if model returned noisy text
        finalAnswer = raw.trim();
      }
    } catch (err) {
      console.error("RAG — LLM error:", err);
      // save memory and return safe fallback
      await this.memory.addShortTerm(userId, `User: ${query}`);
      return {
        answer: "Internal LLM error. Try again later.",
        confidence: confidence,
        usedDocs: reranked.slice(0, 3).map((d) => ({ id: d._id, title: d.metadata?.title })),
      };
    }

    // 11️⃣ Post-check: Ensure finalAnswer does not hallucinate by scanning for unsupported claims
    // Simple sanity: if finalAnswer contains words like "always", "never" — check if KB supports them
    const lowerAnswer = finalAnswer.toLowerCase();
    const riskyTokens = ["always", "never", "guarantee", "guaranteed"];
    const riskyPresent = riskyTokens.some((t) => lowerAnswer.includes(t));
    if (riskyPresent && confidence < 0.8) {
      // weaken the claim or give fallback
      finalAnswer = finalAnswer + "\n\nNote: This answer is based on limited KB context. Please verify with PropScholar official documentation.";
    }

    // 12️⃣ Save short-term memory (question + answer)
    await this.memory.addShortTerm(userId, `User: ${query}`);
    await this.memory.addShortTerm(userId, `Bot: ${finalAnswer}`);

    // 13️⃣ Return final structured response
    return {
      answer: finalAnswer,
      confidence,
      usedDocs: reranked.slice(0, 5).map((d) => ({
        id: String(d._id || ""),
        title: d.metadata?.title || "",
        score: Number(d.score || 0),
      })),
    };
  }
}
