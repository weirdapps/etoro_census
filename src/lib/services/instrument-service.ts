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

export async function getInstrumentDetails(instrumentIds: number[]): Promise<Map<number, InstrumentDisplayData>> {
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

export interface InstrumentRate {
  instrumentID: number;
  currYear?: number;
  ask?: number;
  bid?: number;
}

export interface InstrumentRatesResponse {
  rates: InstrumentRate[];
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

export async function getInstrumentRates(instrumentIds: number[]): Promise<Map<number, number>> {
  try {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    const ratesMap = new Map<number, number>();
    
    // First, get all instrument details to have their symbols
    console.log(`Fetching details for ${instrumentIds.length} instruments to get symbols...`);
    const allInstrumentDetails = await getInstrumentDetails(instrumentIds);
    
    // Create a map of symbol to instrumentId for reverse lookup
    const symbolToId = new Map<string, number>();
    allInstrumentDetails.forEach((details, id) => {
      if (details.symbolFull) {
        symbolToId.set(details.symbolFull.toUpperCase(), id);
      }
    });
    
    // Batch the symbols for search
    const symbols = Array.from(symbolToId.keys());
    const batchSize = 20; // Smaller batch size for search
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }
    
    console.log(`Fetching YTD returns in ${batches.length} batches for ${symbols.length} symbols`);
    
    for (let i = 0; i < batches.length; i++) {
      const batchSymbols = batches[i];
      
      try {
        // Search for multiple symbols at once
        const searchText = batchSymbols.join(' OR ');
        
        const endpoint = `${API_ENDPOINTS.INSTRUMENT_SEARCH}?` + 
          `searchText=${encodeURIComponent(searchText)}` +
          `&fields=instrumentId,symbol,currYearPriceChange` +
          `&pageSize=100` + // Get max results
          `&pageNumber=1`;
        
        console.log(`Fetching batch ${i + 1}/${batches.length}: searching for ${batchSymbols.length} symbols`);
        
        const response = await fetchFromEtoroApi<InstrumentSearchResponse>(endpoint);
        
        if (response && response.items && Array.isArray(response.items)) {
          console.log(`Received ${response.items.length} items in batch ${i + 1}`);
          
          // Match results back to our instrument IDs
          response.items.forEach(item => {
            if (item.symbol && item.currYearPriceChange !== undefined) {
              const originalId = symbolToId.get(item.symbol.toUpperCase());
              if (originalId) {
                ratesMap.set(originalId, item.currYearPriceChange);
              } else {
                // Try to match by instrumentId if available
                if (instrumentIds.includes(item.instrumentId)) {
                  ratesMap.set(item.instrumentId, item.currYearPriceChange);
                }
              }
            }
          });
        }
        
        // Add delay between batches
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
      } catch (error) {
        console.error(`Error fetching YTD returns batch ${i + 1}:`, error);
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