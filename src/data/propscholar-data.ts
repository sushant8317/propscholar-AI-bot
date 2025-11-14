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

  // ... other articles (kept as in your original file)
  {
    title: "Plus vs Standard Model - Key Differences",
    url: "https://help.propscholar.com",
    category: "Evaluations",
    content: `CRITICAL COMPARISON: PropScholar offers TWO model types - Plus and Standard - available in both 1-Step and 2-Step formats. PLUS MODEL (both 1-Step Plus and 2-Step Plus): NO consistency rule, HAS minimum 3 profitable days requirement, HAS average holding time 2 minutes minimum (soft breach if done first time second time if repeated will result in hard breach). STANDARD MODEL (both 1-Step Standard and 2-Step Standard): HAS 45% consistency rule (no single day exceeds 45% of total profit), NO minimum profitable days requirement, NO average holding time requirement. When answering questions, ALWAYS compare both models. Example: If asked about minimum profitable days, answer: PropScholar Plus models (1-Step Plus and 2-Step Plus) require minimum 3 profitable days, but Standard models (1-Step Standard and 2-Step Standard) have NO minimum profitable days requirement. Example: If asked about consistency rule, answer: PropScholar Standard models (1-Step Standard and 2-Step Standard) have 45% consistency rule, but Plus models (1-Step Plus and 2-Step Plus) have NO consistency rule. Example: If asked about news trading, answer: Both Plus and Standard models allow news trading with no restrictions. This applies to all four evaluation types: 1-Step Standard, 1-Step Plus, 2-Step Standard, and 2-Step Plus.`
  },

  // truncated for brevity in this snippet — keep the rest of the HELP_ARTICLES exactly as you have them
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
  return url ? url.trim().replace(/[}%]+$/, "") : "";
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

// Main prompt builder (keeps your original behaviour)
export async function getPropScholarData(): Promise<string> {
  const [liveData, pages] = await Promise.all([
    fetchLiveData(),
    fetchAllPages()
  ]);

  const categorizedArticles = HELP_ARTICLES.reduce((acc, article) => {
    const cat = article.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(article);
    return acc;
  }, {} as Record<string, Article[]>);

  let prompt = `You are a professional support assistant for PropScholar.\n\n`;

  prompt += `## RESPONSE RULES:\n`;
  prompt += `1. Provide ONLY short, professional, and concise answers (1-2 sentences).\n`;
  prompt += `2. Respond ONLY if the user's question includes KEYWORDS that match your knowledge base.\n`;
  prompt += `3. If the question is unrelated or outside your data, reply: "I can only assist with PropScholar-related queries. Please contact support for other questions."\n`;
  prompt += `4. DO NOT add unnecessary information or over-explain.\n`;
  prompt += `5. NEVER guess or fabricate info; if unknown, say: "I don't have that information. Visit help.propscholar.com or contact support."\n`;
  prompt += `6. NO emojis, no casual language—always maintain a professional tone.\n\n`;

  prompt += `## CORRECT RESPONSE EXAMPLES:\n\n`;
  prompt += `User: "What is the consistency rule?"\n`;
  prompt += `Bot: "No single trading day can exceed 45% of your total profit target."\n\n`;

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
      const clean_url = cleanUrl(article.url);
      prompt += `Title: ${article.title}\n`;
      prompt += `URL: ${clean_url}\n`;
      prompt += `Content: ${article.content}\n\n`;
    });
  });

  prompt += `## CITATION FORMAT:\n`;
  prompt += `- Source URLs are maintained internally but NOT shown in bot replies.\n\n`;
  prompt += `Remember: Short, professional answers without URLs or emojis.`;

  return prompt;
}

// =====================
// NEW: export propScholarData constant (shaped for ingest script)
// =====================
// Build an object: { [category]: [{ question, answer, keywords? }, ...] }
export const propScholarData = HELP_ARTICLES.reduce((acc, a) => {
  const cat = a.category || 'General';
  if (!acc[cat]) acc[cat] = [];
  // Convert article into a Q/A-like item for ingestion
  acc[cat].push({
    question: a.title,
    answer: a.content,
    keywords: [] as string[]
  });
  return acc;
}, {} as Record<string, Array<{ question: string; answer: string; keywords?: string[] }>>);

// (keep exporting helper utilities and raw articles)
export {
  fetchSitemap,
  fetchPageContent,
  fetchAllPages,
  fetchLiveData,
  HELP_ARTICLES
};
