import { API_ENDPOINTS, fetchFromEtoroApi } from '../etoro-api-config';

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
    
    console.log(`Fetching instrument details in ${batches.length} batches for ${instrumentIds.length} instruments`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const idsParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.INSTRUMENTS}?instrumentIDs=${idsParam}`;
        
        console.log(`Fetching batch ${i + 1}/${batches.length}: ${batch.length} instruments`);
        
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
          console.warn(`Invalid response for batch ${i + 1}:`, response);
        }
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        console.error(`Error fetching batch ${i + 1}:`, batchError);
        // Continue with next batch even if one fails
      }
    }

    console.log(`Successfully fetched details for ${instrumentMap.size}/${instrumentIds.length} instruments`);
    return instrumentMap;
  } catch (error) {
    console.error('Error fetching instrument details:', error);
    return new Map();
  }
}

export function getInstrumentDisplayName(instrument: InstrumentDisplayData): string {
  return instrument.instrumentDisplayName || instrument.symbolFull || `Instrument ${instrument.instrumentID}`;
}

export function getInstrumentSymbol(instrument: InstrumentDisplayData): string {
  return instrument.symbolFull || instrument.instrumentDisplayName || `${instrument.instrumentID}`;
}

export function getInstrumentImageUrl(instrument: InstrumentDisplayData): string | undefined {
  if (!instrument.images || instrument.images.length === 0) {
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
    
    console.log(`Fetching closing prices in ${batches.length} batches for ${instrumentIds.length} instruments`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const idsParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.INSTRUMENT_CLOSING_PRICES}?instrumentIDs=${idsParam}`;
        
        console.log(`Fetching closing prices batch ${i + 1}/${batches.length}: ${batch.length} instruments`);
        
        // Report progress during fetching
        if (onProgress) {
          const progress = Math.round((i / batches.length) * 100);
          onProgress(progress, `Fetching closing prices batch ${i + 1}/${batches.length}...`);
        }
        
        const response = await fetchFromEtoroApi<ClosingPricesResponse>(endpoint);
        
        // Detailed logging of the response
        console.log(`[Closing Prices] Batch ${i + 1} response:`, {
          hasResponse: !!response,
          isArray: Array.isArray(response),
          dataLength: response?.length || 0,
          requestedIds: batch,
          firstItem: response?.[0] || null
        });
        
        if (response && Array.isArray(response)) {
          console.log(`[Closing Prices] Processing ${response.length} items in batch ${i + 1}`);
          let processedCount = 0;
          let matchedCount = 0;
          
          response.forEach(item => {
            // Log the structure of first item
            if (processedCount === 0) {
              console.log(`[Closing Prices] Sample item structure:`, {
                hasClosingPrices: !!item.closingPrices,
                hasOfficialClosingPrice: !!item.officialClosingPrice,
                instrumentId: item.instrumentId,
                officialClosingPrice: item.officialClosingPrice,
                closingPrices: item.closingPrices
              });
            }
            
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
                console.warn(`[Closing Prices] Instrument ${item.instrumentId} has invalid price data (-1)`);
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
              console.warn(`[Closing Prices] Item missing required fields:`, {
                instrumentId: item.instrumentId,
                hasClosingPrices: !!item.closingPrices,
                hasOfficialClosingPrice: !!item.officialClosingPrice
              });
            }
          });
          
          console.log(`[Closing Prices] Matched ${matchedCount}/${batch.length} requested instruments`);
          console.log(`[Closing Prices] Processed ${processedCount} items with valid data in batch ${i + 1}`);
        } else {
          console.warn(`[Closing Prices] Invalid response for batch ${i + 1}:`, {
            response: JSON.stringify(response).substring(0, 500)
          });
        }
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        console.error(`Error fetching closing prices batch ${i + 1}:`, batchError);
        // Continue with next batch even if one fails
      }
    }

    console.log(`Successfully fetched price data for ${priceDataMap.size}/${instrumentIds.length} instruments`);
    return priceDataMap;
  } catch (error) {
    console.error('Error fetching instrument price data:', error);
    return new Map();
  }
}

