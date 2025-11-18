// src/services/topic.service.ts

export class TopicService {
  private topics: Array<{ name: string; keywords: string[] }> = [
    {
      name: "daily-drawdown",
      keywords: ["daily dd", "daily drawdown", "ddl", "daily loss", "dmax"],
    },
    {
      name: "max-loss",
      keywords: ["max loss", "maximum loss", "overall drawdown"],
    },
    {
      name: "payouts",
      keywords: ["payout", "withdraw", "profit split", "scholarship"],
    },
    {
      name: "plus-model",
      keywords: ["plus", "1 step", "1-step", "2 step", "holding"],
    },
    {
      name: "ufm",
      keywords: ["unfair means", "tick scalping", "ufm"],
    },
    {
      name: "news-trading",
      keywords: ["news", "red news", "forex factory"],
    },
    {
      name: "consistency",
      keywords: ["consistency", "45 percent", "forty five"],
    }
  ];

  detectTopic(text: string): string {
    const lower = text.toLowerCase();

    for (const t of this.topics) {
      for (const kw of t.keywords) {
        if (lower.includes(kw)) return t.name;
      }
    }

    return "general";
  }
}
