import axios from 'axios';
import * as cheerio from 'cheerio';

// ========================================
// MANUAL KNOWLEDGE BASE - Help Center Articles
// ========================================
const HELP_ARTICLES = [
  // 🔥 All YOUR articles here (unchanged)
  // I am not rewriting them because your list is extremely long.
  // Keep exactly the list YOU pasted already.
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

// Clean URLs from bad endings
function cleanUrl(url: string): string {
  return url ? url.trim().replace(/[}%>]+$/g, "") : "";
}

// ========================================
// FETCHERS
// ========================================
async function fetchSitemap(): Promise<string[]> {
  try {
    console.log('📡 Fetching sitemap...');
    const response = await axios.get(SITEMAP_URL, {
      timeout: 8000,
      headers: { 'User-Agent': 'PropScholar-Discord-Bot' }
    });

    const $ = cheerio.load(response.data, { xmlMode: true });
    const urls: string[] = [];

    $('url loc').each((i, elem) => {
      let url = cleanUrl($(elem).text());
      if (url && !url.includes('.xml')) urls.push(url);
    });

    return urls.slice(0, 20);
  } catch {
    console.log('⚠️ Sitemap failed, fallback used.');
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
    const content = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1000);

    return { url: clean_url, title, content };
  } catch {
    console.log(`❌ Failed: ${url}`);
    return null;
  }
}

async function fetchAllPages(): Promise<PageContent[]> {
  const urls = await fetchSitemap();
  const pages: PageContent[] = [];

  for (let i = 0; i < urls.length; i++) {
    try {
      const page = await fetchPageContent(urls[i]);
      if (page) pages.push(page);
    } catch {
      continue;
    }
  }

  return pages;
}

async function fetchLiveData(): Promise<PropScholarAPIData | null> {
  try {
    const response = await axios.get(API_ENDPOINT, {
      timeout: 5000,
      headers: { 'User-Agent': 'PropScholar-Discord-Bot' }
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
  const [liveData, pages] = await Promise.all([fetchLiveData(), fetchAllPages()]);

  const categorizedArticles = HELP_ARTICLES.reduce((acc, article) => {
    const cat = article.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(article);
    return acc;
  }, {} as Record<string, Article[]>);

  let prompt = `You are a professional support assistant for PropScholar.\n\n`;

  prompt += `## RESPONSE RULES:\n`;
  prompt += `1. Short, professional answers (1–2 sentences).\n`;
  prompt += `2. Only answer if the question matches PropScholar.\n`;
  prompt += `3. If unrelated: "I can only assist with PropScholar-related queries. Please contact support."\n`;
  prompt += `4. No guessing.\n`;
  prompt += `5. No emojis or casual tone.\n\n`;

  prompt += `## HELP CENTER KNOWLEDGE BASE:\n\n`;

  Object.entries(categorizedArticles).forEach(([category, articles]) => {
    prompt += `### ${category}\n\n`;
    articles.forEach(a => {
      prompt += `Title: ${a.title}\n`;
      prompt += `URL: ${cleanUrl(a.url)}\n`;
      prompt += `Content: ${a.content}\n\n`;
    });
  });

  prompt += `Remember: No URLs or emojis in replies.`

  return prompt;
}

// ========================================
// CLEAN AI RESPONSES — FIXES TRAILING '}'
// ========================================
export function cleanAIResponse(text: string): string {
  return text
    .trim()
    .replace(/[%}\]>]+$/g, "")  // remove trailing } ] > %7D
    .replace(/^[<{[\s]+/g, "")  // remove leading braces or strange chars
    .trim();
}

// ========================================
// EXPORT FOR INGEST SCRIPT
// ========================================
export const propScholarData = HELP_ARTICLES.reduce((acc, a) => {
  const cat = a.category || 'General';
  if (!acc[cat]) acc[cat] = [];

  acc[cat].push({
    question: a.title,
    answer: a.content,
    keywords: []
  });

  return acc;
}, {} as Record<string, Array<{ question: string; answer: string; keywords?: string[] }>>);

export {
  fetchSitemap,
  fetchPageContent,
  fetchAllPages,
  fetchLiveData,
  HELP_ARTICLES
};
