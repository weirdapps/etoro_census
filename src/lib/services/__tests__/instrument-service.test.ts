import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the etoro-api-config module
vi.mock('../../etoro-api-config', () => ({
  API_ENDPOINTS: {
    INSTRUMENTS: '/v1/market-data/instruments',
    INSTRUMENT_CLOSING_PRICES: '/v1/market-data/instruments/history/closing-price',
  },
  fetchFromEtoroApi: vi.fn(),
}));

import { fetchFromEtoroApi } from '../../etoro-api-config';
import {
  getInstrumentDetails,
  getInstrumentDisplayName,
  getInstrumentSymbol,
  getInstrumentImageUrl,
  getInstrumentPriceData,
  InstrumentDisplayData,
  InstrumentsResponse,
  ClosingPricesResponse,
} from '../instrument-service';

// Mock instrument data
const mockInstrumentDisplayData: InstrumentDisplayData[] = [
  {
    instrumentID: 1001,
    instrumentDisplayName: 'Apple Inc.',
    symbolFull: 'AAPL',
    exchangeID: 1,
    instrumentTypeID: 1,
    stocksIndustryID: 10,
    images: [
      { instrumentID: 1001, width: 50, height: 50, uri: 'https://example.com/aapl-50.png' },
      { instrumentID: 1001, width: 90, height: 90, uri: 'https://example.com/aapl-90.png' },
    ],
  },
  {
    instrumentID: 1002,
    instrumentDisplayName: 'Alphabet Inc.',
    symbolFull: 'GOOGL',
    exchangeID: 1,
    instrumentTypeID: 1,
    images: [
      { instrumentID: 1002, width: 35, height: 35, uri: 'https://example.com/googl-35.png' },
    ],
  },
  {
    instrumentID: 1003,
    instrumentDisplayName: 'SPDR S&P 500 ETF',
    symbolFull: 'SPY',
    exchangeID: 2,
    instrumentTypeID: 2,
    images: [],
  },
];

const mockClosingPricesResponse: ClosingPricesResponse = [
  {
    instrumentId: 1001,
    officialClosingPrice: 185.50,
    isMarketOpen: false,
    closingPrices: {
      daily: { price: 182.00, date: '2024-01-15' },
      weekly: { price: 178.00, date: '2024-01-08' },
      monthly: { price: 170.00, date: '2023-12-15' },
    },
  },
  {
    instrumentId: 1002,
    officialClosingPrice: 145.00,
    isMarketOpen: false,
    closingPrices: {
      daily: { price: 146.00, date: '2024-01-15' },
      weekly: { price: 143.00, date: '2024-01-08' },
      monthly: { price: 140.00, date: '2023-12-15' },
    },
  },
];


