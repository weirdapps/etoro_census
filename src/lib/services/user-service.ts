import { API_ENDPOINTS, fetchFromEtoroApi } from '../etoro-api-config';
import { logger } from '../logger';
import { PopularInvestor, PopularInvestorsResponse, PeriodType, UserDetail, UserInfoResponse, UserTradeInfo } from '../models/user';
import { UserPortfolio } from '../models/user-portfolio';
import { API, DATA_COLLECTION } from '../constants';

export async function getPopularInvestors(
  period: PeriodType = "CurrMonth",
  limit: number = 50
): Promise<PopularInvestor[]> {
  try {
    logger.info('Requesting investors from eToro API', { limit });

    // eToro might have a max page size
    const pageSize = Math.min(limit, DATA_COLLECTION.MAX_PAGE_SIZE);
    const totalPages = Math.ceil(limit / pageSize);
    const allInvestors: PopularInvestor[] = [];

    for (let page = 1; page <= totalPages; page++) {
      const endpoint = `${API_ENDPOINTS.USER_INFO_SEARCH}?period=${period}&pageSize=${pageSize}&page=${page}&sort=-copiers&`;

      logger.debug('Fetching page', { page, pageSize, endpoint });

      const response = await fetchFromEtoroApi<PopularInvestorsResponse>(endpoint);

      if (!response || !response.items || !Array.isArray(response.items)) {
        logger.error('Invalid response format for page', { page, response });
        break;
      }

      logger.debug('Page found investors', { page, investorsFound: response.items.length });

      // Check response metadata
      const metadata = {
        page,
        itemsReturned: response.items.length,
        totalRows: response.totalRows,
        pageSize: response.items.length,
        totalAvailable: response.totalRows || 'unknown'
      };

      logger.debug('Page metadata', metadata);

      allInvestors.push(...response.items);

      // Stop if we got less than a full page (no more data)
      if (response.items.length < pageSize) {
        logger.debug('Reached end of available data', { page });
        break;
      }

      // Stop if we have enough
      if (allInvestors.length >= limit) {
        logger.debug('Collected enough investors', { collected: allInvestors.length });
        break;
      }

      // Small delay between pages to avoid rate limiting
      if (page < totalPages) {
        await new Promise(resolve => setTimeout(resolve, DATA_COLLECTION.SHORT_DELAY_MS));
      }
    }

    logger.info('Total investors collected', { collected: allInvestors.length, requested: limit });

    // If we got less than requested, log it
    if (allInvestors.length < limit) {
      logger.warn('Could only fetch partial investors', { fetched: allInvestors.length, requested: limit });
      logger.info('This appears to be all available popular investors', { period });
    }

    // Return only up to the requested limit
    return allInvestors.slice(0, limit);
  } catch (error) {
    logger.error('Error fetching popular investors', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function getUserPortfolio(username: string): Promise<UserPortfolio> {
  const endpoint = API_ENDPOINTS.USER_PORTFOLIO_LIVE.replace('{username}', username);
  logger.debug('[Portfolio] Fetching portfolio for user', { username });

  const response = await fetchFromEtoroApi<UserPortfolio>(endpoint);

  if (!response) {
    logger.warn('[Portfolio] No response for user', { username });
    return { positions: [] };
  }

  if (!response.positions) {
    logger.warn('[Portfolio] No positions array for user', { username, responseKeys: Object.keys(response) });
    return { positions: [] };
  }

  logger.debug('[Portfolio] User portfolio retrieved', { username, positionsCount: response.positions.length });

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
      logger.error('Error fetching popular investors', { error: error instanceof Error ? error.message : String(error) });
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
      logger.error('Error fetching portfolio for user', { username, error: error instanceof Error ? error.message : String(error) });
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
    const batchSize = API.BATCH_SIZE;
    const batches = [];

    for (let i = 0; i < usernames.length; i += batchSize) {
      batches.push(usernames.slice(i, i + batchSize));
    }

    logger.info('Fetching user details by username in batches', { batchesCount: batches.length, usersCount: usernames.length });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const usernamesParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.USER_INFO}?usernames=${usernamesParam}`;

        logger.debug('Fetching username batch', { batchNumber: i + 1, totalBatches: batches.length, batchSize: batch.length });
        logger.debug('API endpoint', { endpoint });
        logger.debug('Usernames in batch', { usernames: batch });

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
          logger.warn('Invalid response for username batch', { batchNumber: i + 1, response });
        }

        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DATA_COLLECTION.INTER_BATCH_DELAY_MS));
        }

      } catch (batchError) {
        logger.error('Error fetching username batch', { batchNumber: i + 1, error: batchError instanceof Error ? batchError.message : String(batchError) });
        // Continue with next batch even if one fails
      }
    }

    logger.info('Successfully fetched user details by username', { fetchedCount: userMap.size, totalCount: usernames.length });
    return userMap;
  } catch (error) {
    logger.error('Error fetching user details by username', { error: error instanceof Error ? error.message : String(error) });
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
    const batchSize = API.BATCH_SIZE;
    const batches = [];

    for (let i = 0; i < userIds.length; i += batchSize) {
      batches.push(userIds.slice(i, i + batchSize));
    }

    logger.info('Fetching user details in batches', { batchesCount: batches.length, usersCount: userIds.length });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const idsParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.USER_INFO}?cidList=${idsParam}`;

        logger.debug('Fetching user batch', { batchNumber: i + 1, totalBatches: batches.length, batchSize: batch.length });
        logger.debug('API endpoint', { endpoint });
        logger.debug('Customer IDs in batch', { customerIds: batch });

        const response = await fetchFromEtoroApi<UserInfoResponse>(endpoint);

        if (response && response.users && Array.isArray(response.users)) {
          response.users.forEach(user => {
            userMap.set(user.gcid, user);
          });
        } else {
          logger.warn('Invalid response for user batch', { batchNumber: i + 1, response });
        }

        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DATA_COLLECTION.INTER_BATCH_DELAY_MS));
        }

      } catch (batchError) {
        logger.error('Error fetching user batch', { batchNumber: i + 1, error: batchError instanceof Error ? batchError.message : String(batchError) });
        // Continue with next batch even if one fails
      }
    }

    logger.info('Successfully fetched user details', { fetchedCount: userMap.size, totalCount: userIds.length });
    return userMap;
  } catch (error) {
    logger.error('Error fetching user details', { error: error instanceof Error ? error.message : String(error) });
    return new Map();
  }
}

