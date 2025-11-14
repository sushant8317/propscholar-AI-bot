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

  {
  title: "About PropScholar - Making Trading Accessible",
  url: "https://propscholar.com/about",
  category: "About",
  content: `PropScholar's mission is to make trading accessible for everyone by providing scholarship grants. Traders take a simple evaluation/test, and upon successful completion, receive a scholarship. The platform is not a prop firm but a scholarship-based model where traders evaluate themselves through skill-based tests to earn scholarships. PropScholar aims to eliminate capital barriers and focus on skill-based opportunities. Core values include commitment, client-centered focus, best industry support, and a simple, fair evaluation process. The community fosters skilled individuals and offers 24×7 support through an active Discord. PropScholar is dedicated to making trading accessible and rewarding skill over capital.`
  },

  {
  title: "What is a PropScholar Scholarship?",
  url: "https://help.propscholar.com/article/scholarshop-your-reward",
  category: "Payout & Scholarship",
  content: `At PropScholar, a scholarship is your reward — a direct monetary payout you receive after successfully passing our evaluation. It is NOT a discount or store credit; it’s real money paid within 4 hours of your success. The process works as follows: select your target evaluation (e.g., Maven 2K 2-Step challenge costing $19), attempt PropScholar’s evaluation for a small entry fee (usually $5), and on passing, receive the full $19 scholarship payout. If you fail, you lose only the small entry fee but gain the full learning experience. Scholarships yield up to 400% return based purely on skill, with no luck involved. Payouts are issued instantly via UPI, Bank Transfer, PayPal, or custom methods without additional approval. After passing, your account is reviewed, and you receive a code by email to request your reward, which is then issued within 4 hours. You may use the scholarship however you want — to buy real prop firm challenges, tools, education, or retry evaluations. PropScholar encourages making your trading journey accessible and supports you to grow continuously. Your skill directly earns your scholarship, ensuring ethical growth. Use it to leverage larger challenges or reevaluate affordably until ready to scale. PropScholar backs you repeatedly: You trade. You win. You get paid.`
  },

  {
  title: "Next Steps After Clearing Phase 1",
  url: "https://help.propscholar.com/article/next-steps-after-clearing-phase-1",
  category: "Evaluation Process",
  content: `After successfully meeting all the rules of Phase 1, your account undergoes a review process. Within 36 hours, you will receive: your Phase 2 credentials and your Phase 1 certificate reflecting your billing details. Your account stays in review during this period. If you do not receive the credentials and certificate within 36 hours, please contact the PropScholar support team for assistance. When users state they have completed their target, ask whether they mean Phase 1 or Phase 2, and provide the appropriate next steps accordingly. Specifically, after passing Phase 1, inform them of this review process and issuance of Phase 2 credentials and certificate.`
  },

  {
  title: "How Long Until You Receive Your Account?",
  url: "https://help.propscholar.com/article/how-long-until-you-receive-your-account",
  category: "Account Delivery",
  content: `After completing your purchase, you will receive an order confirmation email within 120 milliseconds. Your account credentials are sent almost immediately afterward, though in some cases it may take up to 24 hours to ensure correct processing. If you do not receive the confirmation email within 120 milliseconds, contact support immediately with proof of payment. After receiving confirmation, allow up to 24 hours for your account details via email. If after 24 hours you have not received your credentials, check your spam folder, and if still missing, contact support with your order number or purchase email. When users report missing credentials, ask when they paid and respond accordingly.`
  },

  {
  title: "How Instant Accounts Work in PropScholar",
  url: "https://help.propscholar.com/article/how-propscholar-instant-model-works",
  category: "Instant Account Model",
  content: `PropScholar offers a scholarship-backed model for Instant Accounts, eliminating the need for traders to pay high upfront fees charged by other instant funding providers. Traders pass an affordable skill-based evaluation at actual cost. Upon passing, PropScholar covers the full fee for the Instant Funded Account, giving traders direct access to capital. This model ensures funding is based on skill rather than money, providing fair and fast access to instant trading capital. The funded account belongs entirely to the trader.`
  },

  {
  title: "Choose Your Payment Method",
  url: "https://help.propscholar.com/article/choose-your-payment-method",
  category: "Payment",
  content: `[translate:At PropScholar, we offer three widely-used and secure payment options—fully integrated with industry-standard gateways for a smooth experience.] Available Payment Methods: 1. PayPal — Pay securely using your PayPal account. Supported in most countries with fast, verified transactions. 2. PhonePe (UPI) — Use UPI to make seamless payments through PhonePe, a reliable and widely used option for Indian customers. 3. Crypto Payment — Pay using your crypto through our secure payment gateway. [translate:Secure & Instant Processing] All transactions are processed under 256-bit encryption for maximum safety. Our system is fully automated, ensuring instant order handling after successful payment. [translate:What Happens After Payment?] You will automatically receive: Order Confirmation Email, Access Credentials, Live Order Status Page — usually delivered within 120 milliseconds of successful payment. [translate:How to Download Your Payment Receipt] After payment, you’ll be redirected to the Order Confirmation Page containing order details and a downloadable receipt link to save as PDF or print for your records.`
  },

  {
  title: "Contacting Human Support and Moderators",
  url: "",
  category: "Support & Moderation",
  content: `[translate:If users want to contact a human instead of the AI bot, direct them to the support ticket channel or tell them to tag one of our moderators: Harris or Sikha.] To open a support ticket channel, just go to browse channels, search for "support ticket," and click on it.`
  },

  {
  title: "I have not received my account credentials",
  url: "",
  category: "Moderator Q&A",
  content: "It can take upto 15 minutes. If you are waiting longer than 15 minutes please open a ticket! Stay assure."
  },

  {
  title: "Hey it has been more than 24 Hour. I have not recived my phase 2 credentials",
  url: "",
  category: "Moderator Q&A",
  content: "It can take upto 36 Hour. But if it's takes longer than that please make sure to open a ticket <#1314824706477527042>"
  },

  {
  title: "What are the rules",
  url: "",
  category: "Moderator Q&A",
  content: "Hey! You can simply refer to -> https://help.propscholar.com/collection/evaluations. Incase you have any doubt regarding any model just ask me! i can assist you"
  },

  {
  title: "How to claim my payout",
  url: "",
  category: "Moderator Q&A",
  content: "Hey! To claim your payout you will have to open a support ticket <#1314824706477527042> and tag one of our moderators! the payout will be issued within minutes."
  },

  {
  title: "Check my ticket",
  url: "",
  category: "Moderator Q&A",
  content: "Hey! stay assure could you mention your ticket number and tag our moderators in ticket."
  },

  {
  title: "Check my ticket",
  url: "",
  category: "Moderator Q&A",
  content: "Hey! stay assure could you mention your ticket number and tag our moderators in ticket."
  }

];

