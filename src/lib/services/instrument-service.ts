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
  // Alternative field names we might encounter
  currentYear?: number;
  ytd?: number;
  ytdReturn?: number;
  yearToDate?: number;
  change?: number;
  changePercent?: number;
  [key: string]: any; // Allow any additional fields
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
    
    // Batch requests to avoid URL length limits
    const batchSize = 50; // Same batch size as instrument details
    const batches = [];
    
    for (let i = 0; i < instrumentIds.length; i += batchSize) {
      batches.push(instrumentIds.slice(i, i + batchSize));
    }
    
    console.log(`Fetching YTD returns in ${batches.length} batches for ${instrumentIds.length} instruments`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const idsParam = batch.join(',');
        const endpoint = `${API_ENDPOINTS.INSTRUMENT_RATES}?instrumentIDs=${idsParam}&period=CurrYear`;
        
        console.log(`Fetching rates batch ${i + 1}/${batches.length}: ${batch.length} instruments`);
        
        const response = await fetchFromEtoroApi<InstrumentRatesResponse>(endpoint);
        
        // Enhanced logging for debugging
        console.log(`Raw response structure for batch ${i + 1}:`, {
          hasResponse: !!response,
          hasRates: !!(response && response.rates),
          isRatesArray: response && Array.isArray(response.rates),
          ratesLength: response && response.rates ? response.rates.length : 0,
          sampleResponse: response && response.rates && response.rates.length > 0 ? response.rates[0] : null
        });
        
        if (response && response.rates && Array.isArray(response.rates)) {
          console.log(`Received ${response.rates.length} rates in batch ${i + 1}`);
          
          response.rates.forEach((rate, index) => {
            // Enhanced logging for first few rates
            if (index < 3) {
              console.log(`Rate ${index} structure:`, {
                instrumentID: rate.instrumentID,
                currYear: rate.currYear,
                ask: rate.ask,
                bid: rate.bid,
                allFields: Object.keys(rate)
              });
            }
            
            // Try multiple possible field names for YTD return
            let ytdValue = null;
            const possibleFields = ['currYear', 'currentYear', 'ytd', 'ytdReturn', 'yearToDate', 'change', 'changePercent'];
            
            for (const field of possibleFields) {
              if (rate[field] !== undefined && rate[field] !== null) {
                ytdValue = rate[field];
                if (index < 3) {
                  console.log(`Found YTD return in field '${field}' for instrument ${rate.instrumentID}: ${ytdValue}`);
                }
                break;
              }
            }
            
            if (rate.instrumentID && ytdValue !== null && typeof ytdValue === 'number') {
              ratesMap.set(rate.instrumentID, ytdValue);
              if (index < 3) {
                console.log(`Successfully mapped instrument ${rate.instrumentID} -> ${ytdValue}%`);
              }
            } else if (index < 3) {
              console.log(`Skipping rate for instrument ${rate.instrumentID}: no valid YTD field found (tried: ${possibleFields.join(', ')})`);
            }
          });
        } else {
          console.warn(`Invalid rates response for batch ${i + 1}:`, {
            response: response,
            typeofResponse: typeof response,
            hasRates: !!(response && response.rates),
            ratesType: response && response.rates ? typeof response.rates : 'undefined'
          });
        }
        
        // Add delay between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.error(`Error fetching rates batch ${i + 1}:`, error);
        // Continue with next batch even if one fails
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