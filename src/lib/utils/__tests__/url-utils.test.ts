import { describe, it, expect } from 'vitest';
import { getEtoroMarketUrl, getEtoroProfileUrl, truncateText } from '../../utils';

describe('URL Utilities', () => {
  describe('getEtoroMarketUrl', () => {
    it('should construct a valid market URL for a symbol', () => {
      expect(getEtoroMarketUrl('AAPL')).toBe('https://www.etoro.com/markets/aapl');
    });

    it('should handle lowercase symbols', () => {
      expect(getEtoroMarketUrl('btc')).toBe('https://www.etoro.com/markets/btc');
    });

    it('should handle symbols with dots', () => {
      expect(getEtoroMarketUrl('BRK.A')).toBe('https://www.etoro.com/markets/brk.a');
    });

    it('should handle symbols with hyphens', () => {
      expect(getEtoroMarketUrl('VTI-USD')).toBe('https://www.etoro.com/markets/vti-usd');
    });

    it('should sanitize potentially malicious input', () => {
      // Removes special characters but keeps alphanumeric, dots, and hyphens
      expect(getEtoroMarketUrl('AAPL<script>')).toBe('https://www.etoro.com/markets/aaplscript');
      expect(getEtoroMarketUrl('BTC/../../etc')).toBe('https://www.etoro.com/markets/btc....etc');
      // Path traversal characters removed
      expect(getEtoroMarketUrl('../../../etc/passwd')).toBe('https://www.etoro.com/markets/......etcpasswd');
    });

    it('should return empty string for null/undefined', () => {
      expect(getEtoroMarketUrl(null)).toBe('');
      expect(getEtoroMarketUrl(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(getEtoroMarketUrl('')).toBe('');
    });

    it('should return empty string if sanitization removes all characters', () => {
      expect(getEtoroMarketUrl('###')).toBe('');
      expect(getEtoroMarketUrl('<>')).toBe('');
    });
  });

  describe('getEtoroProfileUrl', () => {
    it('should construct a valid profile URL for a username', () => {
      expect(getEtoroProfileUrl('plessas')).toBe('https://www.etoro.com/people/plessas');
    });

    it('should handle uppercase usernames', () => {
      expect(getEtoroProfileUrl('JohnDoe')).toBe('https://www.etoro.com/people/johndoe');
    });

    it('should handle usernames with underscores', () => {
      expect(getEtoroProfileUrl('john_doe')).toBe('https://www.etoro.com/people/john_doe');
    });

    it('should sanitize potentially malicious input', () => {
      // Removes special characters but keeps alphanumeric
      expect(getEtoroProfileUrl('user<script>')).toBe('https://www.etoro.com/people/userscript');
      expect(getEtoroProfileUrl('user/../admin')).toBe('https://www.etoro.com/people/useradmin');
      // Removes dangerous path traversal characters
      expect(getEtoroProfileUrl('../../../etc/passwd')).toBe('https://www.etoro.com/people/etcpasswd');
    });

    it('should return empty string for null/undefined', () => {
      expect(getEtoroProfileUrl(null)).toBe('');
      expect(getEtoroProfileUrl(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(getEtoroProfileUrl('')).toBe('');
    });

    it('should return empty string if sanitization removes all characters', () => {
      expect(getEtoroProfileUrl('###')).toBe('');
      expect(getEtoroProfileUrl('<>')).toBe('');
    });
  });

  describe('truncateText', () => {
    it('should return original text if shorter than max length', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate text with ellipsis if longer than max length', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
    });

    it('should handle exact max length', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });

    it('should return empty string for null/undefined', () => {
      expect(truncateText(null)).toBe('');
      expect(truncateText(undefined)).toBe('');
    });

    it('should use default max length of 24', () => {
      const longText = 'This is a very long text that exceeds the default maximum length';
      expect(truncateText(longText)).toBe('This is a very long t...');
      expect(truncateText(longText).length).toBe(24);
    });
  });
});
