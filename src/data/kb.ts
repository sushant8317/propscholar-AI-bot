export const KNOWLEDGE_BASE = [
  {
    id: "overview",
    content: `
PropScholar is a prop firm offering simulated trading evaluations.
Traders pass a challenge by hitting profit targets without breaking risk rules.
There is no real-money trading. All trading is done on demo accounts.
After passing, the trader pays only the real cost of the evaluation (example: $19 for Maven 2K 2-Step).
Payouts or rewards are issued via UPI, crypto or bank transfer depending on model.
`
  },

  {
    id: "plus-2-step",
    content: `
PropScholar Plus 2-Step:
Phase 1 target: 8 percent profit.
Phase 2 target: 5 percent profit.
Daily Loss Limit: 4 percent of the highest value between starting balance or equity. Resets at 00:00 UTC.
Maximum Loss Limit: 8 percent of initial balance.
Leverage: 1:100.
No consistency rule.
Minimum 3 profitable days.
Weekend holding allowed.
No news restrictions.
No time limit.
`
  },

  {
    id: "plus-1-step",
    content: `
PropScholar Plus 1-Step:
Profit target: 10 percent.
Daily Loss Limit: 3 percent.
Max Loss: 6 percent.
Leverage: 1:50.
Minimum 3 profitable days.
No consistency rule. No time limit.
Weekend holding allowed.
No news restrictions.
`
  },

  {
    id: "standard-1-step",
    content: `
PropScholar Standard 1-Step:
Profit target: 10 percent.
Daily Loss Limit: 3 percent.
Max Loss Limit: 6 percent.
Leverage: 1:100.
Requires consistency rule: No single day may exceed 45 percent of total profit.
No minimum holding time. Weekend holding allowed.
`
  },

  {
    id: "standard-2-step",
    content: `
PropScholar Standard 2-Step:
Phase 1: 8 percent target.
Phase 2: 5 percent target.
Daily Loss Limit: 4 percent.
Max Loss: 8 percent.
45 percent consistency rule applies.
No minimum holding time.
Weekend holding allowed.
`
  },

  {
    id: "plus-vs-standard",
    content: `
Plus Model:
No consistency rule.
Minimum 3 profitable days.
Minimum 2-minute average holding time.
Standard Model:
Requires 45 percent consistency rule.
No minimum days.
No minimum holding time.
Both allow weekend holding and news trading.
`
  },

  {
    id: "drawdown-rules",
    content: `
Daily Loss Limit:
Resets at 00:00 UTC.
Calculated using whichever is higher: starting balance of the day or starting equity.
Maximum Loss Limit:
Fixed loss cap from initial balance. Equity cannot go below this level.
`
  }
];
