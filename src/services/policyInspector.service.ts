// src/services/policyInspector.service.ts

export class PolicyInspectorService {
  public policies = [
    { keyword: "breach", issue: "breach-discussion" },
    { keyword: "hack", issue: "security-risk" },
    { keyword: "exploit", issue: "unfair-advantage" },
    { keyword: "news", issue: "no-news-trading" },
  ];

  inspect(text: string): string[] {
    if (!text) return [];
    const lowered = text.toLowerCase();
    const issues: string[] = [];
    for (const p of this.policies) {
      if (lowered.includes(p.keyword)) issues.push(p.issue);
    }
    return issues;
  }
}
