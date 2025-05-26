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