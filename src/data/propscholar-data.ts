import axios from 'axios';

// Static fallback data (used if API fails)
const STATIC_DATA = {
  about: "PropScholar is an affordable prop trading platform that provides traders with capital, tools, and education to succeed in trading.",
  
  features: [
    "Ultra-affordable trading accounts starting at just ₹5 or $5",
    "Lightning-fast payouts with 4-hour guarantee",
    "Zero-spread accounts available for better trading conditions",
    "Demo accounts for risk-free practice and skill development",
    "Professional trader dashboards with real-time analytics",
    "Trading alerts and breach notification systems",
    "Active Discord community for trader support and networking"
  ],
  
  targetMarkets: [
    "Primary markets: India and Nigeria",
    "Retail traders looking for affordable entry into prop trading",
    "Small prop trading firms seeking partnerships"
  ],
  
  platformCapabilities: [
    "Real-time market data and analysis",
    "Technical analysis indicators and charting tools",
    "Risk management strategies and tools",
    "Backtesting capabilities for strategy development",
    "User-friendly interface designed for traders of all levels"
  ],
  
  educationCommunity: [
    "Educational webinars and video tutorials",
    "Market analysis and trading insights",
    "Community forum for knowledge sharing",
    "Professional trader mentorship opportunities"
  ],
  
  valueProposition: "PropScholar makes prop trading accessible to everyone by removing high capital barriers. Whether you're starting with ₹5 or $5, you can access professional trading tools, capital, and community support."
};

// API endpoint on your website
const API_ENDPOINT = 'https://www.propscholar.com/api/bot-data';

// Interface for API response
interface PropScholarAPIData {
  pricing?: string[];
  features?: string[];
  updates?: string[];
  accountTypes?: string[];
  [key: string]: any;
}

// Fetch live data from PropScholar.com
async function fetchLiveData(): Promise<PropScholarAPIData | null> {
  try {
    console.log('📡 Fetching live data from PropScholar.com...');
    const response = await axios.get(API_ENDPOINT, {
      timeout: 5000, // 5 second timeout
      headers: {
        'User-Agent': 'PropScholar-Discord-Bot'
      }
    });
    
    console.log('✅ Live data fetched successfully');
    return response.data;
  } catch (error) {
    console.log('⚠️  Could not fetch live data, using static fallback');
    return null;
  }
}

// Build comprehensive system prompt
export async function getPropScholarData(): Promise<string> {
  const liveData = await fetchLiveData();
  
  let prompt = `You are an AI support assistant for PropScholar, a proprietary trading firm.\n\n`;
  prompt += `ABOUT PROPSCHOLAR:\n${STATIC_DATA.about}\n\n`;
  
  prompt += `KEY FEATURES:\n`;
  STATIC_DATA.features.forEach(feature => {
    prompt += `- ${feature}\n`;
  });
  prompt += `\n`;
  
  // Add live pricing if available
  if (liveData?.pricing) {
    prompt += `CURRENT PRICING:\n`;
    liveData.pricing.forEach((price: string) => {
      prompt += `- ${price}\n`;
    });
    prompt += `\n`;
  }
  
  // Add live features if available
  if (liveData?.features) {
    prompt += `LATEST FEATURES:\n`;
    liveData.features.forEach((feature: string) => {
      prompt += `- ${feature}\n`;
    });
    prompt += `\n`;
  }
  
  prompt += `TARGET MARKETS:\n`;
  STATIC_DATA.targetMarkets.forEach(market => {
    prompt += `- ${market}\n`;
  });
  prompt += `\n`;
  
  prompt += `PLATFORM CAPABILITIES:\n`;
  STATIC_DATA.platformCapabilities.forEach(capability => {
    prompt += `- ${capability}\n`;
  });
  prompt += `\n`;
  
  prompt += `EDUCATION & COMMUNITY:\n`;
  STATIC_DATA.educationCommunity.forEach(item => {
    prompt += `- ${item}\n`;
  });
  prompt += `\n`;
  
  prompt += `VALUE PROPOSITION:\n${STATIC_DATA.valueProposition}\n\n`;
  
  prompt += `Your role: Answer questions about PropScholar professionally and helpfully. Provide accurate information about features, pricing, and benefits. Be friendly and supportive to traders.`;
  
  return prompt;
}
