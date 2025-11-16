// src/services/ruleChecker.service.ts

/**
 * Small rule checker that validates final draft against PropScholar hard rules.
 * You can extend rules easily here.
 */

export class RuleCheckerService {
  // list of forbidden strategy keywords (example)
  private forbiddenPatterns = [
    /martingale/i,
    /server abuse/i,
    /exploit/i,
    /tick scalping/i,
    /copy trading between propscholar accounts/i,
  ];

  validate(text: string, context?: string) {
    const issues: string[] = [];

    // Check forbidden patterns
    for (const pat of this.forbiddenPatterns) {
      if (pat.test(text) || (context && pat.test(context))) {
        issues.push(`Contains forbidden strategy or wording: ${pat.toString()}`);
      }
    }

    // Simple factual check example: if text claims payouts in hours, ensure it mentions '4 hours'
    if (/payout/i.test(text) && !/4\s*hour/i.test(text)) {
      issues.push("Payout claims must match PropScholar policy (use '4 hours' if referencing payout time).");
    }

    // Add more domain-specific checks as needed

    return {
      passed: issues.length === 0,
      issues,
    };
  }
}
