// src/data/kb.ts

export const KNOWLEDGE_BASE = [
  {
    id: "plus-1step-overview",
    content: "Q: What is PropScholar Plus 1-Step?\nA: Plus 1-Step is a single-phase evaluation with a 10% profit target, 1:50 leverage, 6% max loss and 3% daily loss.",
    keywords: ["plus", "1-step", "overview", "10%"],
  },
  {
    id: "plus-2step-overview",
    content: "Q: What is PropScholar Plus 2-Step?\nA: Plus 2-Step has Phase 1 (8% target) and Phase 2 (5% target), 1:100 leverage, 8% max loss and 4% daily loss.",
    keywords: ["plus", "2-step", "overview", "8%", "5%"],
  },
  {
    id: "standard-1step-overview",
    content: "Q: What is Standard 1-Step evaluation?\nA: Standard 1-Step is a single-phase model with 10% profit target, 1:100 leverage, 6% max loss, 3% daily loss and a 45% consistency rule.",
    keywords: ["standard", "1-step", "consistency", "10%"],
  },
  {
    id: "standard-2step-overview",
    content: "Q: What is Standard 2-Step evaluation?\nA: Standard 2-Step uses Phase1 8% and Phase2 5% targets, 1:100 leverage, 8% max loss, 4% daily loss and a 45% consistency rule.",
    keywords: ["standard", "2-step", "overview", "8%", "5%"],
  },

  // everything below is correct — leaving as-is

  {
    id: "max-loss-definition",
    content: "Q: What is Maximum Loss Limit?\nA: Maximum Loss Limit is a hard cap (6% or 8% depending on model) of the initial account size; falling below it is a hard breach.",
    keywords: ["max loss", "hard breach"],
  },
  {
    id: "daily-loss-definition",
    content: "Q: What is Daily Loss Limit?\nA: Daily Loss Limit is a hard cap (3% or 4%) calculated on the higher of starting equity or starting balance and resets at 00:00 UTC.",
    keywords: ["daily loss", "resets", "00:00 UTC"],
  },
  {
    id: "daily-loss-example",
    content: "Q: Example of daily loss calculation?\nA: If day starts with $105K balance and $107K equity, a 3% daily loss uses $107K; limit = $107K - 3% = $103,790.",
    keywords: ["example", "daily loss"],
  },
  {
    id: "breach-consequence",
    content: "Q: What happens when I breach a hard rule?\nA: On hard breach (daily loss or max loss) all open trades are closed, orders cancelled, account locked to view-only and terminated.",
    keywords: ["breach", "consequence"],
  },
  {
    id: "soft-breach-holding-time",
    content: "Q: What is a soft breach for holding time?\nA: Average holding time below 2 minutes in Plus models is a soft breach that resets the account but does not permanently terminate it.",
    keywords: ["soft breach", "holding time", "2 minutes"],
  },
  {
    id: "plus-min-profitable-days",
    content: "Q: How many profitable days are required in Plus models?\nA: Plus models require at least 3 profitable days during the evaluation.",
    keywords: ["plus", "profitable days", "3 days"],
  },
  {
    id: "plus-min-profit-day",
    content: "Q: What counts as a profitable day in Plus models?\nA: A profitable day only counts if it achieves at least 1.5% profit of account balance.",
    keywords: ["plus", "profitable day", "1.5%"],
  },
  {
    id: "plus-holding-time",
    content: "Q: What is the minimum average holding time?\nA: Plus models require a minimum average holding time of 2 minutes. Stop-loss hits under 2 mins are exempt.",
    keywords: ["plus", "holding time", "2 minutes"],
  },
  {
    id: "consistency-rule-definition",
    content: "Q: What is the consistency rule?\nA: No single day's profit may exceed 45% of total profits. Only in Standard models.",
    keywords: ["consistency", "45%"],
  },
  {
    id: "consistency-example",
    content: "Q: Example of consistency rule?\nA: If target is $400, you cannot make more than $180 (45%) in a single day.",
    keywords: ["consistency", "example"],
  },
  {
    id: "phase-progression-2step",
    content: "Q: How does Phase1 → Phase2 work?\nA: After Phase 1 target is hit, you're auto-promoted. Balance continues.",
    keywords: ["phase progression", "2-step"],
  },
  {
    id: "phase-reset",
    content: "Q: Do rules reset between phases?\nA: Rules stay the same. Only profit targets change.",
    keywords: ["phase", "rules"],
  },
  {
    id: "ufm-definition",
    content: "Q: What are Unfair Means (UFM)?\nA: Tick scalping, glitches, insider signals, abusive automation.",
    keywords: ["UFM", "unfair means"],
  },
  {
    id: "tick-scalping-ban",
    content: "Q: Is tick scalping allowed?\nA: No. It is forbidden and results in termination.",
    keywords: ["tick scalping", "forbidden"],
  },
  {
    id: "copy-trading-rule",
    content: "Q: Copy trading allowed?\nA: NOT between two PropScholar accounts.",
    keywords: ["copy trading"],
  },
  {
    id: "lot-limit",
    content: "Q: Is there a lot limit?\nA: No lot limit. Follow risk rules.",
    keywords: ["lot", "limit"],
  },
  {
    id: "weekend-holding",
    content: "Q: Weekend holding allowed?\nA: Yes, allowed in all models.",
    keywords: ["weekend"],
  },
  {
    id: "news-trading",
    content: "Q: News trading allowed?\nA: Yes. PropScholar has NO news restrictions.",
    keywords: ["news"],
  },
  {
    id: "inactivity-rule",
    content: "Q: Inactivity rule?\nA: 14 days without trading may suspend account.",
    keywords: ["inactivity", "14 days"],
  },
  {
    id: "payout-timing",
    content: "Q: Payout time?\nA: Within 4 hours after passing review.",
    keywords: ["payout", "4 hours"],
  },

  // ... your "extra-1" → "extra-87" (KEEP THEM) ...

  {
    id: "extra-87",
    content: "Q: Short rule example 87\nA: Short rule example answer 87.",
    keywords: ["example", "rule"],
  },
];

// IMPORTANT FIX → array is now closed correctly