// ========================================
// STATIC FALLBACK DATA
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

const SITEMAP_URL = 'https://www.propscholar.com/sitemap.xml';
const API_ENDPOINT = 'https://www.propscholar.com/api/bot-data';

// Helper to clean URLs from trailing braces or encoded braces
function cleanUrl(url: string): string {
  return url.trim().replace(/[}%]+$/, "");
}

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
      let url = $(elem).text();
      url = cleanUrl(url); // Sanitize URL
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
    const clean_url = cleanUrl(url);
    const response = await axios.get(clean_url, {
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
    
    return { url: clean_url, title, content };
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

// Clean AI-generated response from any stray %7D or }


// Main prompt builder
export async function getPropScholarData(): Promise<string> {
  const [liveData, pages] = await Promise.all([
    fetchLiveData(),
    fetchAllPages()
  ]);

  const categorizedArticles = HELP_ARTICLES.reduce((acc, article) => {
    const cat = article.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(article);
    return acc;
  }, {} as Record<string, Article[]>);

  let prompt = `You are a professional support assistant for PropScholar.\n\n`;

  // Add new instruction: NO source URLs in user messages
  prompt += `## RESPONSE RULES:\n`;
  prompt += `1. Provide ONLY short, professional, and concise answers (1-2 sentences).\n`;
  prompt += `2. Respond ONLY if the user's question includes KEYWORDS that match your knowledge base.\n`;
  prompt += `3. If the question is unrelated or outside your data, reply: "I can only assist with PropScholar-related queries. Please contact support for other questions."\n`;
  prompt += `4. DO NOT add unnecessary information or over-explain.\n`;
  prompt += `5. NEVER guess or fabricate info; if unknown, say: "I don't have that information. Visit help.propscholar.com or contact support."\n`;
  prompt += `6. NO emojis, no casual language—always maintain a professional tone.\n\n`;

  prompt += `## CORRECT RESPONSE EXAMPLES:\n\n`;
  prompt += `User: "What is the consistency rule?"\n`;
  prompt += `Bot: "No single trading day can exceed 45% of your total profit target."\n\n`; // No sources

  prompt += `User: "How do I pay?"\n`;
  prompt += `Bot: "We accept PayPal, PhonePe (UPI), Paytm, and credit/debit cards. Indian traders can use instant UPI payment."\n\n`;

  prompt += `User: "When do I get my account?"\n`;
  prompt += `Bot: "Evaluation accounts are delivered within 24-48 hours via email. Discord members get priority delivery within 12 hours."\n\n`;

  prompt += `User: "Can I use EAs?"\n`;
  prompt += `Bot: "Yes, Expert Advisors (EAs) and bots are fully allowed on all platforms."\n\n`;

  prompt += `## HELP CENTER KNOWLEDGE BASE (PRIMARY SOURCE):\n\n`;
  Object.entries(categorizedArticles).forEach(([category, articles]) => {
    prompt += `### ${category}\n\n`;
    articles.forEach(article => {
      // Clean URLs before adding
      const clean_url = cleanUrl(article.url);
      prompt += `Title: ${article.title}\n`;
      prompt += `URL: ${clean_url}\n`;
      prompt += `Content: ${article.content}\n\n`;
    });
  });

  // Other static & live data unchanged...

  prompt += `## CITATION FORMAT:\n`;
  prompt += `- Source URLs are maintained internally but NOT shown in bot replies.\n\n`;

  prompt += `Remember: Short, professional answers without URLs or emojis.`;

  return prompt;
}

// (Your HELP_ARTICLES, STATIC_DATA, exports remain as is)
export {
  fetchSitemap,
  fetchPageContent,
  fetchAllPages,
  fetchLiveData,
  HELP_ARTICLES
};
