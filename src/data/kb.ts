// src/data/kb.ts
export const KNOWLEDGE_BASE = [
  {
    id: "plus_1step_overview",
    question: "What is PropScholar Plus one step?",
    answer: "Plus one step is a single phase evaluation with a 10 percent profit target, leverage one to fifty, a six percent maximum loss and a three percent daily loss.",
    keywords: ["plus", "one step", "10%", "leverage"]
  },
  {
    id: "plus_2step_overview",
    question: "What is PropScholar Plus two step?",
    answer: "Plus two step has phase one with an eight percent target and phase two with a five percent target, leverage one to one hundred, maximum loss eight percent and daily loss four percent.",
    keywords: ["plus", "two step", "8%", "5%"]
  },
  {
    id: "standard_1step_overview",
    question: "What is Standard one step evaluation?",
    answer: "Standard one step is a single phase model with a ten percent profit target, leverage one to one hundred, maximum loss six percent, daily loss three percent and a consistency rule of 45 percent.",
    keywords: ["standard", "one step", "consistency", "10%"]
  },
  {
    id: "standard_2step_overview",
    question: "What is Standard two step evaluation?",
    answer: "Standard two step uses an eight percent target in phase one and a five percent target in phase two, leverage one to one hundred, maximum loss eight percent, daily loss four percent and a consistency rule of 45 percent.",
    keywords: ["standard", "two step", "8%", "5%"]
  },
  {
    id: "maximum_loss_definition",
    question: "What is the maximum loss limit?",
    answer: "Maximum loss limit is a hard cap on the account equal to a percentage of initial account size; falling below it is a hard breach that locks the account to view only.",
    keywords: ["maximum loss", "hard breach", "stop out"]
  },
  {
    id: "daily_loss_definition",
    question: "What is the daily loss limit?",
    answer: "Daily loss limit is calculated using the higher of starting equity or starting balance for the day and is expressed as a percent. It resets at zero zero zero zero UTC each day.",
    keywords: ["daily loss", "resets", "equity", "balance"]
  },
  {
    id: "daily_loss_example",
    question: "How is daily loss calculated with an example?",
    answer: "If the day starts with one hundred five thousand balance and one hundred seven thousand equity and the daily limit is three percent, the limit uses one hundred seven thousand and the threshold is one hundred three thousand seven hundred ninety.",
    keywords: ["daily loss", "example", "calculation"]
  },
  {
    id: "breach_consequence",
    question: "What happens when a hard rule is breached?",
    answer: "On hard breach all open trades are closed, pending orders are canceled, account is switched to view only and the evaluation may be terminated according to the rules.",
    keywords: ["breach", "consequence", "view only"]
  },
  {
    id: "soft_breach_holding_time",
    question: "What is the holding time soft breach?",
    answer: "A minimum average holding time applies to some models. Falling below that average is a soft breach which triggers a warning or temporary reset but not immediate termination.",
    keywords: ["holding time", "soft breach", "average"]
  },
  {
    id: "plus_min_profitable_days",
    question: "How many profitable days are required in Plus models?",
    answer: "Plus models require three profitable days that meet the minimum daily profit criteria to qualify for a pass.",
    keywords: ["plus", "profitable days", "three"]
  },
  {
    id: "plus_min_profit_day",
    question: "What qualifies as a profitable day in Plus models?",
    answer: "A profitable day in Plus models counts only if the profit meets the minimum threshold, usually one and a half percent of the initial account balance for that day.",
    keywords: ["profitable day", "1.5%", "plus"]
  },
  {
    id: "consistency_rule_definition",
    question: "What is the consistency rule?",
    answer: "The consistency rule restricts how much profit can be earned in a single day relative to total profits. It typically prevents a single day from contributing more than 45 percent of total profits. This applies to Standard models only.",
    keywords: ["consistency", "45%", "standard"]
  },
  {
    id: "consistency_example",
    question: "Can you give an example of the consistency rule?",
    answer: "If the total target is four hundred dollars, the maximum that can count from one day is forty five percent of profits, which equals one hundred eighty dollars.",
    keywords: ["consistency", "example"]
  },
  {
    id: "phase_progression_two_step",
    question: "How does progression from phase one to phase two work?",
    answer: "When phase one target is reached the account moves to phase two automatically and rules remain active unless explicitly changed. Balance and risk calculations continue from current values.",
    keywords: ["phase progression", "promotion"]
  },
  {
    id: "phase_reset",
    question: "Do evaluation rules reset between phases?",
    answer: "In most models rules persist across phases. Profit targets change but risk rules continue unless documentation states otherwise.",
    keywords: ["phase", "reset", "rules"]
  },
  {
    id: "unfair_means_definition",
    question: "What are unfair means?",
    answer: "Unfair means includes tick scalping, exploiting system glitches, using insider or private signals, automated signal spamming, or any manipulation that gives an unfair advantage.",
    keywords: ["ufm", "unfair means", "tick scalping"]
  },
  {
    id: "tick_scalping_ban",
    question: "Is tick scalping allowed?",
    answer: "No. Tick scalping is prohibited and detected behavior will lead to warnings and potential contract termination.",
    keywords: ["tick scalping", "ban"]
  },
  {
    id: "copy_trading_rule",
    question: "Is copy trading allowed between accounts?",
    answer: "Copy trading between two platform accounts is not allowed.",
    keywords: ["copy trading", "not allowed"]
  },
  {
    id: "lot_limit",
    question: "Are there lot size limits?",
    answer: "There is generally no specific lot size limit but trades must comply with risk and loss rules and position sizing must remain responsible.",
    keywords: ["lot size", "limit", "position sizing"]
  },
  {
    id: "weekend_holding",
    question: "Is holding positions over the weekend allowed?",
    answer: "Yes, weekend holding is allowed in the stated models unless a specific product documentation states otherwise.",
    keywords: ["weekend holding", "allowed"]
  },
  {
    id: "news_trading",
    question: "Is news trading permitted?",
    answer: "News trading rules vary by model. If the policy states no news trading then trades taken inside defined no trade windows will be invalid and may cause warnings.",
    keywords: ["news trading", "no trade windows"]
  },
  {
    id: "inactivity_rule",
    question: "What happens on account inactivity?",
    answer: "If an account has no trades for a specified period, typically fourteen days, it may be suspended or marked inactive.",
    keywords: ["inactivity", "suspend", "14 days"]
  },
  {
    id: "payout_timing",
    question: "When are payouts processed?",
    answer: "Payouts are usually processed within a few hours after passing verification and review. Check dashboard payment options for exact timelines.",
    keywords: ["payout", "timing", "review"]
  },
  {
    id: "withdrawal_process",
    question: "How do I withdraw funds?",
    answer: "Withdrawals are processed through the payout interface. Follow the steps shown on the dashboard and ensure KYC conditions are met if applicable.",
    keywords: ["withdraw", "payout", "dashboard"]
  },
  {
    id: "fees_and_charges",
    question: "Are there fees or commissions?",
    answer: "Fees vary by program. Some accounts have raw spread and no commission while others include built in costs. Check the program details for fees.",
    keywords: ["fees", "commission", "spread"]
  },
  {
    id: "leverage_explained",
    question: "What does leverage mean on my evaluation?",
    answer: "Leverage is the ratio of position size to required margin. Higher leverage increases exposure and risk while reducing required margin.",
    keywords: ["leverage", "margin", "exposure"]
  },
  {
    id: "pnl_and_equity",
    question: "What is the difference between pnl and equity?",
    answer: "PnL stands for profit and loss which may be floating or closed. Equity equals account balance plus floating PnL.",
    keywords: ["pnl", "equity", "balance"]
  },
  {
    id: "how_losses_are_applied",
    question: "How are losses applied to limits?",
    answer: "Limits consider floating PnL for the day and closed trades. Daily loss uses the higher of starting equity or starting balance in the calculation.",
    keywords: ["loss", "limits", "calculation"]
  },
  {
    id: "reporting_and_notifications",
    question: "How will I know if I breach a rule?",
    answer: "Breaches are reported in the dashboard, with the breached objective identified. You will also receive email notifications when a breach is detected.",
    keywords: ["breach", "notification", "dashboard"]
  },
  {
    id: "account_types",
    question: "What account types exist in the program?",
    answer: "Typical account types include evaluation stage accounts and funded accounts or scholar accounts. Features and rules vary by account type.",
    keywords: ["account type", "evaluation", "funded"]
  },
  {
    id: "funding_transfer",
    question: "How does funding transfer work after passing?",
    answer: "After passing the evaluation and review, funds or scholarships are delivered using the chosen payout method such as UPI, crypto or bank transfer according to policy.",
    keywords: ["funding", "scholarship", "payout method"]
  },
  {
    id: "api_and_webhooks",
    question: "Does the platform support APIs or webhooks?",
    answer: "APIs or webhooks may be available for partners. Check developer documentation or partner program details for availability and access.",
    keywords: ["api", "webhooks", "partner"]
  },
  {
    id: "security_best_practices",
    question: "How do I keep my account secure?",
    answer: "Use strong unique passwords, enable two factor authentication where available and never share credentials. Report suspicious activity to support.",
    keywords: ["security", "two factor", "password"]
  },
  {
    id: "password_change_policy",
    question: "Can I change the dashboard password?",
    answer: "Password changes must follow platform procedures and cannot be altered by others. Attempting to change another account's password is prohibited.",
    keywords: ["password", "change", "policy"]
  },
  {
    id: "partner_program",
    question: "What is the partner program?",
    answer: "The partner program accepts suggestions, business contacts, affiliates and collaboration opportunities. Contact partnerships for details.",
    keywords: ["partner", "affiliate", "collaboration"]
  },
  {
    id: "refund_policy",
    question: "What is the refund policy for evaluations?",
    answer: "Refund and payment policies depend on the product. Some entry fees are non refundable while scholarship payouts occur after passing. Check the product page.",
    keywords: ["refund", "payment", "policy"]
  },
  {
    id: "support_contact",
    question: "How do I contact support?",
    answer: "Use the support section on the dashboard or help site to submit a ticket. Include account details and a clear description of the issue.",
    keywords: ["support", "contact", "help"]
  },
  {
    id: "data_privacy",
    question: "How is my data handled?",
    answer: "User data is handled per privacy rules and applicable law. See privacy documentation for data retention and usage details.",
    keywords: ["privacy", "data", "retention"]
  },
  {
    id: "test_account_vs_live",
    question: "Are evaluations live trading or simulated?",
    answer: "Evaluations use simulated demo accounts only. They do not involve brokered client funds or live market accounts for the user.",
    keywords: ["demo", "simulated", "evaluation"]
  },
  {
    id: "trade_closing_on_breach",
    question: "Will open trades be closed if I breach a rule?",
    answer: "Yes. On detection of a breach open trades are closed and limit and stop orders are canceled to secure account state.",
    keywords: ["close trades", "orders", "breach"]
  },
  {
    id: "notifications_and_emails",
    question: "Will I get emails about my account actions?",
    answer: "Yes. Important events such as pass, breach, payout and account changes generate email notifications if your email is on file.",
    keywords: ["email", "notifications"]
  },
  {
    id: "minimum_trade_requirements",
    question: "Are there minimum trade requirements?",
    answer: "Minimum trade sizes or volume requirements may vary by program. Check product details for exact thresholds.",
    keywords: ["minimum trade", "size", "volume"]
  },
  {
    id: "order_types_supported",
    question: "What order types are supported?",
    answer: "Standard order types including market, limit and stop may be supported. Verify available order types in the trading interface.",
    keywords: ["order types", "market", "limit", "stop"]
  },
  {
    id: "leverage_changes",
    question: "Can leverage change during evaluation?",
    answer: "Leverage is defined per product. Some phases have different leverage. Changes are documented in the program rules.",
    keywords: ["leverage", "phases"]
  },
  {
    id: "position_aggregation",
    question: "Does the platform aggregate positions?",
    answer: "Position handling follows the trading platform rules. Aggregation or netting behavior depends on instrument and platform implementation.",
    keywords: ["positions", "aggregation"]
  },
  {
    id: "risk_management_tips",
    question: "Any risk management tips during evaluation?",
    answer: "Use sensible position sizing, avoid overleveraging, respect daily and maximum loss rules and test strategies on demo before scaling.",
    keywords: ["risk management", "position sizing"]
  },
  {
    id: "allowed_instruments",
    question: "What instruments can I trade during evaluation?",
    answer: "Allowed instruments vary by program. Check the evaluation details for allowed asset classes and instrument lists.",
    keywords: ["instruments", "assets", "allowed"]
  },
  {
    id: "platform_hours",
    question: "What are the trading hours?",
    answer: "Trading hours depend on the instrument and market. Check the instrument schedule in the trading interface.",
    keywords: ["trading hours", "market"]
  },
  {
    id: "slippage_and_execution",
    question: "How is slippage handled?",
    answer: "Slippage and execution depend on market conditions and provider. PnL results reflect execution quality and are part of the simulation.",
    keywords: ["slippage", "execution"]
  },
  {
    id: "backtesting",
    question: "Is backtesting allowed or supported?",
    answer: "Backtesting is a permitted method for developing strategies but does not directly affect evaluation results which are live simulation based on the evaluation account.",
    keywords: ["backtesting", "strategy"]
  },
  {
    id: "faq_update_frequency",
    question: "How often is the FAQ updated?",
    answer: "FAQ and help center content are updated periodically as policies or products change. Check the help site for latest updates.",
    keywords: ["faq", "update"]
  },
  {
    id: "dispute_resolution",
    question: "How do I dispute an account action or result?",
    answer: "Open a support ticket with clear evidence and timestamps. The review team will examine account logs and provide a resolution per policy.",
    keywords: ["dispute", "support", "review"]
  },
  {
    id: "account_termination",
    question: "What leads to account termination?",
    answer: "Repeated breaches, fraud, unfair means or severe abuse of system rules can result in account termination after investigation.",
    keywords: ["termination", "fraud", "abuse"]
  },
  {
    id: "reporting_exploits",
    question: "How can I report an exploit or bug?",
    answer: "Report exploits or bugs through support with reproducible steps so the engineering team can investigate and patch issues.",
    keywords: ["exploit", "bug", "report"]
  },
  {
    id: "audit_logs",
    question: "Are there audit logs for actions?",
    answer: "Action logs and audit trails are kept for operational and review purposes. Access to logs is provided to support and review teams as required.",
    keywords: ["audit logs", "logs"]
  },
  {
    id: "community_guidelines",
    question: "Is there a code of conduct or community guideline?",
    answer: "Community guidelines promote fair trading behavior and mutual respect among users. Review the community rules on the site.",
    keywords: ["community", "guidelines"]
  },
  {
    id: "education_resources",
    question: "Are there educational materials available?",
    answer: "Yes. Tutorials, articles and guides are available in the help center to support traders during evaluation and beyond.",
    keywords: ["education", "tutorials", "guides"]
  },
  {
    id: "faq_indexing",
    question: "How are knowledge items indexed for search?",
    answer: "Knowledge items are embedded and indexed by vector similarity as well as by keyword for fast retrieval during queries.",
    keywords: ["index", "vector", "search"]
  },
  {
    id: "kb_editing",
    question: "How do I update the knowledge base?",
    answer: "Admin or approved editor roles can add or edit KB entries through the admin dashboard. Changes should follow the style guide for clarity.",
    keywords: ["kb", "edit", "admin"]
  },
  {
    id: "ingest_process",
    question: "What does ingestion do?",
    answer: "Ingestion embeds text into numerical vectors and upserts them into the vector store for semantic search by the assistant.",
    keywords: ["ingestion", "embed", "vector"]
  },
  {
    id: "how_to_trigger_reingest",
    question: "How do I reingest the KB after changes?",
    answer: "Run the ingestion script with the correct environment variables to push updated embeddings into the vector store and restart the service.",
    keywords: ["reingest", "script", "restart"]
  },
  {
    id: "kb_quality_guidelines",
    question: "What is the style for KB content to reduce hallucination?",
    answer: "Keep questions explicit, answers concise and evidence backed, include examples, add keywords and canonical numbers and avoid speculative language.",
    keywords: ["kb style", "hallucination", "guidelines"]
  },
  {
    id: "canonical_values",
    question: "How do I ensure the assistant uses canonical values like hold time?",
    answer: "Add canonical parameters into the knowledge prompt or a canonical section in KB with explicit numeric values so the assistant prefers them.",
    keywords: ["canonical", "hold time", "2 minutes"]
  },
  {
    id: "kb_versions",
    question: "Does the system track KB versions?",
    answer: "KB versioning can be implemented. Track changes in admin and record timestamps so ingestion reflects the latest approved version.",
    keywords: ["versions", "timestamp"]
  },
  {
    id: "kb_fallbacks",
    question: "What should the bot respond if KB lacks an answer?",
    answer: "If KB lacks an answer the bot should request clarification, offer related information, and escalate to support or named experts for human follow up.",
    keywords: ["fallback", "clarify", "escalate"]
  },
  {
    id: "test_search_queries",
    question: "How can I test KB coverage?",
    answer: "Run sample queries, measure vector match rates and check low confidence responses to identify missing or ambiguous KB items.",
    keywords: ["test", "queries", "coverage"]
  },
  {
    id: "kb_security",
    question: "Are KB entries public or restricted?",
    answer: "Some KB entries are public while others are internal. Admin roles control visibility per entry.",
    keywords: ["security", "visibility", "admin"]
  },
  {
    id: "contact_for_feature",
    question: "How do I request a new feature or KB topic?",
    answer: "Submit a request through the partner or support channel with clear use case and priority so it can be scheduled for content creation.",
    keywords: ["feature request", "kb topic"]
  },
  {
    id: "multiple_languages",
    question: "Does the knowledge base support multiple languages?",
    answer: "Multilingual support can be added by creating separate entries per language and ingesting language aware embeddings.",
    keywords: ["languages", "multilingual"]
  },
  {
    id: "troubleshooting_ingest",
    question: "What if ingestion fails with schema errors?",
    answer: "Check that the model schema allows metadata fields used during upsert, rebuild the dist files and re run the ingestion after cleaning the collection.",
    keywords: ["ingest", "schema", "error"]
  },
  {
    id: "contact_engineering",
    question: "Who do I contact about technical bugs in the bot?",
    answer: "Open a ticket with engineering details including logs, timestamps and reproduction steps so the engineering team can investigate.",
    keywords: ["engineering", "bug", "logs"]
  },

  // additional generically useful short rules to reach a broad coverage
  {
    id: "rule_example_01",
    question: "How does daily loss reset and what time is used?",
    answer: "Daily loss resets at zero zero zero zero UTC and calculations use the higher of starting equity or starting balance for the day.",
    keywords: ["daily reset", "00:00 UTC", "equity"]
  },
  {
    id: "rule_example_02",
    question: "What is the effect of closing trades on daily loss?",
    answer: "Closed trade results contribute to the day's closed PnL while floating PnL is considered as part of current equity for the daily check.",
    keywords: ["close trades", "pnl"]
  },
  {
    id: "rule_example_03",
    question: "What if internet disconnect affects orders?",
    answer: "Connectivity issues do not change rule enforcement. Trade execution and order state are recorded by the platform and reviewed if needed.",
    keywords: ["connectivity", "orders"]
  },
  {
    id: "rule_example_04",
    question: "Can an order placed before news be allowed?",
    answer: "Orders placed before a defined no trade window may remain valid but trades opened inside a no trade window are subject to policy and may be invalidated.",
    keywords: ["news", "no trade", "order"]
  },
  {
    id: "rule_example_05",
    question: "How are weekend trades treated in profit calculations?",
    answer: "Weekend held positions have pnl reflected when markets reopen and relevant rules use the current equity at daily reset points.",
    keywords: ["weekend", "pnl"]
  },
  {
    id: "rule_example_06",
    question: "What is the recommended way to prepare for evaluation?",
    answer: "Practice on similar demo accounts, build risk rules into your strategy, and review KB examples to ensure compliance with loss and daily rules.",
    keywords: ["prepare", "evaluation", "practice"]
  },
  {
    id: "rule_example_07",
    question: "Can I use automated strategies during evaluation?",
    answer: "Automation may be allowed if it does not violate unfair means policies. Ensure automation is stable and does not exploit platform behavior.",
    keywords: ["automation", "algo", "allowed"]
  },
  {
    id: "rule_example_08",
    question: "How to interpret a view only account?",
    answer: "A view only account indicates trading is suspended and you can only view positions and history. Contact support for next steps after a breach.",
    keywords: ["view only", "suspended"]
  },
  {
    id: "rule_example_09",
    question: "Do demo instruments match live market liquidity?",
    answer: "Demo instruments simulate market behavior but exact liquidity and execution may differ from live brokerage conditions.",
    keywords: ["demo", "liquidity"]
  },
  {
    id: "rule_example_10",
    question: "What should I include in a support ticket for a payout?",
    answer: "Include account id, pass confirmation, chosen payout method and any relevant screenshots or references to speed processing.",
    keywords: ["support ticket", "payout"]
  }
];

// note
// Paste this file into src/data/kb.ts
// Then run your ingestion with OPENAI_API_KEY and verify dist is rebuilt
// Example commands
// export OPENAI_API_KEY="sk-..."
// npm run build
// node dist/scripts/ingest-data.js
// Restart your app and test queries
