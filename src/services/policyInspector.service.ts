// src/services/policyInspector.service.ts
export class PolicyInspectorService {
  private policies = [
    { keyword: "breach", issue: "User asking about breach exploitation" },
    { keyword: "cheat", issue: "User asking about cheating system" },
    { keyword: "mqli", issue: "Suspicious trading method" },
    { keyword: "martingale", issue: "High-risk rule violation detected" },
    { keyword: "hedge", issue: "Potential prohibited hedging inquiry" },
  ];

  inspect(text: string): string[] {
    const lowered = text.toLowerCase();
    const issues: string[] = [];

    for (const p of this.policies) {
      if (lowered.includes(p.keyword)) {
        issues.push(p.issue);
      }
    }

    return issues;
  }
}
