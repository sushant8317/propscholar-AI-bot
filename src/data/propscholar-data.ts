import axios from 'axios';
import * as cheerio from 'cheerio';

// ========================================
// TYPES
// ========================================
export interface Article {
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
// MANUAL KNOWLEDGE BASE - FULL HELP CENTER ARTICLES
// ========================================
const HELP_ARTICLES: Article[] = [
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
    content: `PropScholar Plus is a 2-step evaluation with NO consistency rule. PHASE 1 (Examinee Phase): Profit target 8%, leverage 1:100, no time limit. PHASE 2 (Scholar Phase): Profit target 5%, leverage 1:100, no time limit. RISK RULES: Maximum Loss Limit is 8% of initial account size (hard breach). Example: $100,000 account cannot drop below $92,000. Daily Loss Limit is 4% based on higher value between starting equity or balance (hard breach, resets daily at 00:00 UTC). Example: Day starts with $105,000 balance and $107,000 equity, equity cannot fall below $102,720 that day. GENERAL RULES: No lot limit. Minimum 3 profitable days required. Weekend holding allowed. No news trading restrictions. No time limit on phases. 14 days inactivity limit. Average holding time minimum 2 minutes (soft breach). Copy trading between two PropScholar accounts not allowed. Tick scalping and glitch exploitation prohibited.`
  },

  {
    title: "PropScholar Plus - 1 Step",
    url: "https://help.propscholar.com/article/no-consistency-1-step",
    category: "Evaluations",
    content: `PropScholar Plus 1-Step is a single-phase evaluation with NO consistency rule. Profit target 10%, leverage 1:50, no time limit. Maximum Loss Limit 6%. Daily Loss Limit 3% (resets 00:00 UTC). Minimum 3 profitable days required. Average holding time minimum 2 minutes (soft breach). Weekend holding allowed. No news restrictions.`
  },

  {
    title: "PropScholar 1 Step (Standard)",
    url: "https://help.propscholar.com/article/1-step-evaluation",
    category: "Evaluations",
    content: `PropScholar 1-Step STANDARD model has a 10% target, 1:100 leverage, and NO time limit. Maximum Loss 6%. Daily Loss 3% (resets 00:00 UTC). Consistency Rule REQUIRED: No single day may exceed 45% of total profit. No minimum holding time.`
  },

  {
    title: "PropScholar 2 Step (Standard)",
    url: "https://help.propscholar.com/article/2-step-evaluation",
    category: "Evaluations",
    content: `PropScholar 2-Step STANDARD model includes Phase 1 (8%) and Phase 2 (5%). Max Loss 8%. Daily Loss 4% based on higher equity or balance. Consistency Rule REQUIRED: No single day exceeds 45% of total profit. No holding time rule.`
  },

  {
    title: "Plus vs Standard Model - Key Differences",
    url: "https://help.propscholar.com",
    category: "Evaluations",
    content: `PLUS MODEL: No consistency rule, requires 3 profitable days, requires 2 minute AVG holding time. STANDARD MODEL: Requires 45% consistency rule, NO minimum days, NO holding time rule. Both allow weekend holding and news trading.`
  },
];

// ========================================
// SITEMAP + WEB CRAWLING
// ========================================
const SITEMAP_URL = "https://www.propscholar.com/sitemap.xml";
const API_ENDPOINT = "https://www.propscholar.com/api/bot-data";

function cleanUrl(url: string): string {
  return url?.trim().replace(/[}%]+$/, "") ?? "";
}

async function fetchSitemap(): Promise<string[]> {
  try {
    const response = await axios.get(SITEMAP_URL, {
      timeout: 8000,
      headers: { "User-Agent": "PropScholar-Discord-Bot" },
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const urls: string[] = [];

    $("url loc").each((_i, elem) => {
      let url = $(elem).text();
      url = cleanUrl(url);
      if (url && !url.includes(".xml")) urls.push(url);
    });

    return urls.slice(0, 20);
  } catch {
    return [
      "https://www.propscholar.com/",
      "https://www.propscholar.com/pricing",
      "https://www.propscholar.com/about",
      "https://www.propscholar.com/features",
    ];
  }
}

async function fetchPageContent(url: string): Promise<PageContent | null> {
  try {
    const clean_url = cleanUrl(url);

    const response = await axios.get(clean_url, {
      timeout: 5000,
      headers: { "User-Agent": "PropScholar-Discord-Bot" },
    });

    const $ = cheerio.load(response.data);

    const title = $("title").text() || $("h1").first().text() || "";

    $("script, style, nav, footer, header").remove();

    const content = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 1000);

    return { url: clean_url, title, content };
  } catch {
    return null;
  }
}

async function fetchAllPages(): Promise<PageContent[]> {
  const urls = await fetchSitemap();

  const pages: PageContent[] = [];

  for (const url of urls) {
    const data = await fetchPageContent(url);
    if (data) pages.push(data);
  }

  return pages;
}

async function fetchLiveData(): Promise<PropScholarAPIData | null> {
  try {
    const response = await axios.get(API_ENDPOINT, {
      timeout: 5000,
      headers: { "User-Agent": "PropScholar-Discord-Bot" },
    });

    return response.data;
  } catch {
    return null;
  }
}

// ========================================
// MAIN PROMPT BUILDER
// ========================================
export async function getPropScholarData(): Promise<string> {
  await Promise.all([fetchLiveData(), fetchAllPages()]);

  const categorizedArticles = HELP_ARTICLES.reduce(
    (acc: Record<string, Article[]>, article: Article) => {
      const cat = article.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(article);
      return acc;
    },
    {}
  );

  let prompt = `You are a professional support assistant for PropScholar.\n\n`;

  prompt += `## RESPONSE RULES:\n`;
  prompt += `1. Provide short, professional answers (1–2 sentences).\n`;
  prompt += `2. If unrelated to PropScholar, answer: "I can only assist with PropScholar-related queries. Please contact support."\n`;
  prompt += `3. Never guess. If unknown: "I don't have that information. Visit help.propscholar.com or contact support."\n`;
  prompt += `4. No emojis. No casual tone.\n\n`;

  prompt += `## KNOWLEDGE BASE:\n`;
  Object.entries(categorizedArticles).forEach(([category, articles]) => {
    prompt += `### ${category}\n`;
    articles.forEach((a) => {
      prompt += `Title: ${a.title}\n`;
      prompt += `URL: ${cleanUrl(a.url)}\n`;
      prompt += `Content: ${a.content}\n\n`;
    });
  });

  return prompt;
}

// ========================================
// INGESTION DATA FOR VECTOR SEARCH
// ========================================
export const propScholarData = HELP_ARTICLES.reduce(
  (
    acc: Record<
      string,
      Array<{ question: string; answer: string; keywords?: string[] }>
    >,
    a: Article
  ) => {
    const cat = a.category || "General";
    if (!acc[cat]) acc[cat] = [];

    acc[cat].push({
      question: a.title,
      answer: a.content,
      keywords: [],
    });

    return acc;
  },
  {}
);

// ========================================
// EXPORTS
// ========================================
export { HELP_ARTICLES, fetchSitemap, fetchPageContent, fetchAllPages, fetchLiveData };

// ========================================
// FIX EXTRA BRACE IN AI OUTPUT
// ========================================
export function cleanAIResponse(text: string): string {
  return text.replace(/[\}\]]+$/g, "").trim();
}
