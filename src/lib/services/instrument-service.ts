import { API_ENDPOINTS, fetchFromEtoroApi } from '../etoro-api-config';
import { logger } from '../logger';

export interface InstrumentImage {
  instrumentID: number;
  width?: number;
  height?: number;
  uri: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface InstrumentDisplayData {
  instrumentID: number;
  instrumentDisplayName: string;
  symbolFull: string;
  exchangeID: number;
  instrumentTypeID: number;
  stocksIndustryID?: number;
  priceSource?: string;
  hasExpirationDate?: boolean;
  isInternalInstrument?: boolean;
  images: InstrumentImage[];
}

export interface InstrumentsResponse {
  instrumentDisplayDatas: InstrumentDisplayData[];
}

export async function getInstrumentDetails(
  instrumentIds: number[], 
  onProgress?: (progress: number, message: string) => void
): Promise<Map<number, InstrumentDisplayData>> {
  try {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    const instrumentMap = new Map<number, InstrumentDisplayData>();
    
    // Batch requests to avoid URL length limits and API rate limits
    const batchSize = 50; // Process 50 instruments at a time
    const batches = [];
    
    for (let i = 0; i < instrumentIds.length; i += batchSize) {
      batches.push(instrumentIds.slice(i, i + batchSize));
    }
    
    logger.info('Fetching instrument details', {
      totalBatches: batches.length,
      totalInstruments: instrumentIds.length
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const idsParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.INSTRUMENTS}?instrumentIDs=${idsParam}`;

        logger.debug('Fetching instrument batch', {
          batch: i + 1,
          totalBatches: batches.length,
          batchSize: batch.length
        });
        
        // Report progress during fetching
        if (onProgress) {
          const progress = Math.round((i / batches.length) * 100);
          onProgress(progress, `Fetching instrument details batch ${i + 1}/${batches.length}...`);
        }
        
        const response = await fetchFromEtoroApi<InstrumentsResponse>(endpoint);
        
        if (response && response.instrumentDisplayDatas && Array.isArray(response.instrumentDisplayDatas)) {
          response.instrumentDisplayDatas.forEach(instrument => {
            instrumentMap.set(instrument.instrumentID, instrument);
          });
        } else {
          logger.warn('Invalid instrument details response', {
            batch: i + 1,
            hasResponse: !!response
          });
        }
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        logger.error('Error fetching instrument batch', {
          batch: i + 1,
          error: batchError instanceof Error ? batchError.message : String(batchError)
        });
        // Continue with next batch even if one fails
      }
    }

    logger.info('Successfully fetched instrument details', {
      fetched: instrumentMap.size,
      total: instrumentIds.length
    });
    return instrumentMap;
  } catch (error) {
    logger.error('Error fetching instrument details', {
      error: error instanceof Error ? error.message : String(error)
    });
    return new Map();
  }
}

export function getInstrumentDisplayName(instrument: InstrumentDisplayData | undefined): string {
  if (!instrument) return 'Unknown';
  return instrument.instrumentDisplayName || instrument.symbolFull || `Instrument ${instrument.instrumentID}`;
}

export function getInstrumentSymbol(instrument: InstrumentDisplayData | undefined): string {
  if (!instrument) return '';
  return instrument.symbolFull || instrument.instrumentDisplayName || `${instrument.instrumentID}`;
}

export function getInstrumentImageUrl(instrument: InstrumentDisplayData | undefined): string | undefined {
  if (!instrument || !instrument.images || instrument.images.length === 0) {
    return undefined;
  }
  
  // Prefer 50x50 or 35x35 size for avatars
  const preferredImage = instrument.images.find(img => img.width === 50) || 
                        instrument.images.find(img => img.width === 35) ||
                        instrument.images.find(img => img.width === 90) ||
                        instrument.images[0];
  
  return preferredImage?.uri;
}


export interface InstrumentSearchItem {
  instrumentId: number;
  displayname: string;
  symbol?: string;
  currYearPriceChange?: number;
  logo50x50?: string;
  // Add other fields as needed
}

export interface InstrumentSearchResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  items: InstrumentSearchItem[];
}

export interface ClosingPriceItem {
  price: number;
  date: string;
}

export interface ClosingPricesData {
  daily: ClosingPriceItem;
  weekly: ClosingPriceItem;
  monthly: ClosingPriceItem;
}

export interface InstrumentClosingPrice {
  instrumentId: number;
  officialClosingPrice: number;
  isMarketOpen: boolean;
  closingPrices: ClosingPricesData;
}

// The API returns an array directly, not wrapped in a data property
export type ClosingPricesResponse = InstrumentClosingPrice[];

export interface InstrumentReturns {
  yesterday: number;
  weekTD: number;
  monthTD: number;
}

export interface InstrumentPriceData {
  currentPrice: number;
  closingPrices: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  returns: InstrumentReturns;
}

export async function getInstrumentPriceData(
  instrumentIds: number[],
  onProgress?: (progress: number, message: string) => void
): Promise<Map<number, InstrumentPriceData>> {
  try {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    const priceDataMap = new Map<number, InstrumentPriceData>();

    // Batch requests to avoid URL length limits and API rate limits
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < instrumentIds.length; i += batchSize) {
      batches.push(instrumentIds.slice(i, i + batchSize));
    }

    logger.info('Fetching price data', {
      totalBatches: batches.length,
      totalInstruments: instrumentIds.length
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const idsParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.INSTRUMENT_CLOSING_PRICES}?instrumentIDs=${idsParam}`;

        logger.debug('Fetching price data batch', {
          batch: i + 1,
          totalBatches: batches.length,
          batchSize: batch.length
        });
        
        // Report progress during fetching
        if (onProgress) {
          const progress = Math.round((i / batches.length) * 100);
          onProgress(progress, `Fetching closing prices batch ${i + 1}/${batches.length}...`);
        }
        
        const response = await fetchFromEtoroApi<ClosingPricesResponse>(endpoint);

        logger.debug('Price data batch response', {
          batch: i + 1,
          hasResponse: !!response,
          isArray: Array.isArray(response),
          dataLength: response?.length || 0
        });

        if (response && Array.isArray(response)) {
          let processedCount = 0;
          let matchedCount = 0;

          response.forEach(item => {
            // Check if this instrument was actually requested
            if (!batch.includes(item.instrumentId)) {
              return; // Skip instruments we didn't request
            }

            matchedCount++;

            if (item.closingPrices && item.officialClosingPrice) {
              const current = item.officialClosingPrice;
              const daily = item.closingPrices.daily?.price;
              const weekly = item.closingPrices.weekly?.price;
              const monthly = item.closingPrices.monthly?.price;

              // Skip if prices are invalid (-1 means no data)
              if (daily === -1 || weekly === -1 || monthly === -1) {
                logger.debug('Invalid price data for instrument', {
                  instrumentId: item.instrumentId
                });
                return;
              }

              const priceData: InstrumentPriceData = {
                currentPrice: current,
                closingPrices: {
                  daily: daily || 0,
                  weekly: weekly || 0,
                  monthly: monthly || 0
                },
                returns: {
                  yesterday: daily && daily > 0 ? ((current - daily) / daily) * 100 : 0,
                  weekTD: weekly && weekly > 0 ? ((current - weekly) / weekly) * 100 : 0,
                  monthTD: monthly && monthly > 0 ? ((current - monthly) / monthly) * 100 : 0
                }
              };

              priceDataMap.set(item.instrumentId, priceData);
              processedCount++;
            } else {
              logger.debug('Item missing required fields', {
                instrumentId: item.instrumentId,
                hasClosingPrices: !!item.closingPrices,
                hasOfficialClosingPrice: !!item.officialClosingPrice
              });
            }
          });

          logger.debug('Price data batch processed', {
            batch: i + 1,
            matched: matchedCount,
            requested: batch.length,
            processed: processedCount
          });
        } else {
          logger.warn('Invalid price data response', {
            batch: i + 1
          });
        }
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        logger.error('Error fetching price data batch', {
          batch: i + 1,
          error: batchError instanceof Error ? batchError.message : String(batchError)
        });
        // Continue with next batch even if one fails
      }
    }

    logger.info('Successfully fetched price data', {
      fetched: priceDataMap.size,
      total: instrumentIds.length
    });
    return priceDataMap;
  } catch (error) {
    logger.error('Error fetching instrument price data', {
      error: error instanceof Error ? error.message : String(error)
    });
    return new Map();
  }
}

