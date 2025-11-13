import axios from 'axios';
import * as cheerio from 'cheerio';

// ========================================
// MANUAL KNOWLEDGE BASE - Help Center Articles
// ========================================
const HELP_ARTICLES = [
  {
    title: "Understanding the PropScholar Model",
    url: "https://help.propscholar.com/propscholars-model",
    category: "Getting Started",
    content: `PropScholar is a skill-evaluation platform offering simulated trading challenges on demo accounts only. No real-money trading, no brokerage services, no financial advice. Here's how it works: Select an evaluation (e.g., Maven 2K 2-Step normally costs $19), pay a small entry fee ($5 instead of $19), and pass our evaluation to receive a direct scholarship payout of $19 via UPI, crypto, or bank transfer. If you fail, you only lose the small entry fee. If you pass, you earn 4x your entry fee as a scholarship within 4 hours - no additional phases. We're not a broker and don't handle real money, provide investment advice, or resell prop firm accounts. All challenges are conducted in a virtual environment using demo accounts. Rewards are performance-based scholarships paid directly to you after you pass our evaluation.`
  },

  {
    title: "PropScholar Plus - 2 Step",
    url: "https://help.propscholar.com/article/no-consistency-model-2-step",
    category: "Evaluations",
    content: `PropScholar Plus is a 2-step evaluation with NO consistency rule. PHASE 1 (Examinee Phase): Profit target 8%, leverage 1:100, no time limit. PHASE 2 (Scholar Phase): Profit target 5%, leverage 1:100, no time limit. RISK RULES: Maximum Loss Limit is 8% of initial account size (hard breach). Example: $100,000 account cannot drop below $92,000. Daily Loss Limit is 4% based on higher value between starting equity or balance (hard breach, resets daily at 00:00 UTC). Example: Day starts with $105,000 balance and $107,000 equity, equity cannot fall below $102,720 that day. GENERAL RULES: No lot limit. Minimum 3 profitable days required (you can also place small lots like 0.01 to fulfill). Weekend holding allowed. No news trading restrictions. No time limit on phases. 14 days inactivity limit. Average holding time minimum 2 minutes (soft breach + This rule is only unique to plus accounts (1 STEP AND 2 STEP Both) This rule is not in standard model). Copy trading between two PropScholar accounts not allowed. Tick scalping, glitch exploitation, and insider signals prohibited. KEY DIFFERENCE: This model has NO consistency rule and includes minimum profitable days requirement with average holding time soft breach for the first time and if done again may result in hard breach.`
  },

  {
  title: "PropScholar Plus - 1 Step",
  url: "https://help.propscholar.com/article/no-consistency-1-step",
  category: "Evaluations",
  content: `PropScholar Plus 1-Step is a single-phase evaluation with NO consistency rule. PHASE 1 (Scholar Phase - only phase): Profit target 10%, leverage 1:50 (PropScholar has 1:50 Leverage on 1 STEP account regardless if its a plus account or standard), no time limit. RISK RULES: Maximum Loss Limit is 6% of initial account size (hard breach). Example: $100,000 account cannot drop below $94,000. Daily Loss Limit is 3% based on higher value between starting equity or balance (hard breach, resets daily at 00:00 UTC). Example: Day starts with $105,000 balance and $107,000 equity, equity cannot fall below $103,790 that day. GENERAL RULES: No lot limit. Minimum 3 profitable days required. Weekend holding allowed. No news trading restrictions. No time limit. 14 days inactivity limit. Average holding time minimum 2 minutes (soft breach + This rule is only unique to plus accounts (1 STEP AND 2 STEP Both) This rule is not in standard model). Copy trading between two PropScholar accounts not allowed. Tick scalping, glitch exploitation, and insider signals prohibited. KEY DIFFERENCE: This is a 1-step model (complete in single phase) with NO consistency rule, minimum profitable days requirement, and average holding time soft breach for the first time and if done again may result in hard breach.`
  },

  {
  title: "PropScholar 1 Step (Standard)",
  url: "https://help.propscholar.com/article/1-step-evaluation",
  category: "Evaluations",
  content: `PropScholar 1-Step STANDARD model (NOT Plus) is a single-phase evaluation WITH consistency rule. PHASE 1 (Scholar Phase - only phase): Profit target 10%, leverage 1:100, no time limit. RISK RULES: Maximum Loss Limit is 6% of initial account size (hard breach). Example: $100,000 account cannot drop below $94,000. Daily Loss Limit is 3% based on higher value between starting equity or balance (hard breach, resets daily at 00:00 UTC). Example 1: Day starts with $105,000 balance and $107,000 equity, equity cannot fall below $103,790 that day. Example 2: Day starts with $100,000 balance and $99,000 equity, equity cannot fall below $97,000 that day. GENERAL RULES: No lot limit. Weekend holding allowed. No news trading restrictions. No time limit. Consistency Rule REQUIRED: No single day can exceed 45% of total profit (You can pass a phase in 3 days!). Copy trading between two PropScholar accounts not allowed. Tick scalping, glitch exploitation, and insider signals prohibited. KEY DIFFERENCE: This is the STANDARD 1-Step model (NOT Plus), Standard Model have consistency rule and dont have any minimum holding time rule while PLUS MODEL (BOTH 1 STEP AND 2 STEP DONT HAVE ANY CONSISTENCY RULE BUT DO HAVE MINIMUM HOLDING RULE) all the rules except that is same in standard and plus model`
  },

  {
  title: "PropScholar 2 Step (Standard)",
  url: "https://help.propscholar.com/article/2-step-evaluation",
  category: "Evaluations",
  content: `PropScholar 2-Step STANDARD model (NOT Plus) is a two-phase evaluation WITH consistency rule. PHASE 1 (Examinee Phase): Profit target 8%, leverage 1:100, no time limit. PHASE 2 (Scholar Phase): Profit target 5%, leverage 1:100, no time limit. RISK RULES: Maximum Loss Limit is 8% of initial account size (hard breach). Example: $100,000 account cannot drop below $92,000. Daily Loss Limit is 4% based on higher value between starting equity or balance (hard breach, resets daily at 00:00 UTC). Example 1: Day starts with $105,000 balance and $107,000 equity, equity cannot fall below $102,720 that day. Example 2: Day starts with $100,000 balance and $99,000 equity, equity cannot fall below $96,000 that day. GENERAL RULES: No lot limit. Weekend holding allowed. No news trading restrictions. No time limit on phases. 14 days inactivity limit. Consistency Rule REQUIRED: No single day can exceed 45% of total profit. Copy trading between two PropScholar accounts not allowed. Tick scalping, glitch exploitation, and insider signals prohibited. KEY DIFFERENCE: This is the STANDARD 2-Step model (NOT Plus) with leverage 1:100 and HAS 45% consistency rule requirement, unlike the Plus version which has NO consistency rule, requires 3 minimum profitable days, and has 2 minute average holding time soft breach.`
  },

  {
    title: "Plus vs Standard Model - Key Differences",
    url: "https://help.propscholar.com",
    category: "Evaluations",
    content: `CRITICAL COMPARISON: PropScholar offers TWO model types - Plus and Standard - available in both 1-Step and 2-Step formats. PLUS MODEL (both 1-Step Plus and 2-Step Plus): NO consistency rule, HAS minimum 3 profitable days requirement, HAS average holding time 2 minutes minimum (soft breach if done first time second time if repeated will result in hard breach). STANDARD MODEL (both 1-Step Standard and 2-Step Standard): HAS 45% consistency rule (no single day exceeds 45% of total profit), NO minimum profitable days requirement, NO average holding time requirement. When answering questions, ALWAYS compare both models. Example: If asked about minimum profitable days, answer: PropScholar Plus models (1-Step Plus and 2-Step Plus) require minimum 3 profitable days, but Standard models (1-Step Standard and 2-Step Standard) have NO minimum profitable days requirement. Example: If asked about consistency rule, answer: PropScholar Standard models (1-Step Standard and 2-Step Standard) have 45% consistency rule, but Plus models (1-Step Plus and 2-Step Plus) have NO consistency rule. Example: If asked about news trading, answer: Both Plus and Standard models allow news trading with no restrictions. This applies to all four evaluation types: 1-Step Standard, 1-Step Plus, 2-Step Standard, and 2-Step Plus.`
  },

  {
  title: "Average Holding Time - PropScholar Plus Model",
  url: "https://help.propscholar.com/article/average-holding-time-propscholar-plus",
  category: "Evaluation Rules",
  content: `Average Holding Time rule applies ONLY to PropScholar Plus Model (1-Step Plus and 2-Step Plus), NOT Standard models. Minimum average holding time is 2 minutes. This does NOT mean every single trade must be held for exactly 2 minutes - it means most trades should average more than 2 minutes across your trading history. Example: If you take 10 trades, your average holding time should be above 2 minutes. SOFT BREACH CONDITION: If your average holding time drops below 2 minutes, it is a soft breach - your account will be reset but NOT permanently breached or terminated. STOP LOSS EXCEPTION: If a trade hits Stop Loss (SL) within 2 minutes, it is accepted and does NOT count negatively against the average, since quick SL hits are normal. SUMMARY: Minimum average 2+ minutes per trade. Below 2 minutes = soft breach (reset, not terminated). SL hits under 2 minutes are accepted. Purpose is to ensure real market engagement and avoid ultra-short scalping. This rule exists in Plus models ONLY, Standard models have NO average holding time requirement.`
  },

  {
  title: "Toxic Trading Flow - Prohibited Behaviors",
  url: "https://help.propscholar.com/article/toxic-trading-flow",
  category: "Evaluation Rules",
  content: `Toxic trading refers to risky, impulsive trading behaviors that endanger trader accounts and firm stability. PROHIBITED BEHAVIORS: 1) Excessive Risk-Taking (Over-Leveraging): Trading with disproportionately high risk, excessive leverage, overexposure or full margin use. 2) Gambling Behavior: Emotion-driven trading, pursuing losses, impulsive trades, addictive patterns. Splitting one trade into multiple positions counts as single trade. 3) Overtrading: Continuously entering/exiting trades without clear strategy, causing diminished profitability and emotional exhaustion. 4) High-Frequency Trading (HFT) and Tick Scalping: Excessive rapid trading with higher volatility risking significant losses. 5) Arbitrage (all forms prohibited): Hedge Arbitrage (opposing positions with different firms simultaneously) and Latency Arbitrage (exploiting execution time differences across platforms for price disparities). 6) Poor Money Management: Frequent margin calls, inadequate funds, risky positions showing lack of risk management. 7) Behavioral Patterns: Trading during non-liquid hours to exploit liquidity shortages, consistently ignoring risk management, emotional decisions. 8) Reverse Trading: Risking full daily loss on one trade, indicates reverse trading between firms. 9) Martingale: Adding positions in drawdown to recover losses. Example: First trade loses, you open larger position same direction, continue adding trades expecting reversal. CONSEQUENCES: If toxic trading detected, account is BREACHED immediately and termination email sent. Account CANNOT be recovered under any circumstances once breached for toxic trading. PropScholar collects trading flow data during evaluations to improve operations and maintain stable trading environment.`
  },

  {
  title: "Forbidden Strategies in PropScholar",
  url: "https://help.propscholar.com/article/forbidden-statergies-in-propscholar",
  category: "Evaluation Rules",
  content: `PropScholar allows trading freedom - scalping, intraday, or swing trading - with no restrictions on lot size or timing. However, unfair, manipulative, or exploitative strategies are STRICTLY PROHIBITED. FORBIDDEN STRATEGIES (immediate termination if used): 1) Gap trading, 2) High-frequency trading (HFT), 3) Averaging Positions, 4) Server spamming, 5) Martingale, 6) Latency arbitrage, 7) Toxic trading flow, 8) Hedging across accounts, 9) Long-short arbitrage, 10) Reverse arbitrage, 11) Tick scalping, 12) Server execution abuse, 13) Opposite account trading, 14) Copy trading between PropScholar accounts, 15) Third-party account management. EXPERT ADVISORS (EAs): You may ONLY use third-party EAs that function as trade managers or risk managers. Signal-following bots, scalpers, or execution manipulators are NOT allowed. Using prohibited EAs results in denial of evaluation/reward and account closure. CONSEQUENCES: Engaging in any forbidden strategy leads to immediate termination of evaluation and disqualification from PropScholar program. PropScholar is skill-based - you don't pay full challenge price, but cheating is not tolerated.`
  },

  {
  title: "45% Consistency Rule Explained",
  url: "https://help.propscholar.com/article/all-about-consistency-rule",
  category: "Evaluation Rules",
  content: `The 45% consistency rule applies to PropScholar STANDARD models ONLY (1-Step Standard and 2-Step Standard), NOT Plus models. This rule ensures profits are generated in balanced, steady manner rather than from single high-profit day. NO individual trading day should contribute more than 45% of your total profit target during evaluation. This assesses consistency, discipline, and trading skill across multiple sessions. EXAMPLE: $5,000 account with 8% profit target equals $400 total target. To comply with 45% rule, no single day can contribute more than $180 (which is 45% of $400). If you earn more than $180 in one day, account will breach the consistency rule. BENEFITS OF THIS RULE: Encourages steady and disciplined trading. Prevents overtrading and emotional decision-making. Reduces reliance on single high-risk trades. Builds strong, repeatable trading habits. Promotes long-term profitability and skill development. REMINDER: Plus models (1-Step Plus and 2-Step Plus) have NO consistency rule, while Standard models (1-Step Standard and 2-Step Standard) REQUIRE 45% consistency compliance.`
  },

  {
  title: "What Happens If I Breach a Trading Objective",
  url: "https://help.propscholar.com/article/what-happens-if-i-breach-a-trading-objective",
  category: "Evaluation Rules",
  content: `If you breach any trading objective, you will receive an email by 00:00 UTC next day. All open trades will be closed immediately, and any active limit or stop orders will be canceled. Your account credentials will no longer be active. BREACH EMAIL DETAILS: You will receive an email detailing the exact reason for breach, including which rule was violated, when it occurred, and how it impacted your account. This ensures full transparency and helps you understand what went wrong. Account becomes inactive after breach and cannot be recovered. All trading activity stops immediately once breach is detected.`
  },
];

