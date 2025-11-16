export class ToxicDetectorService {
  public rules = [
    { keyword: "fuck", issue: "toxic-language" },
    { keyword: "idiot", issue: "toxic-language" },
    { keyword: "kill", issue: "violent-language" },
  ];

  check(text: string): string[] {
    const lowered = text.toLowerCase();
    const issues: string[] = [];

    for (const rule of this.rules) {
      if (lowered.includes(rule.keyword)) issues.push(rule.issue);
    }

    return issues;
  }
}
