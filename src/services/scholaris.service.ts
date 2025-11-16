// src/services/scholaris.service.ts
import axios from "axios";

export class ScholarisService {
  async regenerateWithConstraints(userQuery: string, issues: string[]) {
    try {
      const prompt = `
Rewrite the user's message safely.
Remove harmful, policy-violating, or toxic content.
Keep meaning but follow PropScholar rules strictly.

User message:
${userQuery}

Issues detected:
${issues.join(", ") || "none"}

Return improved safe version only.
      `;

      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: "You sanitize user text." },
            { role: "user", content: prompt },
          ],
          max_tokens: 120,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        answer: response.data.choices?.[0]?.message?.content || "",
        confidence: 0.9,
      };
    } catch (err: any) {
      return {
        answer: "Could not regenerate safely.",
        confidence: 0.1,
      };
    }
  }
}
