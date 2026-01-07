import { describe, it, expect } from 'vitest';
import {
  ETORO_COUNTRY_MAPPING,
  getCountryInfo,
  getCountryFlag,
  getCountryName,
  getCountryCode,
  getAllCountries,
} from '../country-mapping';

describe('Country Mapping', () => {
  describe('ETORO_COUNTRY_MAPPING', () => {
    it('should have mapping for known countries', () => {
      expect(ETORO_COUNTRY_MAPPING[218]).toBeDefined();
      expect(ETORO_COUNTRY_MAPPING[218].name).toBe('United Kingdom');
      expect(ETORO_COUNTRY_MAPPING[218].code).toBe('GB');
      expect(ETORO_COUNTRY_MAPPING[218].flag).toBe('🇬🇧');
    });

    it('should have mapping for United States', () => {
      expect(ETORO_COUNTRY_MAPPING[219]).toBeDefined();
      expect(ETORO_COUNTRY_MAPPING[219].name).toBe('United States');
      expect(ETORO_COUNTRY_MAPPING[219].code).toBe('US');
    });

    it('should have mapping for Germany', () => {
      expect(ETORO_COUNTRY_MAPPING[79]).toBeDefined();
      expect(ETORO_COUNTRY_MAPPING[79].name).toBe('Germany');
      expect(ETORO_COUNTRY_MAPPING[79].code).toBe('DE');
    });

    it('should have at least 50 countries mapped', () => {
      const countryCount = Object.keys(ETORO_COUNTRY_MAPPING).length;
      expect(countryCount).toBeGreaterThanOrEqual(50);
    });
  });

  describe('getCountryInfo', () => {
    it('should return country info for valid ID', () => {
      const info = getCountryInfo(218);
      expect(info).not.toBeNull();
      expect(info?.name).toBe('United Kingdom');
      expect(info?.code).toBe('GB');
      expect(info?.flag).toBe('🇬🇧');
    });

    it('should return null for unknown country ID', () => {
      const info = getCountryInfo(99999);
      expect(info).toBeNull();
    });

    it('should return null for null input', () => {
      const info = getCountryInfo(null);
      expect(info).toBeNull();
    });

    it('should return null for undefined input', () => {
      const info = getCountryInfo(undefined);
      expect(info).toBeNull();
    });

    it('should return null for zero', () => {
      const info = getCountryInfo(0);
      expect(info).toBeNull();
    });
  });

  describe('getCountryFlag', () => {
    it('should return flag emoji for valid country ID', () => {
      expect(getCountryFlag(218)).toBe('🇬🇧');
      expect(getCountryFlag(219)).toBe('🇺🇸');
      expect(getCountryFlag(79)).toBe('🇩🇪');
    });

    it('should return world emoji for unknown country', () => {
      expect(getCountryFlag(99999)).toBe('🌍');
    });

    it('should return world emoji for null', () => {
      expect(getCountryFlag(null)).toBe('🌍');
    });

    it('should return world emoji for undefined', () => {
      expect(getCountryFlag(undefined)).toBe('🌍');
    });
  });

  describe('getCountryName', () => {
    it('should return name for valid country ID', () => {
      expect(getCountryName(218)).toBe('United Kingdom');
      expect(getCountryName(219)).toBe('United States');
      expect(getCountryName(74)).toBe('France');
    });

    it('should return Unknown for invalid country ID', () => {
      expect(getCountryName(99999)).toBe('Unknown');
    });

    it('should return Unknown for null', () => {
      expect(getCountryName(null)).toBe('Unknown');
    });
  });

  describe('getCountryCode', () => {
    it('should return ISO code for valid country ID', () => {
      expect(getCountryCode(218)).toBe('GB');
      expect(getCountryCode(219)).toBe('US');
      expect(getCountryCode(102)).toBe('IT');
    });

    it('should return XX for invalid country ID', () => {
      expect(getCountryCode(99999)).toBe('XX');
    });

    it('should return XX for null', () => {
      expect(getCountryCode(null)).toBe('XX');
    });
  });

  describe('getAllCountries', () => {
    it('should return an array of countries', () => {
      const countries = getAllCountries();
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
    });

    it('should return countries sorted by name', () => {
      const countries = getAllCountries();
      const names = countries.map(c => c.info.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });

    it('should include id and info for each country', () => {
      const countries = getAllCountries();
      countries.forEach(country => {
        expect(typeof country.id).toBe('number');
        expect(country.info).toBeDefined();
        expect(country.info.name).toBeDefined();
        expect(country.info.code).toBeDefined();
        expect(country.info.flag).toBeDefined();
      });
    });

    it('should have Andorra as first country alphabetically', () => {
      const countries = getAllCountries();
      expect(countries[0].info.name).toBe('Andorra');
    });
  });
});
