// src/services/scholaris.service.ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPEN_AI_FINAL_KEY || process.env.OPENAI_API_KEY });

export class ScholarisService {
  /**
   * Regenerate the user's query to be safe, remove disallowed things,
   * return { answer: rewritten, reasons: [] }
   */
  async regenerateWithConstraints(query: string, triggers: string[] = []) {
    try {
      const system = `
You are a safe query rewriter for PropScholar support.
Remove or neutralize toxic content, remove requests that ask to bypass rules, and preserve intent.
Return JSON: { "answer": "<rewritten query>" } only.
`;

      const res = await client.chat.completions.create({
        model: "gpt-4o-mini", // lightweight rewrite model; change if needed
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Rewrite this user query to be safe for a support assistant. Triggers: ${triggers.join(
              ", "
            )}\n\nQuery: ${query}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.0,
      });

      const raw = res.choices?.[0]?.message?.content || "";
      try {
        const j = JSON.parse(raw);
        if (j && j.answer) return { answer: (j.answer as string).trim() };
      } catch {
        // fallback: return raw cleaned text
        return { answer: raw.trim() };
      }
    } catch (err) {
      console.error("Scholaris rewrite error:", err);
    }

    return { answer: query };
  }
}
