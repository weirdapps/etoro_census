export const ETORO_API_BASE_URL = process.env.ETORO_API_BASE_URL || 'https://www.etoro.com/api/public';

// Use functions to get these values at runtime instead of build time
const getApiUserKey = () => process.env.ETORO_USER_KEY || '';
const getApiKey = () => process.env.ETORO_API_KEY || '';

export const API_ENDPOINTS = {
  PORTFOLIO: `${ETORO_API_BASE_URL}/v1/trading/info/portfolio`,
  INSTRUMENTS: `${ETORO_API_BASE_URL}/v1/market-data/instruments`,
  INSTRUMENT_RATES: `${ETORO_API_BASE_URL}/v1/market-data/instruments/rates`,
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
  const headers = {
    'Content-Type': 'application/json',
    'X-USER-KEY': getApiUserKey(),
    'X-API-KEY': getApiKey(),
    'X-REQUEST-ID': generateUUID()
  };
  
  // Debug log to check if keys are present (only log length for security)
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

export async function fetchFromEtoroApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const requestOptions = {
      ...getApiRequestOptions(),
      ...options,
      headers: {
        ...getDefaultHeaders(),
        ...(options.headers || {})
      }
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    requestOptions.signal = controller.signal;
    
    const response = await fetch(endpoint, requestOptions);
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`eToro API request failed (${response.status}):`, errorText);
      throw new Error(`eToro API request failed: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('eToro API request timed out:', endpoint);
      throw new Error('eToro API request timed out');
    }
    
    console.error('Error fetching from eToro API:', error);
    throw error;
  }
}