// ========================================
// STATIC FALLBACK DATA
// ========================================
const STATIC_DATA = {
  about: "PropScholar is India's most affordable prop trading firm. Start trading with our capital from just $5! We provide trading capital, tools, and education so anyone can become a professional trader.",
  
  features: [
    "Start with just $5 - lowest in India!",
    "Lightning-fast 4-hour payouts (not 14 days like competitors)",
    "Zero-spread accounts for better execution",
    "Free demo accounts forever",
    "Professional MT4/MT5 dashboards",
    "Instant breach alerts via Discord",
    "EAs & bots fully allowed",
    "No hidden fees ever",
    "80% profit share - keep $80 of every $100 you make"
  ],
  
  targetMarkets: [
    "Primary markets: India and Nigeria",
    "Retail traders looking for affordable entry",
    "Small prop firms seeking partnerships"
  ],
  
  valueProposition: "Trade with our capital, keep 80% profits. Start from $5!"
};

// ========================================
// INTERFACES
// ========================================
interface Article {
  title: string;
  url: string;
  category: string;
  content: string;
}

interface PropScholarAPIData {
  pricing?: string[];
  features?: string[];
  updates?: string[];
  [key: string]: any;
}

interface PageContent {
  url: string;
  title: string;
  content: string;
}

// ========================================
// CONFIGURATION
// ========================================
const SITEMAP_URL = 'https://www.propscholar.com/sitemap.xml';
const API_ENDPOINT = 'https://www.propscholar.com/api/bot-data';

