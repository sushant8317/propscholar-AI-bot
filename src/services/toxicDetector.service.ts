// src/services/toxicDetector.service.ts
export class ToxicDetectorService {
  // Very simple rule-based toxic filter
  private badWords = ["fuck", "idiot", "shit", "bitch", "dogla"];

  async check(text: string): Promise<string[]> {
    const lowered = text.toLowerCase();
    const issues: string[] = [];

    for (const word of this.badWords) {
      if (lowered.includes(word)) issues.push(`Toxic word detected: ${word}`);
    }

    return issues;
  }
}
