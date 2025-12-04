// src/services/rag.service.ts

import OpenAI from "openai";
import { VectorService } from "./vector.service";
import { EmbedText } from "./embedding.service";
import { MemoryService } from "./memory.service";
import { TopicService } from "./topic.service";

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
  private topics = new TopicService();

  private HALLUCINATION_THRESHOLD = 0.25;
  private TOP_K = 12;
  private MAX_SHORT_TERM_TOKENS = 1800; // soft limit of tokens worth of text before summarization
  private MAX_SHORT_ENTRIES = 12; // number of raw entries to consider before summarizing
  private SUMMARY_TRIGGER_LENGTH = 800; // characters threshold to request a summary
  private SUMMARY_MODEL = "gpt-4.1-mini";

  // create expanded synonyms set
  private expandQuery(q: string): string[] {
    const base = q.toLowerCase();
    const res = [base];

    const synonyms: Record<string, string[]> = {
      plus: ["plus model", "ps plus", "one step", "one step model", "instant funding", "no consistency rule"],
      daily: ["daily dd", "daily drawdown", "maximum daily loss", "daily limit", "dmax", "dd"],
      payout: ["withdraw", "withdrawal", "payout schedule", "profit split", "payouts"],
      ufm: ["unfair means", "unfair practices", "tick scalping", "signal trading", "copying signals"],
      drawdown: ["dd", "maximum loss", "loss limit", "risk limit", "overall drawdown"],
      rules: ["evaluation rules", "prop rules", "firm rules", "eligibility rules"],
      profit: ["target", "profit target", "pass criteria"],
      stop: ["halt", "freeze", "locked", "unable to trade"]
    };

    for (const key in synonyms) {
      if (base.includes(key)) res.push(...synonyms[key]);
    }

    return Array.from(new Set(res));
  }

  private rerankByTopic(docs: KBDoc[], topic: string): KBDoc[] {
    if (!topic || topic === "general") return docs;

    return docs.map((d) => {
      const cat = (d.metadata?.category || "").toLowerCase();
      let boost = 0;
      if (cat.includes(topic.toLowerCase())) boost += 0.4;
      return { ...d, score: (d.score || 0) + boost };
    });
  }

  private computeConfidence(docs: KBDoc[]): number {
    if (docs.length === 0) return 0;
    const max = Math.max(...docs.map((d) => d.score || 0));
    if (max <= 0) return 0;
    return Number(Math.min(1, max).toFixed(2));
  }

  private safeParseJson(text: string | null): { analysis?: string; answer?: string } | null {
    if (!text) return null;
    try {
      const trimmed = text.trim();
      const start = trimmed.indexOf("{");
      const jsonStr = start >= 0 ? trimmed.slice(start) : trimmed;
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  private shouldClarify(query: string, confidence: number): boolean {
    const ambiguous = ["it", "that", "this", "here", "there", "which one", "what do you mean"];
    const isAmbiguous = ambiguous.some((word) => query.toLowerCase().includes(word));
    return isAmbiguous && confidence < 0.45;
  }

  private inferPossibleTopics(query: string): string[] {
    const patterns: Record<string, string[]> = {
      "phase": ["phase", "phase 1", "phase 2", "examinee", "scholar"],
      "loss": ["daily loss", "maximum loss", "stop out", "max loss"],
      "profit": ["profit target", "target", "profitability"],
      "holding": ["holding time", "average hold", "hold time"]
    };
    return Object.entries(patterns)
      .filter(([keyword]) => query.toLowerCase().includes(keyword) || query.toLowerCase().includes(keyword.replace(" ", "")))
      .flatMap(([, topics]) => topics);
  }

  // quick heuristic to remove noise entries from short term memory
  private filterShortEntries(entries: Array<any>): Array<any> {
    const noisePatterns = [/^ok\b/i, /^thanks?\b/i, /^ty\b/i, /^\.\.\./, /^typing/i, /^seen\b/i];
    return entries.filter((e) => {
      if (!e || !e.text) return false;
      const t = e.text.trim();
      if (t.length < 3) return false;
      for (const p of noisePatterns) {
        if (p.test(t)) return false;
      }
      return true;
    });
  }

  // dedupe similar messages by simple normalized string
  private dedupeEntries(entries: Array<any>): Array<any> {
    const seen = new Set<string>();
    const out: Array<any> = [];
    for (const e of entries) {
      const key = e.text.toLowerCase().replace(/\s+/g, " ").trim();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(e);
      }
    }
    return out;
  }

  // use the LLM to summarize long short term memory into compact context
  private async summarizeShortTermIfNeeded(entries: Array<any>): Promise<string> {
    if (!entries || entries.length === 0) return "";

    const texts = entries.map((e) => `${new Date(e.createdAt).toISOString()} ${e.text}`).join("\n");
    if (texts.length < this.SUMMARY_TRIGGER_LENGTH && entries.length <= this.MAX_SHORT_ENTRIES) {
      // no summarization needed
      return entries.map((e) => e.text).join(" | ");
    }

    // ask the LLM to summarize
    try {
      const system = `You are a concise summarizer for chat history. Return a one line summary focused on facts and user intent. Avoid fluffy words.`;
      const user = `Chat history:\n${texts}\n\nProvide a one line summary that captures the user's intent and any relevant facts.`;

      const resp = await client.chat.completions.create({
        model: this.SUMMARY_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        max_tokens: 120,
        temperature: 0.0
      });

      const s = resp.choices?.[0]?.message?.content?.trim() || "";
      // fallback to concatenation if empty
      return s || entries.map((e) => e.text).slice(-6).join(" | ");
    } catch (err) {
      console.error("MEMORY SUMMARIZE ERROR", err);
      return entries.map((e) => e.text).slice(-6).join(" | ");
    }
  }

  // detect repetition loops to avoid sending same context continuously
  private isLooping(prevEntries: Array<any>, candidateAnswer: string): boolean {
    if (!prevEntries || prevEntries.length === 0) return false;
    const lastBot = [...prevEntries].reverse().find((e) => (e.text || "").startsWith("Bot:"));
    if (!lastBot) return false;
    const lastBotText = (lastBot.text || "").replace(/^Bot:\s*/i, "").trim().slice(0, 400);
    const cand = candidateAnswer.trim().slice(0, 400);
    return lastBotText === cand;
  }

  // main function
  120
  (userId: string, query: string, topic: string) {
        // CRITICAL FIX: Validate KB exists before processing
    try {
      const kbCount = await (KnowledgeModel as any).countDocuments();
      if (kbCount === 0) {
        console.error("❌ NO KB DOCUMENTS FOUND - Admin panel KB is empty!");
        return {
          answer: "⚠️ Knowledge base not initialized. Please add training data in the admin panel first.",
          confidence: 0,
          usedDocs: []
        };
      }

      const kbWithEmbeddings = await (KnowledgeModel as any).countDocuments({ 
        embedding: { $exists: true, $type: "array", $ne: [] }
      });
      
      if (kbWithEmbeddings < 3) {
        console.warn(`⚠️ LOW KB EMBEDDINGS: Only ${kbWithEmbeddings} docs with valid embeddings!`);
      }
    } catch (err: any) {
      console.error("KB validation error:", err?.message);
    }


    // fetch memory
    const mem = await this.memory.getMemory(userId);

    // sanitize short term entries
    const rawShort = Array.isArray(mem.shortTerm) ? mem.shortTerm.slice() : [];
    let filtered = this.filterShortEntries(rawShort);
    filtered = this.dedupeEntries(filtered);

    // build summary when needed
    const shortSummary = await this.summarizeShortTermIfNeeded(filtered);

    // prefer memory topic if set else provided topic
    const currentTopic = mem.currentTopic || topic || "general";

    // create context aware query by stitching summary and current question
    const contextAwareQuery = shortSummary
      ? `Context: ${shortSummary} | Question: ${query}`
      : query;

    // detect inferred topics and update memory if strong signal
    const inferred = this.inferPossibleTopics(query);
    if (inferred.length > 0 && (!mem.currentTopic || mem.currentTopic === "general")) {
      // pick first inferred topic as new topic
      try {
        await this.memory.updateTopic(userId, inferred[0]);
      } catch (e) {
        // ignore errors updating memory
      }
    }

    // expand and embed the context aware query
    const expanded = this.expandQuery(contextAwareQuery).join(" ");
    const queryEmbedding = await EmbedText(expanded);

    // vector find
    const raw = await this.vector.findSimilar(queryEmbedding, this.TOP_K, 0.18);

    const docs: KBDoc[] = raw?.map((r: any) => ({
      _id: r._id,
      content: r.content,
      embedding: r.embedding,
      metadata: r.metadata,
      score: r.score
    })) || [];

    const ranked = this.rerankByTopic(docs, currentTopic);
    const confidence = this.computeConfidence(ranked);

    // low confidence fallback or clarification
    if (ranked.length === 0 || confidence < this.HALLUCINATION_THRESHOLD) {
      // save user query to memory
      await this.memory.addShortTerm(userId, `User: ${query}`);

      // clarify if ambiguous
      if (this.shouldClarify(query, confidence)) {
        return {
          answer: "Could you clarify what you mean by that? For example say 'Do you mean the daily drawdown rule or the maximum loss rule?'",
          confidence,
          usedDocs: []
        };
      }

      return {
        answer: "I do not have enough information on that. Let Harris or Sikha respond with more details.",
        confidence,
        usedDocs: []
      };
    }

    // build kb context string safely clipped
    const kbContext = ranked
      .slice(0, 8)
      .map((d) => `${d.metadata?.title || ""}\n${d.content}\n---\n`)
      .join("\n")
      .slice(0, 3500);

    // system prompt instructing the model to respond in strict JSON
    const systemPrompt = `
You are PropScholar AI.
Use only the KB context and the context aware query. Do not hallucinate.
Always output strict JSON exactly like:
{ "analysis": "...", "answer": "..." }
Tone: short, clear, professional.
Answer only the current question. If the question is ambiguous, ask one clarifying question.
`;

    const userMsg = `
Context Aware Query: ${contextAwareQuery}
Topic: ${currentTopic}

KB Context:
${kbContext}
`;

    let rawText: string | null = null;
    try {
      const completion = await client.chat.completions.create({
        model: this.SUMMARY_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg }
        ],
        max_tokens: 700,
        temperature: 0.0
      });

      rawText = completion.choices?.[0]?.message?.content || null;
    } catch (err) {
      console.error("RAG LLM ERROR:", err);
      return { answer: "Internal LLM error.", confidence, usedDocs: [] };
    }

    const parsed = this.safeParseJson(rawText);
    const finalAnswer = parsed?.answer || rawText || "I do not have enough information on that. Let Harris or Sikha respond with more details.";

    // loop prevention
    if (this.isLooping(filtered, finalAnswer)) {
      // avoid repeating same content. reply with a short handoff
      await this.memory.addShortTerm(userId, `User: ${query}`);
      return {
        answer: "I have already provided that answer earlier. Let Harris or Sikha provide more detail if needed.",
        confidence,
        usedDocs: ranked.slice(0, 8)
      };
    }

    // save conversation
    await this.memory.addShortTerm(userId, `User: ${query}`);
    await this.memory.addShortTerm(userId, `Bot: ${finalAnswer}`);

    return {
      answer: finalAnswer,
      confidence,
      usedDocs: ranked.slice(0, 8)
    };
  }
}