export async function getInstrumentClosingPrices(
  instrumentIds: number[], 
  onProgress?: (progress: number, message: string) => void
): Promise<Map<number, InstrumentReturns>> {
  try {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    const returnsMap = new Map<number, InstrumentReturns>();
    
    // Batch requests to avoid URL length limits and API rate limits
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < instrumentIds.length; i += batchSize) {
      batches.push(instrumentIds.slice(i, i + batchSize));
    }
    
    console.log(`Fetching closing prices in ${batches.length} batches for ${instrumentIds.length} instruments`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        const idsParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.INSTRUMENT_CLOSING_PRICES}?instrumentIDs=${idsParam}`;
        
        console.log(`Fetching closing prices batch ${i + 1}/${batches.length}: ${batch.length} instruments`);
        
        // Report progress during fetching
        if (onProgress) {
          const progress = Math.round((i / batches.length) * 100);
          onProgress(progress, `Fetching closing prices batch ${i + 1}/${batches.length}...`);
        }
        
        const response = await fetchFromEtoroApi<ClosingPricesResponse>(endpoint);
        
        // Detailed logging of the response
        console.log(`[Closing Prices Returns] Batch ${i + 1} response:`, {
          hasResponse: !!response,
          isArray: Array.isArray(response),
          dataLength: response?.length || 0,
          requestedIds: batch,
          endpoint: endpoint.substring(0, 100) + '...'
        });
        
        if (response && Array.isArray(response)) {
          console.log(`[Closing Prices Returns] Processing ${response.length} items`);
          let processedCount = 0;
          let matchedCount = 0;
          
          response.forEach(item => {
            if (processedCount === 0) {
              console.log(`[Closing Prices Returns] First item:`, JSON.stringify(item));
            }
            
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
                console.warn(`[Closing Prices Returns] Instrument ${item.instrumentId} has invalid price data (-1)`);
                return;
              }
              
              const returns: InstrumentReturns = {
                yesterday: daily && daily > 0 ? ((current - daily) / daily) * 100 : 0,
                weekTD: weekly && weekly > 0 ? ((current - weekly) / weekly) * 100 : 0,
                monthTD: monthly && monthly > 0 ? ((current - monthly) / monthly) * 100 : 0
              };
              
              returnsMap.set(item.instrumentId, returns);
              processedCount++;
            }
          });
          
          console.log(`[Closing Prices Returns] Matched ${matchedCount}/${batch.length} requested instruments`);
          console.log(`[Closing Prices Returns] Processed ${processedCount} items with returns`);
        } else {
          console.warn(`[Closing Prices Returns] Invalid response for batch ${i + 1}:`, {
            response: JSON.stringify(response).substring(0, 500)
          });
        }
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (batchError) {
        console.error(`Error fetching closing prices batch ${i + 1}:`, batchError);
        // Continue with next batch even if one fails
      }
    }

    console.log(`Successfully fetched closing prices for ${returnsMap.size}/${instrumentIds.length} instruments`);
    return returnsMap;
  } catch (error) {
    console.error('Error fetching instrument closing prices:', error);
    return new Map();
  }
}

export async function getInstrumentRates(instrumentIds: number[], instrumentDetails?: Map<number, InstrumentDisplayData>): Promise<Map<number, number>> {
  try {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    const ratesMap = new Map<number, number>();
    
    console.log(`Fetching YTD returns for ${instrumentIds.length} instruments using search API`);
    
    // Process each instrument individually using the search API
    for (let i = 0; i < instrumentIds.length; i++) {
      const instrumentId = instrumentIds[i];
      
      try {
        // First try searching by instrumentID
        let searchText = instrumentId.toString();
        let endpoint = `${API_ENDPOINTS.INSTRUMENT_SEARCH}?searchText=${searchText}&fields=instrumentId,currYearPriceChange,displayname,symbol&pageSize=10&pageNumber=1`;
        
        console.log(`Searching for instrument ${instrumentId} (${i + 1}/${instrumentIds.length})`);
        
        let response = await fetchFromEtoroApi<InstrumentSearchResponse>(endpoint);
        
        // Find the matching instrument in results
        let matchingInstrument = response?.items?.find(item => item.instrumentId === instrumentId);
        
        // If not found by ID and we have instrument details, try searching by symbol
        if (!matchingInstrument && instrumentDetails && instrumentDetails.has(instrumentId)) {
          const details = instrumentDetails.get(instrumentId);
          if (details && details.symbolFull) {
            console.log(`Instrument ${instrumentId} not found by ID, trying symbol: ${details.symbolFull}`);
            searchText = details.symbolFull;
            endpoint = `${API_ENDPOINTS.INSTRUMENT_SEARCH}?searchText=${searchText}&fields=instrumentId,currYearPriceChange,displayname,symbol&pageSize=10&pageNumber=1`;
            response = await fetchFromEtoroApi<InstrumentSearchResponse>(endpoint);
            matchingInstrument = response?.items?.find(item => item.instrumentId === instrumentId);
          }
        }
        
        if (matchingInstrument && matchingInstrument.currYearPriceChange !== undefined && matchingInstrument.currYearPriceChange !== null) {
          ratesMap.set(instrumentId, matchingInstrument.currYearPriceChange);
          if (i < 5) {
            console.log(`Found YTD return for ${instrumentId} (${matchingInstrument.displayname}): ${matchingInstrument.currYearPriceChange}%`);
          }
        } else {
          if (i < 5) {
            console.log(`No YTD return found for instrument ${instrumentId}`);
          }
        }
        
        // Add delay between requests to avoid rate limiting
        if (i < instrumentIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between requests
        }
        
      } catch (error) {
        console.error(`Error fetching rate for instrument ${instrumentId}:`, error);
        // Continue with next instrument even if one fails
      }
    }

    console.log(`Successfully fetched YTD returns for ${ratesMap.size}/${instrumentIds.length} instruments`);
    
    // Log some sample rates for debugging
    if (ratesMap.size > 0) {
      const samples = Array.from(ratesMap.entries()).slice(0, 5);
      console.log('Sample YTD returns:', samples.map(([id, rate]) => `${id}: ${rate.toFixed(2)}%`).join(', '));
    } else {
      console.warn('No YTD returns were fetched! This might be due to API limitations or data availability.');
    }
    
    return ratesMap;
  } catch (error) {
    console.error('Error fetching instrument YTD returns:', error);
    return new Map();
  }
}