import { z } from 'zod';

// Instrument details schema
export const instrumentDetailsSchema = z.object({
  instrumentId: z.number(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  imageUrl: z.string().optional(),
  instrumentType: z.string().optional(),
});

export type InstrumentDetailsOutput = z.output<typeof instrumentDetailsSchema>;

// Instrument price data schema
export const instrumentPriceDataSchema = z.object({
  yesterdayReturn: z.number().optional(),
  weekTdReturn: z.number().optional(),
  monthTdReturn: z.number().optional(),
  ytdReturn: z.number().optional(),
});

export type InstrumentPriceDataOutput = z.output<typeof instrumentPriceDataSchema>;

// Closing price response schema
export const closingPriceResponseSchema = z.object({
  instrumentID: z.number(),
  closingPrices: z.array(z.object({
    dateTime: z.string(),
    price: z.number(),
  })).optional(),
});

export type ClosingPriceResponseOutput = z.output<typeof closingPriceResponseSchema>;

// Validation helpers
export function validateInstrumentDetails(data: unknown): InstrumentDetailsOutput | null {
  const result = instrumentDetailsSchema.safeParse(data);
  if (!result.success) {
    console.error('Invalid instrument details:', result.error.issues);
    return null;
  }
  return result.data;
}

export function validateInstrumentPriceData(data: unknown): InstrumentPriceDataOutput | null {
  const result = instrumentPriceDataSchema.safeParse(data);
  if (!result.success) {
    console.error('Invalid instrument price data:', result.error.issues);
    return null;
  }
  return result.data;
}
