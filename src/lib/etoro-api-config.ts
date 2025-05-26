export const ETORO_API_BASE_URL = process.env.ETORO_API_BASE_URL || 'https://www.etoro.com/api/public';
const API_USER_KEY = process.env.ETORO_USER_KEY || '';
const API_KEY = process.env.ETORO_API_KEY || '';

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

export const getDefaultHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'X-USER-KEY': API_USER_KEY,
    'X-API-KEY': API_KEY,
    'X-REQUEST-ID': '1fea900a-bf1f-4b7c-8af2-976dc6ab273f'
  };
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