// ========================================
// WEBSITE SCRAPING FUNCTIONS (ORIGINAL)
// ========================================
async function fetchSitemap(): Promise<string[]> {
  try {
    console.log('📡 Fetching sitemap from PropScholar.com...');
    const response = await axios.get(SITEMAP_URL, { 
      timeout: 8000,
      headers: { 'User-Agent': 'PropScholar-Discord-Bot' }
    });
    
    const $ = cheerio.load(response.data, { xmlMode: true });
    const urls: string[] = [];
    
    $('url loc').each((i, elem) => {
      const url = $(elem).text();
      if (url && !url.includes('.xml')) {
        urls.push(url);
      }
    });
    
    console.log(`✅ Found ${urls.length} pages in sitemap`);
    return urls.slice(0, 20);
  } catch (error) {
    console.log('⚠️ Could not fetch sitemap, using fallback');
    return [
      'https://www.propscholar.com/',
      'https://www.propscholar.com/pricing',
      'https://www.propscholar.com/about',
      'https://www.propscholar.com/features'
    ];
  }
}

async function fetchPageContent(url: string): Promise<PageContent | null> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'PropScholar-Discord-Bot' }
    });
    
    const $ = cheerio.load(response.data);
    const title = $('title').text() || $('h1').first().text() || '';
    
    $('script, style, nav, footer, header').remove();
    const content = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000);
    
    return { url, title, content };
  } catch (error) {
    console.log(`❌ Failed to fetch: ${url}`);
    return null;
  }
}

