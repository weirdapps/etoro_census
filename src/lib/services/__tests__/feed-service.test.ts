import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PopularInvestor, UserDetail } from '../../models/user';
import type { EtoroFeedResponse } from '../../models/feed';

// Mock the dependencies FIRST
vi.mock('../../etoro-api-config', () => ({
  API_ENDPOINTS: {
    USER_FEED: 'https://api.etoro.com/v1/feeds/user',
  },
  fetchFromEtoroApi: vi.fn(),
}));

vi.mock('../../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../schemas/feed', () => ({
  validateFeedResponse: vi.fn((data) => data), // Pass through by default
}));

// Import mocked modules and service AFTER mocks
import { fetchFromEtoroApi } from '../../etoro-api-config';
import { validateFeedResponse } from '../../schemas/feed';
import { selectPIsByCategory, collectPIFeeds, fetchPostsByGcids } from '../feed-service';

describe('FeedService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    // Reset time for consistent Date.now() in tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper to run all pending timers
  const runAllTimers = async () => {
    await vi.runAllTimersAsync();
  };

  // Mock data helpers
  const createMockInvestor = (overrides: Partial<PopularInvestor> = {}): PopularInvestor => ({
    customerId: 12345,
    userName: 'testuser',
    fullName: 'Test User',
    hasAvatar: true,
    popularInvestor: true,
    gain: 15.5,
    dailyGain: 0.5,
    riskScore: 5,
    copiers: 1000,
    trades: 100,
    winRatio: 65,
    country: 'US',
    ...overrides,
  });

  const createMockUserDetail = (username: string, gcid: number): UserDetail => ({
    gcid,
    realCID: gcid,
    demoCID: 0,
    username,
    firstName: 'Test',
    middleName: null,
    lastName: 'User',
    language: 1,
    languageIsoCode: 'en',
    country: 1,
    allowDisplayFullName: true,
    aboutMe: null,
    aboutMeShort: null,
    userBio: {
      gcid,
      aboutMe: null,
      aboutMeShort: null,
      languageCode: 'en',
      strategyID: null,
    },
    whiteLabel: 0,
    optOut: false,
    homepage: null,
    playerStatus: 'active',
    piLevel: 1,
    isPi: true,
    avatars: [],
    masterAccountCid: null,
    accountType: 1,
    fundType: null,
    isVerified: true,
    verificationLevel: 1,
    accountStatus: 1,
    gdprInfo: null,
    userFlowSignature: 'test',
  });

  const createMockFeedResponse = (
    posts: Array<{ text: string; languageCode?: string; likes?: number; comments?: number }>
  ): EtoroFeedResponse => ({
    discussions: posts.map((post, index) => ({
      post: {
        id: `post-${index}`,
        created: '2024-01-15T10:00:00Z',
        message: {
          text: post.text,
          languageCode: post.languageCode || 'en',
        },
        likes: post.likes ?? 0,
        userGcid: 1001,
        username: 'testuser',
      },
      commentsCount: post.comments ?? 0,
    })),
  });

  describe('selectPIsByCategory', () => {
    it('should categorize investors correctly - elite by copiers', () => {
      const investors = [
        createMockInvestor({ userName: 'elite1', copiers: 10000 }),
        createMockInvestor({ userName: 'elite2', copiers: 8000 }),
        createMockInvestor({ userName: 'elite3', copiers: 6000 }),
        createMockInvestor({ userName: 'elite4', copiers: 4000 }),
        createMockInvestor({ userName: 'elite5', copiers: 2000 }),
        createMockInvestor({ userName: 'elite6', copiers: 1000 }), // Should not be included (limit 5)
      ];

      const userDetails = new Map([
        ['elite1', createMockUserDetail('elite1', 1001)],
        ['elite2', createMockUserDetail('elite2', 1002)],
        ['elite3', createMockUserDetail('elite3', 1003)],
        ['elite4', createMockUserDetail('elite4', 1004)],
        ['elite5', createMockUserDetail('elite5', 1005)],
        ['elite6', createMockUserDetail('elite6', 1006)],
      ]);

      const categories = selectPIsByCategory(investors, userDetails);

      const eliteCategory = categories.get('elite');
      expect(eliteCategory).toHaveLength(5);
      expect(eliteCategory?.[0].username).toBe('elite1');
      expect(eliteCategory?.[0].copiers).toBe(10000);
      expect(eliteCategory?.[4].username).toBe('elite5');
    });

    it('should categorize performers by gain', () => {
      const investors = [
        createMockInvestor({ userName: 'perf1', gain: 50.5 }),
        createMockInvestor({ userName: 'perf2', gain: 40.2 }),
        createMockInvestor({ userName: 'perf3', gain: 30.0 }),
        createMockInvestor({ userName: 'perf4', gain: 20.5 }),
        createMockInvestor({ userName: 'perf5', gain: 10.0 }),
      ];

      const userDetails = new Map(
        investors.map((inv, i) => [inv.userName, createMockUserDetail(inv.userName, 1001 + i)])
      );

      const categories = selectPIsByCategory(investors, userDetails);

      const performersCategory = categories.get('performers');
      expect(performersCategory).toHaveLength(5);
      expect(performersCategory?.[0].gain).toBe(50.5);
      expect(performersCategory?.[4].gain).toBe(10.0);
    });

    it('should categorize conservative by low risk score', () => {
      const investors = [
        createMockInvestor({ userName: 'cons1', riskScore: 1 }),
        createMockInvestor({ userName: 'cons2', riskScore: 2 }),
        createMockInvestor({ userName: 'cons3', riskScore: 3 }),
        createMockInvestor({ userName: 'risky1', riskScore: 7 }), // Should not be included
        createMockInvestor({ userName: 'risky2', riskScore: 8 }), // Should not be included
      ];

      const userDetails = new Map(
        investors.map((inv, i) => [inv.userName, createMockUserDetail(inv.userName, 1001 + i)])
      );

      const categories = selectPIsByCategory(investors, userDetails);

      const conservativeCategory = categories.get('conservative');
      expect(conservativeCategory).toHaveLength(3);
      expect(conservativeCategory?.[0].riskScore).toBe(1);
      expect(conservativeCategory?.[2].riskScore).toBe(3);
      expect(conservativeCategory?.every(pi => pi.riskScore <= 3)).toBe(true);
    });

    it('should categorize active by activity score (trades × winRatio)', () => {
      const investors = [
        createMockInvestor({ userName: 'active1', trades: 1000, winRatio: 80 }), // 800
        createMockInvestor({ userName: 'active2', trades: 500, winRatio: 90 }), // 450
        createMockInvestor({ userName: 'active3', trades: 800, winRatio: 50 }), // 400
        createMockInvestor({ userName: 'active4', trades: 300, winRatio: 70 }), // 210
        createMockInvestor({ userName: 'active5', trades: 100, winRatio: 60 }), // 60
      ];

      const userDetails = new Map(
        investors.map((inv, i) => [inv.userName, createMockUserDetail(inv.userName, 1001 + i)])
      );

      const categories = selectPIsByCategory(investors, userDetails);

      const activeCategory = categories.get('active');
      expect(activeCategory).toHaveLength(5);
      expect(activeCategory?.[0].username).toBe('active1');
      expect(activeCategory?.[0].activityScore).toBe(800);
      expect(activeCategory?.[1].activityScore).toBe(450);
    });

    it('should handle empty investor list', () => {
      const investors: PopularInvestor[] = [];
      const userDetails = new Map<string, UserDetail>();

      const categories = selectPIsByCategory(investors, userDetails);

      expect(categories.get('elite')).toHaveLength(0);
      expect(categories.get('performers')).toHaveLength(0);
      expect(categories.get('conservative')).toHaveLength(0);
      expect(categories.get('active')).toHaveLength(0);
    });

    it('should skip investors without gcid in userDetails', () => {
      const investors = [
        createMockInvestor({ userName: 'withgcid', copiers: 10000 }),
        createMockInvestor({ userName: 'nogcid', copiers: 8000 }),
      ];

      const userDetails = new Map([
        ['withgcid', createMockUserDetail('withgcid', 1001)],
        // 'nogcid' is missing from userDetails
      ]);

      const categories = selectPIsByCategory(investors, userDetails);

      const eliteCategory = categories.get('elite');
      expect(eliteCategory).toHaveLength(1);
      expect(eliteCategory?.[0].username).toBe('withgcid');
    });

    it('should respect pisPerCategory config', () => {
      const investors = Array.from({ length: 20 }, (_, i) =>
        createMockInvestor({ userName: `user${i}`, copiers: 10000 - i * 100 })
      );

      const userDetails = new Map(
        investors.map((inv, i) => [inv.userName, createMockUserDetail(inv.userName, 1001 + i)])
      );

      const categories = selectPIsByCategory(investors, userDetails, { pisPerCategory: 3 });

      expect(categories.get('elite')).toHaveLength(3);
      expect(categories.get('performers')).toHaveLength(3);
      expect(categories.get('active')).toHaveLength(3);
    });

    it('should include engaging category by default', () => {
      const investors = [
        createMockInvestor({ userName: 'user1', copiers: 10000 }),
        createMockInvestor({ userName: 'user2', copiers: 8000 }),
      ];

      const userDetails = new Map(
        investors.map((inv, i) => [inv.userName, createMockUserDetail(inv.userName, 1001 + i)])
      );

      const categories = selectPIsByCategory(investors, userDetails);

      expect(categories.has('engaging')).toBe(true);
      expect(categories.get('engaging')!.length).toBeGreaterThan(0);
    });

    it('should exclude engaging category when includeEngaging is false', () => {
      const investors = [
        createMockInvestor({ userName: 'user1', copiers: 10000 }),
      ];

      const userDetails = new Map([
        ['user1', createMockUserDetail('user1', 1001)],
      ]);

      const categories = selectPIsByCategory(investors, userDetails, { includeEngaging: false });

      expect(categories.has('engaging')).toBe(false);
    });
  });

  describe('collectPIFeeds', () => {
    it('should collect posts from PIs and group by category', async () => {
      const investors = [
        createMockInvestor({ userName: 'elite1', copiers: 10000, gain: 25, riskScore: 4 }),
        createMockInvestor({ userName: 'perf1', copiers: 5000, gain: 50, riskScore: 6 }),
      ];

      const userDetails = new Map([
        ['elite1', createMockUserDetail('elite1', 1001)],
        ['perf1', createMockUserDetail('perf1', 1002)],
      ]);

      const mockResponse1 = createMockFeedResponse([
        { text: 'Great trade on $AAPL today!', likes: 10, comments: 5 },
        { text: 'Watching $TSLA closely', likes: 8, comments: 3 },
      ]);

      const mockResponse2 = createMockFeedResponse([
        { text: 'My $GOOGL position is up 20%', likes: 15, comments: 7 },
      ]);

      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      vi.mocked(validateFeedResponse)
        .mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2);

      const promise = collectPIFeeds(investors, userDetails, {
        pisPerCategory: 5,
        postsPerPI: 3,
        includeEngaging: false, // Simplify for test
      });

      // Advance timers for rate limiting between requests
      await runAllTimers();
      const result = await promise;

      expect(result.totalPosts).toBe(3);
      expect(result.totalPIs).toBe(2);
      expect(result.posts).toHaveLength(3);
      expect(result.byCategory.elite.length + result.byCategory.performers.length).toBeGreaterThan(0);
    });

    it('should handle API failures gracefully', async () => {
      const investors = [
        createMockInvestor({ userName: 'elite1', copiers: 10000 }),
        createMockInvestor({ userName: 'elite2', copiers: 8000 }),
      ];

      const userDetails = new Map([
        ['elite1', createMockUserDetail('elite1', 1001)],
        ['elite2', createMockUserDetail('elite2', 1002)],
      ]);

      const mockResponse = createMockFeedResponse([
        { text: 'Test post', likes: 5 },
      ]);

      // First call succeeds, second fails
      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValueOnce(new Error('API Error'));

      vi.mocked(validateFeedResponse)
        .mockReturnValueOnce(mockResponse)
        .mockReturnValueOnce(null);

      const promise = collectPIFeeds(investors, userDetails, {
        pisPerCategory: 5,
        includeEngaging: false,
      });

      await runAllTimers();
      const result = await promise;

      expect(result.stats.fetchedPIs).toBe(1);
      expect(result.stats.failedPIs).toBe(1);
      expect(result.totalPosts).toBe(1);
    });

    it('should extract tickers from posts', async () => {
      const investors = [
        // Elite investor - high copiers
        createMockInvestor({
          userName: 'elite1',
          copiers: 10000,
          gain: 15,
          riskScore: 5,
          trades: 50,
          winRatio: 50
        }),
        // Performer - high gain
        createMockInvestor({
          userName: 'perf1',
          copiers: 5000,
          gain: 50,
          riskScore: 6,
          trades: 100,
          winRatio: 60
        }),
      ];

      const userDetails = new Map([
        ['elite1', createMockUserDetail('elite1', 1001)],
        ['perf1', createMockUserDetail('perf1', 1002)],
      ]);

      const mockResponse1 = createMockFeedResponse([
        { text: 'Bought $AAPL and $TSLA today! Also watching $MSFT.', likes: 20 },
      ]);

      const mockResponse2 = createMockFeedResponse([
        { text: 'No tickers in this post', likes: 5 },
        { text: '$GOOGL is performing well', likes: 10 },
      ]);

      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      vi.mocked(validateFeedResponse)
        .mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2);

      const promise = collectPIFeeds(investors, userDetails, {
        includeEngaging: false,
        postsPerPI: 3, // Explicitly set to match our mock response
      });

      await runAllTimers();
      const result = await promise;

      // Check that tickers were extracted - should have 3 posts total (1 + 2)
      expect(result.posts).toHaveLength(3);
      expect(fetchFromEtoroApi).toHaveBeenCalledTimes(2);

      // Find posts by content
      const post1 = result.posts.find(p => p.text.includes('$AAPL'));
      expect(post1).toBeDefined();
      expect(post1?.tickers).toEqual(expect.arrayContaining(['AAPL', 'TSLA', 'MSFT']));
      expect(post1?.tickers).toHaveLength(3);

      const post2 = result.posts.find(p => p.text === 'No tickers in this post');
      expect(post2).toBeDefined();
      expect(post2?.tickers).toEqual([]);

      const post3 = result.posts.find(p => p.text.includes('$GOOGL'));
      expect(post3).toBeDefined();
      expect(post3?.tickers).toEqual(['GOOGL']);
    });

    it('should detect non-English posts', async () => {
      const investors = [
        createMockInvestor({
          userName: 'elite1',
          copiers: 10000,
          gain: 15,
          riskScore: 5,
          trades: 50,
          winRatio: 50
        }),
        createMockInvestor({
          userName: 'perf1',
          copiers: 5000,
          gain: 50,
          riskScore: 6,
          trades: 100,
          winRatio: 60
        }),
      ];

      const userDetails = new Map([
        ['elite1', createMockUserDetail('elite1', 1001)],
        ['perf1', createMockUserDetail('perf1', 1002)],
      ]);

      const mockResponse1 = createMockFeedResponse([
        { text: 'English post', languageCode: 'en', likes: 5 },
        { text: 'Spanish post', languageCode: 'es-es', likes: 5 },
      ]);

      const mockResponse2 = createMockFeedResponse([
        { text: 'German post', languageCode: 'de-de', likes: 5 },
      ]);

      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      vi.mocked(validateFeedResponse)
        .mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2);

      const promise = collectPIFeeds(investors, userDetails, {
        includeEngaging: false,
        postsPerPI: 3,
      });

      await runAllTimers();
      const result = await promise;

      expect(result.posts).toHaveLength(3);
      expect(result.nonEnglishCount).toBe(2); // Spanish and German

      const englishPosts = result.posts.filter(p => !p.needsTranslation);
      expect(englishPosts).toHaveLength(1); // en

      const nonEnglishPosts = result.posts.filter(p => p.needsTranslation);
      expect(nonEnglishPosts).toHaveLength(2); // es-es, de-de
    });

    it('should aggregate ticker mentions', async () => {
      const investors = [
        createMockInvestor({
          userName: 'elite1',
          copiers: 10000,
          gain: 10, // Low gain to not be top performer
          riskScore: 6,
          trades: 50,
          winRatio: 50
        }),
        createMockInvestor({
          userName: 'perf1',
          copiers: 1000, // Lower copiers to not be elite
          gain: 50,
          riskScore: 7,
          trades: 100,
          winRatio: 60
        }),
      ];

      const userDetails = new Map([
        ['elite1', createMockUserDetail('elite1', 1001)],
        ['perf1', createMockUserDetail('perf1', 1002)],
      ]);

      const mockResponse1 = createMockFeedResponse([
        { text: '$AAPL and $TSLA look good', likes: 10 },
      ]);

      const mockResponse2 = createMockFeedResponse([
        { text: 'Bought $AAPL and $MSFT', likes: 8 },
      ]);

      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      vi.mocked(validateFeedResponse)
        .mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2);

      const promise = collectPIFeeds(investors, userDetails, {
        includeEngaging: false,
        postsPerPI: 1,
      });

      await runAllTimers();
      const result = await promise;

      // Should have called API twice (once per investor)
      expect(fetchFromEtoroApi).toHaveBeenCalledTimes(2);
      expect(result.posts).toHaveLength(2); // 1 from each

      // AAPL mentioned 2 times (once from each investor)
      expect(result.tickerMentions['AAPL']).toBeDefined();
      expect(result.tickerMentions['AAPL'].count).toBe(2);
      expect(result.tickerMentions['AAPL'].authors).toHaveLength(2); // Both investors

      // TSLA mentioned 1 time
      expect(result.tickerMentions['TSLA']).toBeDefined();
      expect(result.tickerMentions['TSLA'].count).toBe(1);

      // MSFT mentioned 1 time
      expect(result.tickerMentions['MSFT']).toBeDefined();
      expect(result.tickerMentions['MSFT'].count).toBe(1);

      // Top tickers sorted by count
      expect(result.topTickers[0].ticker).toBe('AAPL');
      expect(result.topTickers[0].count).toBe(2);
    });

    it('should call progress callback with updates', async () => {
      const investors = [
        createMockInvestor({ userName: 'elite1', copiers: 10000 }),
      ];

      const userDetails = new Map([
        ['elite1', createMockUserDetail('elite1', 1001)],
      ]);

      const mockResponse = createMockFeedResponse([
        { text: 'Test post', likes: 5 },
      ]);

      vi.mocked(fetchFromEtoroApi).mockResolvedValueOnce(mockResponse);
      vi.mocked(validateFeedResponse).mockReturnValueOnce(mockResponse);

      const progressCallback = vi.fn();

      await collectPIFeeds(investors, userDetails, {
        includeEngaging: false,
      }, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      // Should be called with progress 0, some intermediate value, and 100
      expect(progressCallback).toHaveBeenCalledWith(0, expect.stringContaining('Selecting'));
      expect(progressCallback).toHaveBeenCalledWith(100, expect.stringContaining('complete'));
    });

    it('should include processing statistics', async () => {
      const investors = [
        createMockInvestor({ userName: 'elite1', copiers: 10000 }),
      ];

      const userDetails = new Map([
        ['elite1', createMockUserDetail('elite1', 1001)],
      ]);

      const mockResponse = createMockFeedResponse([
        { text: 'Test post', likes: 5 },
      ]);

      vi.mocked(fetchFromEtoroApi).mockResolvedValueOnce(mockResponse);
      vi.mocked(validateFeedResponse).mockReturnValueOnce(mockResponse);

      const result = await collectPIFeeds(investors, userDetails, {
        includeEngaging: false,
      });

      expect(result.stats).toBeDefined();
      expect(result.stats.fetchedPIs).toBe(1);
      expect(result.stats.failedPIs).toBe(0);
      expect(result.stats.totalRequests).toBe(1);
      expect(result.stats.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate PIs across categories', async () => {
      // Create an investor that would appear in multiple categories
      const investors = [
        createMockInvestor({
          userName: 'star',
          copiers: 10000, // Top elite
          gain: 50, // Top performer
          riskScore: 2, // Conservative
          trades: 1000,
          winRatio: 80, // High activity
        }),
      ];

      const userDetails = new Map([
        ['star', createMockUserDetail('star', 1001)],
      ]);

      const mockResponse = createMockFeedResponse([
        { text: 'Test post', likes: 5 },
      ]);

      vi.mocked(fetchFromEtoroApi).mockResolvedValueOnce(mockResponse);
      vi.mocked(validateFeedResponse).mockReturnValueOnce(mockResponse);

      const result = await collectPIFeeds(investors, userDetails, {
        includeEngaging: false,
      });

      // Should only fetch once despite appearing in multiple categories
      expect(fetchFromEtoroApi).toHaveBeenCalledTimes(1);
      expect(result.stats.totalRequests).toBe(1);
    });
  });

  describe('fetchPostsByGcids', () => {
    it('should fetch posts for given gcids', async () => {
      const gcids = [1001, 1002];

      const mockResponse1 = createMockFeedResponse([
        { text: 'Post from user 1', likes: 10 },
      ]);

      const mockResponse2 = createMockFeedResponse([
        { text: 'Post from user 2', likes: 5 },
      ]);

      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      vi.mocked(validateFeedResponse)
        .mockReturnValueOnce(mockResponse1)
        .mockReturnValueOnce(mockResponse2);

      const promise = fetchPostsByGcids(gcids, 3);

      await runAllTimers();
      const results = await promise;

      expect(results).toHaveLength(2);
      expect(fetchFromEtoroApi).toHaveBeenCalledTimes(2);
      expect(fetchFromEtoroApi).toHaveBeenCalledWith(
        expect.stringContaining('1001')
      );
      expect(fetchFromEtoroApi).toHaveBeenCalledWith(
        expect.stringContaining('1002')
      );
    });

    it('should handle empty gcid list', async () => {
      const results = await fetchPostsByGcids([]);

      expect(results).toHaveLength(0);
      expect(fetchFromEtoroApi).not.toHaveBeenCalled();
    });

    it('should skip failed fetches', async () => {
      const gcids = [1001, 1002, 1003];

      const mockResponse1 = createMockFeedResponse([
        { text: 'Post 1', likes: 10 },
      ]);

      const mockResponse3 = createMockFeedResponse([
        { text: 'Post 3', likes: 5 },
      ]);

      vi.mocked(fetchFromEtoroApi)
        .mockResolvedValueOnce(mockResponse1)
        .mockRejectedValueOnce(new Error('API Error')) // Middle one fails
        .mockResolvedValueOnce(mockResponse3);

      vi.mocked(validateFeedResponse)
        .mockReturnValueOnce(mockResponse1)
        // Second call won't happen because fetchFromEtoroApi rejects
        .mockReturnValueOnce(mockResponse3);

      const promise = fetchPostsByGcids(gcids);

      await runAllTimers();
      await runAllTimers();
      const results = await promise;

      // Should return 2 results, skipping the failed one
      expect(results).toHaveLength(2);
    });

    it('should respect postsPerPI parameter', async () => {
      const gcids = [1001];

      const mockResponse = createMockFeedResponse([
        { text: 'Post 1', likes: 10 },
      ]);

      vi.mocked(fetchFromEtoroApi).mockResolvedValueOnce(mockResponse);
      vi.mocked(validateFeedResponse).mockReturnValueOnce(mockResponse);

      await fetchPostsByGcids(gcids, 5);

      expect(fetchFromEtoroApi).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=5')
      );
    });
  });
});
