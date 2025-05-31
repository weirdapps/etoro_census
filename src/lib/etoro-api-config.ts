export const ETORO_API_BASE_URL = process.env.ETORO_API_BASE_URL || 'https://www.etoro.com/api/public';

// Use functions to get these values at runtime instead of build time
const getApiUserKey = () => process.env.ETORO_USER_KEY || '';
const getApiKey = () => process.env.ETORO_API_KEY || '';

export const API_ENDPOINTS = {
  PORTFOLIO: `${ETORO_API_BASE_URL}/v1/trading/info/portfolio`,
  INSTRUMENTS: `${ETORO_API_BASE_URL}/v1/market-data/instruments`,
  INSTRUMENT_RATES: `${ETORO_API_BASE_URL}/v1/market-data/instruments/rates`,
  INSTRUMENT_SEARCH: `${ETORO_API_BASE_URL}/v1/market-data/search`,
  ASSET_FEED: `${ETORO_API_BASE_URL}/v1/feeds/instrument`,
  USER_FEED: `${ETORO_API_BASE_URL}/v1/feeds/user`,
  USER_INFO: `${ETORO_API_BASE_URL}/v1/user-info/people`,
  USER_INFO_SEARCH: `${ETORO_API_BASE_URL}/v1/user-info/people/search`,
  USER_PORTFOLIO_LIVE: `${ETORO_API_BASE_URL}/v1/user-info/people/{username}/portfolio/live`,
  USER_DISCOVERY_INFO: `${ETORO_API_BASE_URL}/sapi/portfolio/discover/user-discovery-info`,
};

// Generate a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const getDefaultHeaders = () => {
  const headers: { [key: string]: string } = {
    'X-USER-KEY': getApiUserKey(),
    'X-API-KEY': getApiKey(),
    'X-REQUEST-ID': generateUUID(),
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
  
  // Debug log to check if keys are present (log full headers for debugging)
  
  if (!headers['X-USER-KEY'] || !headers['X-API-KEY']) {
    console.error('WARNING: API keys are missing!', {
      userKeyLength: headers['X-USER-KEY']?.length || 0,
      apiKeyLength: headers['X-API-KEY']?.length || 0
    });
  }
  
  return headers;
};

export const getApiRequestOptions = (method = 'GET') => {
  return {
    method,
    headers: getDefaultHeaders(),
    cache: 'no-store' as RequestCache
  };
};

// Global rate limiting state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

export async function fetchFromEtoroApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Implement aggressive rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`[eToro API] Rate limiting: waiting ${waitTime}ms before request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    lastRequestTime = Date.now();
    
    const requestOptions = {
      ...getApiRequestOptions(),
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...(options.headers || {})
      }
    };
    
    // Log request details for debugging
    console.log(`[eToro API] Request to: ${endpoint}`);
    console.log(`[eToro API] Request headers configured`);
    
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout
    requestOptions.signal = controller.signal;
    
    const startTime = Date.now();
    const response = await fetch(endpoint, requestOptions);
    const responseTime = Date.now() - startTime;
    
    clearTimeout(timeoutId);
    
    console.log(`[eToro API] Response: ${response.status} in ${responseTime}ms`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[eToro API] Request failed (${response.status}):`, errorText);
      
      // If we get 429, wait longer before next request
      if (response.status === 429) {
        console.log(`[eToro API] Rate limited! Waiting 5 seconds before next request...`);
        lastRequestTime = Date.now() + 5000; // Force 5 second wait
      }
      
      throw new Error(`eToro API request failed: ${response.status}`);
    }
    
    const data = await response.json() as T;
    
    // Log response data size for debugging
    const dataStr = JSON.stringify(data);
    console.log(`[eToro API] Response size: ${dataStr.length} bytes`);
    
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[eToro API] Request timed out:', endpoint);
      throw new Error('eToro API request timed out');
    }
    
    console.error('[eToro API] Error:', error);
    throw error;
  }
}