async function fetchAllPages(): Promise<PageContent[]> {
  const urls = await fetchSitemap();
  console.log(`📄 Fetching content from ${urls.length} pages...`);
  
  const pages: PageContent[] = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`📄 [${i + 1}/${urls.length}] Fetching: ${url}`);
    
    try {
      const pageData = await fetchPageContent(url);
      if (pageData) {
        pages.push(pageData);
        console.log(`✅ [${i + 1}/${urls.length}] Success: ${pageData.title}`);
      } else {
        console.log(`⚠️ [${i + 1}/${urls.length}] Skipped: ${url}`);
      }
    } catch (error) {
      console.log(`❌ [${i + 1}/${urls.length}] Failed: ${url}`);
    }
  }
  
  console.log(`✅ Successfully fetched ${pages.length} pages`);
  return pages;
}

async function fetchLiveData(): Promise<PropScholarAPIData | null> {
  try {
    console.log('📡 Fetching live API data...');
    const response = await axios.get(API_ENDPOINT, {
      timeout: 5000,
      headers: { 'User-Agent': 'PropScholar-Discord-Bot' }
    });
    
    console.log('✅ Live API data fetched');
    return response.data;
  } catch (error) {
    console.log('⚠️ API not available, using website data');
    return null;
  }
}

// ========================================
// MAIN FUNCTION - Build System Prompt
// ========================================
export async function getPropScholarData(): Promise<string> {
  // Fetch live data from website and API
  const [liveData, pages] = await Promise.all([
    fetchLiveData(),
    fetchAllPages()
  ]);
  
  // Group help articles by category
  const categorizedArticles = HELP_ARTICLES.reduce((acc, article) => {
    const cat = article.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(article);
    return acc;
  }, {} as Record<string, Article[]>);
  
  let prompt = `You are a professional support assistant for PropScholar.\n\n`;

  prompt += `## RESPONSE RULES:\n`;
  prompt += `1. Give short, direct answers (1-3 sentences)\n`;
  prompt += `2. Be professional and helpful - NO emojis\n`;
  prompt += `3. Always cite sources: "Source: [URL]"\n`;
  prompt += `4. Do not add characters (brackets, braces, etc.) after any URL in your response.\n`;
  prompt += `5. If info not in knowledge base: "I don't have that information. Visit help.propscholar.com or contact support."\n`;
  prompt += `6. Never make up information\n\n`;

  prompt += `## CORRECT RESPONSE EXAMPLES:\n\n`;
  prompt += `User: "What is the consistency rule?"\n`;
  prompt += `Bot: "No single trading day can exceed 45% of your total profit target. For example, on a $5,000 account with an 8% ($400) target, no day can exceed $180 profit. Source: https://help.propscholar.com/article/all-about-consistency-rule"\n\n`;
  prompt += `User: "How do I pay?"\n`;
  prompt += `Bot: "We accept PayPal, PhonePe (UPI), Paytm, and credit/debit cards. Indian traders can use instant UPI payment. Source: https://help.propscholar.com/article/payment-methods"\n\n`;
  prompt += `User: "When do I get my account?"\n`;
  prompt += `Bot: "Evaluation accounts are delivered within 24-48 hours via email. Discord members get priority delivery within 12 hours. Source: https://help.propscholar.com/article/account-delivery"\n\n`;
  prompt += `User: "Can I use EAs?"\n`;
  prompt += `Bot: "Yes, Expert Advisors (EAs) and bots are fully allowed on all platforms. Source: https://help.propscholar.com/article/platforms"\n\n`;

  prompt += `## HELP CENTER KNOWLEDGE BASE (PRIMARY SOURCE):\n\n`;
  Object.entries(categorizedArticles).forEach(([category, articles]) => {
    prompt += `### ${category}\n\n`;
    articles.forEach(article => {
      prompt += `Title: ${article.title}\n`;
      prompt += `URL: ${article.url}\n`; // never ends with %, }, or other stray symbol!
      prompt += `Content: ${article.content}\n\n`;
    });
  });

  // [rest of the code unchanged, including static company info, live data, extra website context...]

  prompt += `## CITATION FORMAT:\n`;
  prompt += `Always end responses with: "Source: [exact URL]"\n`;
  prompt += `Example: Source: https://help.propscholar.com/article/account-delivery\n`;
  prompt += `Do NOT include any characters such as } or %7D after the URL.\n`;
  prompt += `For multiple sources: "Sources: [URL1], [URL2]"\n\n`;

  prompt += `Remember: Short, professional, cite sources, no emojis, and NO strange characters after URLs.`;

  return prompt;
}

// ========================================
// HELPER FUNCTIONS
// ========================================
export function searchArticles(query: string): Article[] {
  const lowerQuery = query.toLowerCase();
  return HELP_ARTICLES.filter(article => 
    article.title.toLowerCase().includes(lowerQuery) ||
    article.content.toLowerCase().includes(lowerQuery) ||
    article.category.toLowerCase().includes(lowerQuery)
  );
}

export function getAllArticles(): Article[] {
  return HELP_ARTICLES;
}

// Clean URLs in final bot output before sending!
export function cleanBotResponse(text: string) {
  return text.replace(/(%7D|\})+/g, ""); // Removes any stray %7D or }
}

// ========================================
// EXPORTS
// ========================================

export { 
  fetchSitemap, 
  fetchPageContent, 
  fetchAllPages,
  HELP_ARTICLES,
  STATIC_DATA, 
};
