// src/services/brain.service.ts
import OpenAI from "openai";
import { RAGService } from "./rag.service";
import { ScholarisService } from "./scholaris.service";
import { ToxicDetectorService } from "./toxicDetector.service";
import { PolicyInspectorService } from "./policyInspector.service";
import { MemoryService } from "./memory.service";
import { ContextService } from "./context.service";
import { IntentService } from "./intent.service";
import { AnalyticsService } from "./analytics.service";
import { CacheService } from "./cache.service";
import { ConversationMemoryService } from "../models/conversationMemory.model";
import { TopicService } from "./topic.service";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const rag = new RAGService();
const scholaris = new ScholarisService();
const toxic = new ToxicDetectorService();
const inspector = new PolicyInspectorService();
const memory = new MemoryService();
const contextManager = new ContextService();
const intentService = new IntentService();
const analytics = new AnalyticsService();
const cache = new CacheService();
const convMemory = new ConversationMemoryService();
const topics = new TopicService();

export class BrainService {
  // Main entry point used by Discord and Admin panels
  static async getAnswer(userId: string, rawQuery: string, options: { botTagged?: boolean, channelId?: string } = {}) {
    const start = Date.now();
    const botTagged = !!options.botTagged;

    // 1. Intent quick-response shortcut (keeps your fast responses feature)
    try {
      const intent = intentService.detectIntent(rawQuery);
      const quick = intentService.getQuickResponse(intent.intent);
      if (quick && !botTagged) {
        await analytics.log({
          userId,
          query: rawQuery,
          intent: intent.intent,
          cached: true,
          modelUsed: "quick",
          responseTime: Date.now() - start
        });
        return { answer: quick, usedDocs: [], source: "quick" };
      }
    } catch (e) {
      // non-fatal
      console.error("Intent quick-check error:", e);
    }

    // 2. Cache check (preserves your cache behavior)
    try {
      const cached = cache.get(rawQuery);
      if (cached && !botTagged) {
        await analytics.log({
          userId,
          query: rawQuery,
          intent: "cached",
          cached: true,
          modelUsed: "cache",
          responseTime: Date.now() - start
        });
        return { answer: cached, usedDocs: [], source: "cache" };
      }
    } catch (e) {
      console.error("Cache check error:", e);
    }

    // 3. Context + memory blocks (same as admin)
    let memoryBlock = "";
    try {
      const memoryHistory = await convMemory.get(userId);
      memoryBlock = memoryHistory
        .map(m => `${(m.role || "user").toString().toUpperCase()}: ${m.content}`)
        .join("\n");
    } catch (e) {
      console.error("Memory load error:", e);
      memoryBlock = "";
    }

    const context = contextManager.get(userId) || "";

    // 4. Topic detection and RAG lookup (admin behavior)
    const topic = topics.detectTopic(rawQuery);
    let ragResult;
    try {
      ragResult = await rag.generateResponse(userId, rawQuery, topic);
    } catch (e) {
      console.error("RAG error:", e);
      ragResult = { answer: "", confidence: 0, usedDocs: [] };
    }

    // 5. Toxic + policy rewriting (admin safe rewrite)
    let toxTriggers: string[] = [];
    try {
      toxTriggers = await toxic.check(rawQuery);
    } catch (e) {
      console.error("Toxic check error:", e);
      toxTriggers = [];
    }

    let policies: string[] = [];
    try {
      policies = inspector.inspect(rawQuery) || [];
    } catch (e) {
      console.error("Policy inspector error:", e);
      policies = [];
    }

    // 6. Scholaris rewrite to ensure safe/helpful prompt for LLM if needed
    let rewritten = { answer: rawQuery };
    try {
      rewritten = await scholaris.regenerateWithConstraints(rawQuery, [...toxTriggers, ...policies]);
    } catch (e) {
      console.error("Scholaris rewrite error:", e);
      rewritten = { answer: rawQuery };
    }

    // 7. If RAG returned high confidence and a direct answer, use it
    const hallucinationThreshold = 0.25; // matches your RAG threshold
    if (ragResult && ragResult.answer && (ragResult.confidence || 0) >= hallucinationThreshold) {
      const finalText = ragResult.answer;
      // write analytics and memory, cache
      try {
        cache.set(rawQuery, finalText);
        contextManager.add(userId, "user", rawQuery, topic);
        contextManager.add(userId, "assistant", finalText, topic);
        await convMemory.add(userId, "user", rawQuery);
        await convMemory.add(userId, "assistant", finalText);
        await analytics.log({
          userId,
          query: rawQuery,
          intent: intentService.detectIntent(rawQuery).intent,
          cached: false,
          modelUsed: "rag",
          responseTime: Date.now() - start
        });
      } catch (e) {
        console.error("Post-answer bookkeeping error:", e);
      }
      return { answer: finalText, usedDocs: ragResult.usedDocs || [], source: "rag", confidence: ragResult.confidence || 0 };
    }

    // 8. If RAG is weak, use admin LLM with strict system prompt (mirrors admin test LLM behavior)
    const system = `
You are Scholaris AI — PropScholar's official support assistant.
Use only available KB context and the rewritten safe query. Do not hallucinate. If KB is insufficient reply with:
"I don’t have much information regarding this. Let Harris or Sikha come in to help."
Return plain text answer. Tone: short, clear, professional. No emojis.
`;

    const kbBlock = (ragResult && Array.isArray(ragResult.usedDocs) && ragResult.usedDocs.length > 0)
      ? ragResult.usedDocs.map((d: any) => `${d.metadata?.title || ""}\n${d.content || ""}\n---\n`).join("\n").slice(0, 3500)
      : "";

    const userMsg = `
Conversation Memory (last messages):
${memoryBlock || "(no memory)"}

Context:
${context || "(no context)"}

User Query: ${rawQuery}
Rewritten Query: ${rewritten?.answer || rawQuery}
Topic: ${topic || "general"}

KB Context:
${kbBlock}

Policies: ${policies.join(", ") || "none"}
Toxic: ${toxTriggers.join(", ") || "none"}
`;

    // Call OpenAI just like admin final LLM
    let finalText = "";
    try {
      const model = rawQuery.length < 8 ? "gpt-4.1-mini" : "gpt-4.1"; // reuse your model chooser logic
      const resp = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg }
        ],
        temperature: 0.25,
        max_tokens: 600
      });
      finalText = resp.choices?.[0]?.message?.content?.trim() || "";
    } catch (e) {
      console.error("Final LLM error:", e);
      finalText = "Internal AI error.";
    }

    // fallback if finalText empty
    if (!finalText || finalText.length < 3) {
      finalText = "I don’t have much information regarding this. Let Harris or Sikha come in to help.";
    }

    // 9. Bookkeeping: cache, context, memory, analytics
    try {
      cache.set(rawQuery, finalText);
      contextManager.add(userId, "user", rawQuery, topic);
      contextManager.add(userId, "assistant", finalText, topic);
      await convMemory.add(userId, "user", rawQuery);
      await convMemory.add(userId, "assistant", finalText);
      await analytics.log({
        userId,
        query: rawQuery,
        intent: intentService.detectIntent(rawQuery).intent,
        cached: false,
        modelUsed: "final-llm",
        responseTime: Date.now() - start
      });
    } catch (e) {
      console.error("Final bookkeeping error:", e);
    }

    // 10. Return final text and RAG docs for highlighting if needed
    return { answer: finalText, usedDocs: ragResult.usedDocs || [], source: "final-llm", confidence: ragResult.confidence || 0 };
  }
}

export default BrainService;
