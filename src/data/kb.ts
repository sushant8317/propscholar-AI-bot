// src/data/kb.ts

export const KNOWLEDGE_BASE = [
  {
    id: "overview",
    content: `
PropScholar is a prop firm offering simulated trading evaluations on demo accounts.
You complete an evaluation by hitting the profit target without breaking risk rules.
After passing, traders only pay the real evaluation cost (example: $19 for a 2K challenge).
All payouts or rewards are issued through UPI, bank transfer or crypto.
`
  },

  {
    id: "drawdown-rules",
    content: `
Daily Loss Limit:
Resets at 00:00 UTC.
Calculated using whichever is higher: starting balance or starting equity of that day.

Maximum Loss Limit:
Fixed loss cap from the initial balance. Equity cannot drop below this level.
`
  },

  {
    id: "plus-2-step",
    content: `
PropScholar Plus 2-Step:
Phase 1 target: 8 percent.
Phase 2 target: 5 percent.
Daily Loss Limit: 4 percent.
Max Loss: 8 percent.
No consistency rule.
Minimum 3 profitable days.
Minimum 2-minute average holding time.
Weekend holding allowed.
No news restrictions.
`
  },

  {
    id: "plus-1-step",
    content: `
PropScholar Plus 1-Step:
Profit target: 10 percent.
Daily Loss Limit: 3 percent.
Max Loss: 6 percent.
No consistency rule.
No minimum days except 3 profitable days.
`
  },

  {
    id: "standard-1-step",
    content: `
PropScholar Standard 1-Step:
Profit target: 10 percent.
Daily Loss Limit: 3 percent.
Maximum Loss: 6 percent.
Requires 45 percent consistency rule.
`
  },

  {
    id: "standard-2-step",
    content: `
PropScholar Standard 2-Step:
Phase 1 target: 8 percent.
Phase 2 target: 5 percent.
Daily Loss Limit: 4 percent.
Max Loss Limit: 8 percent.
45 percent consistency rule required.
`
  },

  {
    id: "model-differences",
    content: `
PLUS: No consistency rule, requires 3 profitable days, minimum 2-minute average holding time.
STANDARD: Requires 45 percent consistency rule, no minimum days, no minimum holding time.
Both allow weekend holding and news trading.
`
  }
];
