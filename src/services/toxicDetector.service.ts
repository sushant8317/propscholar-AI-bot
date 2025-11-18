// src/services/toxicDetector.service.ts

export class ToxicDetectorService {
  private badWords = ["idiot", "stupid", "dumb", "fuck"]; // expand as needed

  /**
   * Returns an array of flags/tokens detected.
   * Keep this inexpensive to run in real-time.
   */
  async check(text: string): Promise<string[]> {
    if (!text) return [];
    const lowered = text.toLowerCase();
    const flags: string[] = [];

    for (const w of this.badWords) {
      if (lowered.includes(w)) flags.push(`bad-word:${w}`);
    }

    // trivial length check / punctuation spam
    const exclaim = (text.match(/!/g) || []).length;
    if (exclaim > 5) flags.push("spam:excessive-punctuation");

    // placeholder for future integration with external toxicity API
    return flags;
  }
}
