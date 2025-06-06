import { API_ENDPOINTS, fetchFromEtoroApi } from '../etoro-api-config';
import { PopularInvestor, PopularInvestorsResponse, PeriodType, UserDetail, UserInfoResponse, UserTradeInfo } from '../models/user';
import { UserPortfolio } from '../models/user-portfolio';

export async function getPopularInvestors(
  period: PeriodType = "CurrMonth",
  limit: number = 50
): Promise<PopularInvestor[]> {
  try {
    console.log(`Requesting ${limit} investors from eToro API...`);
    
    // eToro might have a max page size, let's check
    const pageSize = Math.min(limit, 500); // Try smaller page size
    const totalPages = Math.ceil(limit / pageSize);
    const allInvestors: PopularInvestor[] = [];
    
    for (let page = 1; page <= totalPages; page++) {
      const endpoint = `${API_ENDPOINTS.USER_INFO_SEARCH}?period=${period}&pageSize=${pageSize}&page=${page}&sort=-copiers&`;
      
      console.log(`Fetching page ${page} (pageSize: ${pageSize}) from: ${endpoint}`);
      
      const response = await fetchFromEtoroApi<PopularInvestorsResponse>(endpoint);
      
      if (!response || !response.items || !Array.isArray(response.items)) {
        console.error(`Invalid response format for page ${page}:`, response);
        break;
      }

      console.log(`Page ${page}: Found ${response.items.length} investors`);
      
      // Check response metadata
      const metadata = {
        page,
        itemsReturned: response.items.length,
        totalRows: response.totalRows,
        pageSize: response.items.length,
        totalAvailable: response.totalRows || 'unknown'
      };
      
      console.log(`Page ${page} Metadata:`, metadata);
      
      allInvestors.push(...response.items);
      
      // Stop if we got less than a full page (no more data)
      if (response.items.length < pageSize) {
        console.log(`Reached end of available data at page ${page}`);
        break;
      }
      
      // Stop if we have enough
      if (allInvestors.length >= limit) {
        console.log(`Collected enough investors: ${allInvestors.length}`);
        break;
      }
      
      // Small delay between pages to avoid rate limiting
      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Total investors collected: ${allInvestors.length} (requested: ${limit})`);
    
    // If we got less than requested, log it
    if (allInvestors.length < limit) {
      console.warn(`⚠️ Could only fetch ${allInvestors.length} investors (requested: ${limit})`);
      console.log(`This appears to be all available popular investors for period: ${period}`);
    }
    
    // Return only up to the requested limit
    return allInvestors.slice(0, limit);
  } catch (error) {
    console.error('Error fetching popular investors:', error);
    throw error;
  }
}

export async function getUserPortfolio(username: string): Promise<UserPortfolio> {
  try {
    const endpoint = API_ENDPOINTS.USER_PORTFOLIO_LIVE.replace('{username}', username);
    console.log(`[Portfolio] Fetching portfolio for user: ${username}`);
    
    const response = await fetchFromEtoroApi<UserPortfolio>(endpoint);
    
    // Detailed logging of response
    if (!response) {
      console.warn(`[Portfolio] No response for user ${username}`);
      return { positions: [] };
    }
    
    if (!response.positions) {
      console.warn(`[Portfolio] No positions array for user ${username}, response keys:`, Object.keys(response));
      return { positions: [] };
    }
    
    console.log(`[Portfolio] User ${username} has ${response.positions.length} positions`);
    
    let totalValue = 0;
    let profitLoss = 0;
    
    response.positions.forEach(position => {
      if (position.netProfit !== undefined) {
        const positionValue = position.investmentPct || 0;
        totalValue += positionValue;
        profitLoss += (position.netProfit * positionValue) / 100;
      }
    });
    
    return {
      ...response,
      totalValue,
      profitLoss,
      profitLossPercentage: totalValue > 0 ? (profitLoss / totalValue) * 100 : 0
    };
  } catch (error) {
    console.error(`Error fetching portfolio for user ${username}:`, error);
    return { positions: [] };
  }
}

export const clientUserService = {
  getPopularInvestors: async (period: PeriodType = "CurrMonth", limit: number = 50): Promise<PopularInvestor[]> => {
    try {
      const response = await fetch(`/api/users/popular?period=${period}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch popular investors: ${response.status}`);
      }
      
      const data = await response.json();
      return data.investors || [];
    } catch (error) {
      console.error('Error fetching popular investors:', error);
      return [];
    }
  },
  
  getUserPortfolio: async (username: string): Promise<UserPortfolio> => {
    try {
      const response = await fetch(`/api/users/${username}/portfolio`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user portfolio: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching portfolio for user ${username}:`, error);
      return { positions: [] };
    }
  }
};