export async function getUserTradeInfo(username: string, period: PeriodType = 'CurrYear'): Promise<UserTradeInfo | null> {
  const baseEndpoint = API_ENDPOINTS.USER_TRADE_INFO.replace('{username}', username);
  const endpoint = `${baseEndpoint}?period=${period}`;
  logger.debug('[TradeInfo] Fetching trade info for user', { username, period });

  const response = await fetchFromEtoroApi<UserTradeInfo>(endpoint);

  if (!response) {
    logger.warn('[TradeInfo] No response for user', { username });
    return null;
  }

  logger.debug('[TradeInfo] User trade info retrieved', { username, trades: response.trades || 0, winRatio: response.winRatio || 0 });

  return response;
}

export function getUserAvatarUrl(user: UserDetail | undefined, hasAvatar?: boolean, username?: string): string | undefined {
  // If user is undefined but we know they have an avatar, return the default eToro avatar URL
  if (!user && hasAvatar && username) {
    return `https://etoro-cdn.etorostatic.com/avatars/${username}/150x150.png`;
  }

  // If no user data, return undefined
  if (!user) {
    return undefined;
  }

  // If user has avatars array, find the best one
  if (user.avatars && user.avatars.length > 0) {
    // Prefer 50x50 or 35x35 size for avatars (width is string according to API docs)
    const preferredAvatar = user.avatars.find(avatar => avatar.width === "50") ||
                           user.avatars.find(avatar => avatar.width === "35") ||
                           user.avatars.find(avatar => avatar.width === "150") ||
                           user.avatars[0];

    return preferredAvatar?.url;
  }

  // Fallback to default URL if we know they have an avatar
  if (hasAvatar && username) {
    return `https://etoro-cdn.etorostatic.com/avatars/${username}/150x150.png`;
  }

  return undefined;
}