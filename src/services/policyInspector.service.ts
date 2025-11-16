export class PolicyInspectorService {
  public policies = [
    { keyword: "breach", issue: "breach-discussion" },
    { keyword: "hack", issue: "security-risk" },
    { keyword: "exploit", issue: "unfair-advantage" },
  ];

  inspect(text: string): string[] {
    const lowered = text.toLowerCase();
    const issues: string[] = [];

    for (const p of this.policies) {
      if (lowered.includes(p.keyword)) issues.push(p.issue);
    }

    return issues;
  }
}