export async function getUsersDetailsByUsernames(
  usernames: string[], 
  onProgress?: (progress: number, message: string) => void
): Promise<Map<string, UserDetail>> {
  try {
    if (usernames.length === 0) {
      return new Map();
    }

    const userMap = new Map<string, UserDetail>();
    
    // Batch requests to avoid URL length limits and API rate limits
    const batchSize = 50; // Process 50 users at a time
    const batches = [];
    
    for (let i = 0; i < usernames.length; i += batchSize) {
      batches.push(usernames.slice(i, i + batchSize));
    }
    
    console.log(`Fetching user details by username in ${batches.length} batches for ${usernames.length} users`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const usernamesParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.USER_INFO}?usernames=${usernamesParam}`;
        
        console.log(`Fetching username batch ${i + 1}/${batches.length}: ${batch.length} users`);
        console.log(`API endpoint: ${endpoint}`);
        console.log(`Usernames in batch:`, batch);
        
        // Report progress during fetching
        if (onProgress) {
          const progress = Math.round((i / batches.length) * 100);
          onProgress(progress, `Fetching user avatars batch ${i + 1}/${batches.length}...`);
        }
        
        const response = await fetchFromEtoroApi<UserInfoResponse>(endpoint);
        
        if (response && response.users && Array.isArray(response.users)) {
          response.users.forEach(user => {
            userMap.set(user.username, user);
          });
        } else {
          console.warn(`Invalid response for username batch ${i + 1}:`, response);
        }
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        console.error(`Error fetching username batch ${i + 1}:`, batchError);
        // Continue with next batch even if one fails
      }
    }

    console.log(`Successfully fetched details for ${userMap.size}/${usernames.length} users by username`);
    return userMap;
  } catch (error) {
    console.error('Error fetching user details by username:', error);
    return new Map();
  }
}

export async function getUsersDetails(userIds: number[]): Promise<Map<number, UserDetail>> {
  try {
    if (userIds.length === 0) {
      return new Map();
    }

    const userMap = new Map<number, UserDetail>();
    
    // Batch requests to avoid URL length limits and API rate limits
    const batchSize = 50; // Process 50 users at a time
    const batches = [];
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }
    
    console.log(`Fetching user details in ${batches.length} batches for ${userIds.length} users`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const idsParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.USER_INFO}?cidList=${idsParam}`;
        
        console.log(`Fetching user batch ${i + 1}/${batches.length}: ${batch.length} users`);
        console.log(`API endpoint: ${endpoint}`);
        console.log(`Customer IDs in batch:`, batch);
        
        const response = await fetchFromEtoroApi<UserInfoResponse>(endpoint);
        
        if (response && response.users && Array.isArray(response.users)) {
          response.users.forEach(user => {
            userMap.set(user.gcid, user);
          });
        } else {
          console.warn(`Invalid response for user batch ${i + 1}:`, response);
        }
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        console.error(`Error fetching user batch ${i + 1}:`, batchError);
        // Continue with next batch even if one fails
      }
    }

    console.log(`Successfully fetched details for ${userMap.size}/${userIds.length} users`);
    return userMap;
  } catch (error) {
    console.error('Error fetching user details:', error);
    return new Map();
  }
}

export async function getUserTradeInfo(username: string): Promise<UserTradeInfo | null> {
  try {
    const endpoint = API_ENDPOINTS.USER_TRADE_INFO.replace('{username}', username);
    console.log(`[TradeInfo] Fetching trade info for user: ${username}`);
    
    const response = await fetchFromEtoroApi<UserTradeInfo>(endpoint);
    
    if (!response) {
      console.warn(`[TradeInfo] No response for user ${username}`);
      return null;
    }
    
    console.log(`[TradeInfo] User ${username} has ${response.trades || 0} trades, win ratio: ${response.winRatio || 0}%`);
    
    return response;
  } catch (error) {
    console.error(`[TradeInfo] Error fetching trade info for user ${username}:`, error);
    return null;
  }
}

export function getUserAvatarUrl(user: UserDetail): string | undefined {
  if (!user.avatars || user.avatars.length === 0) {
    return undefined;
  }
  
  // Prefer 50x50 or 35x35 size for avatars (width is string according to API docs)
  const preferredAvatar = user.avatars.find(avatar => avatar.width === "50") || 
                         user.avatars.find(avatar => avatar.width === "35") ||
                         user.avatars.find(avatar => avatar.width === "150") ||
                         user.avatars[0];
  
  return preferredAvatar?.url;
}