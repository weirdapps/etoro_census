import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function truncateText(text: string | undefined | null, maxLength: number = 24): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Constructs a safe eToro market URL from a symbol.
 * Sanitizes the input to prevent injection attacks.
 *
 * @param symbol - The instrument symbol (e.g., "AAPL", "BTC")
 * @returns Safe eToro market URL
 */
export function getEtoroMarketUrl(symbol: string | undefined | null): string {
  if (!symbol) return '';
  // Sanitize: only allow alphanumeric characters, dots, and hyphens
  const safeSymbol = symbol.toLowerCase().replace(/[^a-z0-9.-]/g, '');
  if (!safeSymbol) return '';
  return `https://www.etoro.com/markets/${encodeURIComponent(safeSymbol)}`;
}

/**
 * Constructs a safe eToro investor profile URL.
 * Sanitizes the username to prevent injection attacks.
 *
 * @param username - The investor username
 * @returns Safe eToro profile URL
 */
export function getEtoroProfileUrl(username: string | undefined | null): string {
  if (!username) return '';
  // Sanitize: only allow alphanumeric characters and underscores
  const safeUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!safeUsername) return '';
  return `https://www.etoro.com/people/${encodeURIComponent(safeUsername)}`;
}