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