describe('instrument-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getInstrumentDetails', () => {
    it('should fetch instrument details for multiple IDs', async () => {
      const mockResponse: InstrumentsResponse = {
        instrumentDisplayDatas: mockInstrumentDisplayData,
      };
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockResponse);

      const result = await getInstrumentDetails([1001, 1002, 1003]);

      expect(result.size).toBe(3);
      expect(result.get(1001)?.instrumentDisplayName).toBe('Apple Inc.');
      expect(result.get(1002)?.symbolFull).toBe('GOOGL');
      expect(fetchFromEtoroApi).toHaveBeenCalledWith(
        expect.stringContaining('instrumentIDs=1001,1002,1003')
      );
    });

    it('should return empty map for empty instrument list', async () => {
      const result = await getInstrumentDetails([]);

      expect(result.size).toBe(0);
      expect(fetchFromEtoroApi).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(fetchFromEtoroApi).mockRejectedValue(new Error('API Error'));

      const result = await getInstrumentDetails([1001]);

      expect(result.size).toBe(0);
    });

    it('should batch requests correctly for large arrays', async () => {
      const manyIds = Array.from({ length: 120 }, (_, i) => i + 1);
      const mockResponse: InstrumentsResponse = {
        instrumentDisplayDatas: [mockInstrumentDisplayData[0]],
      };
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockResponse);

      await getInstrumentDetails(manyIds);

      // 120 IDs / 50 per batch = 3 batches
      expect(fetchFromEtoroApi).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid response format', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue({ invalid: 'data' });

      const result = await getInstrumentDetails([1001]);

      expect(result.size).toBe(0);
    });

    it('should handle null response', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(null);

      const result = await getInstrumentDetails([1001]);

      expect(result.size).toBe(0);
    });

    it('should call progress callback during fetching', async () => {
      const mockResponse: InstrumentsResponse = {
        instrumentDisplayDatas: mockInstrumentDisplayData.slice(0, 1),
      };
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockResponse);

      const progressCallback = vi.fn();
      await getInstrumentDetails([1001], progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should continue fetching after batch error', async () => {
      const mockResponse: InstrumentsResponse = {
        instrumentDisplayDatas: [mockInstrumentDisplayData[0]],
      };
      vi.mocked(fetchFromEtoroApi)
        .mockRejectedValueOnce(new Error('Batch 1 error'))
        .mockResolvedValueOnce(mockResponse);

      const ids = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = await getInstrumentDetails(ids);

      // Should still have results from successful batch
      expect(result.size).toBeGreaterThan(0);
      expect(fetchFromEtoroApi).toHaveBeenCalledTimes(2);
    });
  });

  describe('getInstrumentDisplayName', () => {
    it('should return display name when available', () => {
      const instrument = mockInstrumentDisplayData[0];
      const result = getInstrumentDisplayName(instrument);

      expect(result).toBe('Apple Inc.');
    });

    it('should return symbol when display name is missing', () => {
      const instrument = { ...mockInstrumentDisplayData[0], instrumentDisplayName: '' };
      const result = getInstrumentDisplayName(instrument);

      expect(result).toBe('AAPL');
    });

    it('should return instrument ID as fallback', () => {
      const instrument = { ...mockInstrumentDisplayData[0], instrumentDisplayName: '', symbolFull: '' };
      const result = getInstrumentDisplayName(instrument);

      expect(result).toBe('Instrument 1001');
    });

    it('should return Unknown for undefined instrument', () => {
      const result = getInstrumentDisplayName(undefined);

      expect(result).toBe('Unknown');
    });
  });

  describe('getInstrumentSymbol', () => {
    it('should return symbol when available', () => {
      const instrument = mockInstrumentDisplayData[0];
      const result = getInstrumentSymbol(instrument);

      expect(result).toBe('AAPL');
    });

    it('should return display name when symbol is missing', () => {
      const instrument = { ...mockInstrumentDisplayData[0], symbolFull: '' };
      const result = getInstrumentSymbol(instrument);

      expect(result).toBe('Apple Inc.');
    });

    it('should return instrument ID as fallback', () => {
      const instrument = { ...mockInstrumentDisplayData[0], symbolFull: '', instrumentDisplayName: '' };
      const result = getInstrumentSymbol(instrument);

      expect(result).toBe('1001');
    });

    it('should return empty string for undefined instrument', () => {
      const result = getInstrumentSymbol(undefined);

      expect(result).toBe('');
    });
  });

  describe('getInstrumentImageUrl', () => {
    it('should return preferred 50x50 image URL', () => {
      const instrument = mockInstrumentDisplayData[0];
      const result = getInstrumentImageUrl(instrument);

      expect(result).toBe('https://example.com/aapl-50.png');
    });

    it('should return 35x35 image if 50x50 not available', () => {
      const instrument = mockInstrumentDisplayData[1];
      const result = getInstrumentImageUrl(instrument);

      expect(result).toBe('https://example.com/googl-35.png');
    });

    it('should return undefined for instrument without images', () => {
      const instrument = mockInstrumentDisplayData[2];
      const result = getInstrumentImageUrl(instrument);

      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined instrument', () => {
      const result = getInstrumentImageUrl(undefined);

      expect(result).toBeUndefined();
    });

    it('should prefer 90x90 over first image if neither 50 nor 35 available', () => {
      const instrument = {
        ...mockInstrumentDisplayData[0],
        images: [
          { instrumentID: 1001, width: 150, height: 150, uri: 'https://example.com/150.png' },
          { instrumentID: 1001, width: 90, height: 90, uri: 'https://example.com/90.png' },
        ],
      };
      const result = getInstrumentImageUrl(instrument);

      expect(result).toBe('https://example.com/90.png');
    });
  });

  describe('getInstrumentPriceData', () => {
    it('should fetch price data for multiple instruments', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockClosingPricesResponse);

      const result = await getInstrumentPriceData([1001, 1002]);

      expect(result.size).toBe(2);
      expect(result.get(1001)?.currentPrice).toBe(185.50);
      expect(result.get(1002)?.currentPrice).toBe(145.00);
    });

    it('should calculate returns correctly', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockClosingPricesResponse);

      const result = await getInstrumentPriceData([1001]);

      const priceData = result.get(1001);
      expect(priceData).toBeDefined();

      // Yesterday return: (185.50 - 182.00) / 182.00 * 100 = 1.92%
      expect(priceData?.returns.yesterday).toBeCloseTo(1.92, 1);

      // Week TD return: (185.50 - 178.00) / 178.00 * 100 = 4.21%
      expect(priceData?.returns.weekTD).toBeCloseTo(4.21, 1);

      // Month TD return: (185.50 - 170.00) / 170.00 * 100 = 9.12%
      expect(priceData?.returns.monthTD).toBeCloseTo(9.12, 1);
    });

    it('should return empty map for empty instrument list', async () => {
      const result = await getInstrumentPriceData([]);

      expect(result.size).toBe(0);
      expect(fetchFromEtoroApi).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(fetchFromEtoroApi).mockRejectedValue(new Error('API Error'));

      const result = await getInstrumentPriceData([1001]);

      expect(result.size).toBe(0);
    });

    it('should skip instruments with invalid price data (-1)', async () => {
      const responseWithInvalid: ClosingPricesResponse = [
        {
          instrumentId: 1001,
          officialClosingPrice: 185.50,
          isMarketOpen: false,
          closingPrices: {
            daily: { price: -1, date: '2024-01-15' },
            weekly: { price: 178.00, date: '2024-01-08' },
            monthly: { price: 170.00, date: '2023-12-15' },
          },
        },
      ];
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(responseWithInvalid);

      const result = await getInstrumentPriceData([1001]);

      expect(result.size).toBe(0);
    });

    it('should call progress callback during fetching', async () => {
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(mockClosingPricesResponse);

      const progressCallback = vi.fn();
      await getInstrumentPriceData([1001], progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should batch requests correctly', async () => {
      const manyIds = Array.from({ length: 120 }, (_, i) => i + 1);
      vi.mocked(fetchFromEtoroApi).mockResolvedValue([]);

      await getInstrumentPriceData(manyIds);

      // 120 IDs / 50 per batch = 3 batches
      expect(fetchFromEtoroApi).toHaveBeenCalledTimes(3);
    });

    it('should handle missing closingPrices field', async () => {
      const responseWithMissing: ClosingPricesResponse = [
        {
          instrumentId: 1001,
          officialClosingPrice: 185.50,
          isMarketOpen: false,
          closingPrices: undefined as unknown as ClosingPricesResponse[0]['closingPrices'],
        },
      ];
      vi.mocked(fetchFromEtoroApi).mockResolvedValue(responseWithMissing);

      const result = await getInstrumentPriceData([1001]);

      expect(result.size).toBe(0);
    });
  });

});
