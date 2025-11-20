interface IntentConfig {
  patterns: RegExp;
  response?: string;
  keywords?: string[];
}

export class IntentService {
  private intents: Record<string, IntentConfig> = {
    greeting: {
      patterns: /^(hi|hey|hello|sup|howdy)/i,
      response: "Hello! How can I help you with PropScholar today?"
    },
    payout: {
      patterns: /(payout|withdraw|profit|split|payment)/i,
      keywords: ["payout", "withdraw", "profit"]
    },
    rules: {
      patterns: /(rule|regulation|policy|allowed)/i,
      keywords: ["rules", "policy"]
    },
    technical: {
      patterns: /(error|bug|not working|broken)/i,
      keywords: ["error", "bug"]
    },
    phase: {
      patterns: /(phase|challenge|evaluation)/i,
      keywords: ["phase", "challenge"]
    }
  };

  detectIntent(query: string): { intent: string; confidence: number } {
    const lower = query.toLowerCase();
    let best = { intent: "general", confidence: 0.5 };

    for (const [name, config] of Object.entries(this.intents)) {
      if (config.patterns.test(query)) {
        const keywordCount =
          config.keywords?.filter(k => lower.includes(k)).length ?? 0;

        const confidence = 0.7 + keywordCount * 0.1;

        if (confidence > best.confidence) {
          best = { intent: name, confidence };
        }
      }
    }

    return best;
  }

  getQuickResponse(intent: string): string | null {
    return this.intents[intent]?.response ?? null;
  }
}
