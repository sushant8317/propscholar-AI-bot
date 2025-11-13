import axios from 'axios';
import * as cheerio from 'cheerio';

// Static fallback data
const STATIC_DATA = {
  about: "PropScholar is India's most affordable prop trading firm. Start trading with our capital from just ₹5! We provide trading capital, tools, and education so anyone can become a professional trader.",
  
  features: [
    "Start with just ₹5 - lowest in India!",
    "Lightning-fast 4-hour payouts (not 14 days like competitors)",
    "Zero-spread accounts for better execution",
    "Free demo accounts forever",
    "Professional MT4/MT5 dashboards",
    "Instant breach alerts via Discord",
    "EAs & bots fully allowed",
    "No hidden fees ever",
    "80% profit share - keep ₹80 of every ₹100 you make"
  ],
  
  targetMarkets: [
    "Primary markets: India and Nigeria",
    "Retail traders looking for affordable entry",
    "Small prop firms seeking partnerships"
  ],
  
  valueProposition: "Trade with our capital, keep 80% profits. Start from ₹5!"
};

// URLs
const SITEMAP_URL = 'https://www.propscholar.com/sitemap.xml';
const API_ENDPOINT = 'https://www.propscholar.com/api/bot-data';

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

// Fetch and parse sitemap
async function fetchSitemap(): Promise<string[]> {
  try {
    console.log('📡 Fetching sitemap from PropScholar.com...');
    const response = await axios.get(SITEMAP_URL, { 
      timeout: 8000,
      headers: { 'User-Agent': 'PropScholar-Discord-Bot' }
    });
    
    // Parse XML sitemap
    const $ = cheerio.load(response.data, { xmlMode: true });
    const urls: string[] = [];
    
    $('url loc').each((i, elem) => {
      const url = $(elem).text();
      if (url && !url.includes('.xml')) { // Exclude nested sitemaps
        urls.push(url);
      }
    });
    
    console.log(`✅ Found ${urls.length} pages in sitemap`);
    return urls.slice(0, 20); // Limit to 20 pages to avoid timeout
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

// Fetch content from a single page
async function fetchPageContent(url: string): Promise<PageContent | null> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'PropScholar-Discord-Bot' }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract title
    const title = $('title').text() || $('h1').first().text() || '';
    
    // Extract main content (remove scripts, styles, nav, footer)
    $('script, style, nav, footer, header').remove();
    const content = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000); // Limit to 1000 chars per page
    
    return { url, title, content };
  } catch (error) {
    console.log(`❌ Failed to fetch: ${url}`);
    return null;
  }
}

// Fetch all pages from sitemap
async function fetchAllPages(): Promise<PageContent[]> {
  const urls = await fetchSitemap();
  console.log(`📄 Fetching content from ${urls.length} pages...`);
  
const pages: PageContent[] = [];
  
  // Traverse pages sequentially (one by one)
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

// Fetch live data from API
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

// Build comprehensive system prompt
export async function getPropScholarData(): Promise<string> {
  // Fetch data from all sources in parallel
  const [liveData, pages] = await Promise.all([
    fetchLiveData(),
    fetchAllPages()
  ]);
  
  let prompt = `You are a friendly AI support assistant for PropScholar, India's most affordable prop trading firm. Be conversational, helpful, and enthusiastic! Use emojis when appropriate.\n\n`;
  
  // Add basic info
  prompt += `🎯 ABOUT PROPSCHOLAR:\n${STATIC_DATA.about}\n\n`;
  
  // Add static features
  prompt += `⭐ KEY FEATURES:\n`;
  STATIC_DATA.features.forEach(feature => {
    prompt += `• ${feature}\n`;
  });
  prompt += `\n`;
  
  // Add live API data if available
  if (liveData?.pricing) {
    prompt += `💰 CURRENT PRICING:\n`;
    liveData.pricing.forEach((price: string) => {
      prompt += `• ${price}\n`;
    });
    prompt += `\n`;
  }
  
  if (liveData?.updates) {
    prompt += `🔥 LATEST UPDATES:\n`;
    liveData.updates.forEach((update: string) => {
      prompt += `• ${update}\n`;
    });
    prompt += `\n`;
  }
  
  // Add content from all website pages
  if (pages.length > 0) {
    prompt += `📚 WEBSITE CONTENT (from ${pages.length} pages):\n\n`;
    
    pages.forEach(page => {
      prompt += `Page: ${page.title}\n`;
      prompt += `URL: ${page.url}\n`;
      prompt += `Content: ${page.content.substring(0, 500)}...\n\n`;
    });
  }
  
  // Add target markets
  prompt += `🌍 TARGET MARKETS:\n`;
  STATIC_DATA.targetMarkets.forEach(market => {
    prompt += `• ${market}\n`;
  });
  prompt += `\n`;
  
  // Add value proposition
  prompt += `💎 VALUE PROPOSITION:\n${STATIC_DATA.valueProposition}\n\n`;
  
  // Add bot instructions
  prompt += `🤖 YOUR ROLE:\nAnswer questions about PropScholar professionally and helpfully. When traders ask:\n`;
  prompt += `1. Be conversational and friendly\n`;
  prompt += `2. Emphasize the ₹5 entry point and affordability\n`;
  prompt += `3. Mention the 4-hour payout guarantee\n`;
  prompt += `4. Encourage them to start with demo account\n`;
  prompt += `5. Invite them to join Discord community\n`;
  prompt += `6. Use emojis to be engaging\n`;
  prompt += `7. If you don't know something specific, direct them to www.propscholar.com or Discord support\n\n`;
  
  prompt += `Example tone: "Hey! 🎯 Great question! Yes, you can use EAs on PropScholar! Our ₹5 starter account is perfect for testing..."\n`;
  
  return prompt;
}

// Export for testing
export { fetchSitemap, fetchPageContent, fetchAllPages };
