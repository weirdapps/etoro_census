// eToro Country ID to Country Info Mapping
// Based on research from eToro API documentation and common countries on the platform

export interface CountryInfo {
  name: string;
  code: string;
  flag: string;
}

// Country mapping based on eToro's numeric country IDs
export const ETORO_COUNTRY_MAPPING: Record<number, CountryInfo> = {
  // Confirmed from actual API data and profile checks
  82: { name: "Greece", code: "GR", flag: "🇬🇷" },
  218: { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  
  // Confirmed from API documentation
  13: { name: "Austria", code: "AT", flag: "🇦🇹" },
  79: { name: "Germany", code: "DE", flag: "🇩🇪" },
  
  // Common eToro countries (based on platform popularity and research)
  226: { name: "United States", code: "US", flag: "🇺🇸" },
  225: { name: "United Kingdom", code: "GB", flag: "🇬🇧" },
  75: { name: "France", code: "FR", flag: "🇫🇷" },
  105: { name: "Italy", code: "IT", flag: "🇮🇹" },
  195: { name: "Spain", code: "ES", flag: "🇪🇸" },
  164: { name: "Poland", code: "PL", flag: "🇵🇱" },
  151: { name: "Netherlands", code: "NL", flag: "🇳🇱" },
  18: { name: "Belgium", code: "BE", flag: "🇧🇪" },
  203: { name: "Switzerland", code: "CH", flag: "🇨🇭" },
  196: { name: "Sweden", code: "SE", flag: "🇸🇪" },
  57: { name: "Denmark", code: "DK", flag: "🇩🇰" },
  155: { name: "Norway", code: "NO", flag: "🇳🇴" },
  74: { name: "Finland", code: "FI", flag: "🇫🇮" },
  106: { name: "Ireland", code: "IE", flag: "🇮🇪" },
  169: { name: "Portugal", code: "PT", flag: "🇵🇹" },
  82: { name: "Greece", code: "GR", flag: "🇬🇷" },
  55: { name: "Czech Republic", code: "CZ", flag: "🇨🇿" },
  97: { name: "Hungary", code: "HU", flag: "🇭🇺" },
  175: { name: "Romania", code: "RO", flag: "🇷🇴" },
  189: { name: "Slovakia", code: "SK", flag: "🇸🇰" },
  
  // Middle East & Asia
  104: { name: "Israel", code: "IL", flag: "🇮🇱" },
  224: { name: "United Arab Emirates", code: "AE", flag: "🇦🇪" },
  98: { name: "India", code: "IN", flag: "🇮🇳" },
  188: { name: "Singapore", code: "SG", flag: "🇸🇬" },
  125: { name: "Malaysia", code: "MY", flag: "🇲🇾" },
  207: { name: "Thailand", code: "TH", flag: "🇹🇭" },
  99: { name: "Indonesia", code: "ID", flag: "🇮🇩" },
  163: { name: "Philippines", code: "PH", flag: "🇵🇭" },
  232: { name: "Vietnam", code: "VN", flag: "🇻🇳" },
  
  // Oceania
  14: { name: "Australia", code: "AU", flag: "🇦🇺" },
  153: { name: "New Zealand", code: "NZ", flag: "🇳🇿" },
  
  // Americas
  38: { name: "Canada", code: "CA", flag: "🇨🇦" },
  30: { name: "Brazil", code: "BR", flag: "🇧🇷" },
  138: { name: "Mexico", code: "MX", flag: "🇲🇽" },
  10: { name: "Argentina", code: "AR", flag: "🇦🇷" },
  44: { name: "Chile", code: "CL", flag: "🇨🇱" },
  48: { name: "Colombia", code: "CO", flag: "🇨🇴" },
  
  // Africa
  194: { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  65: { name: "Egypt", code: "EG", flag: "🇪🇬" },
  152: { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  
  // Others
  182: { name: "Russia", code: "RU", flag: "🇷🇺" },
  212: { name: "Turkey", code: "TR", flag: "🇹🇷" },
  109: { name: "Japan", code: "JP", flag: "🇯🇵" },
  192: { name: "South Korea", code: "KR", flag: "🇰🇷" },
  46: { name: "China", code: "CN", flag: "🇨🇳" },
  94: { name: "Hong Kong", code: "HK", flag: "🇭🇰" },
  205: { name: "Taiwan", code: "TW", flag: "🇹🇼" }
};

// Helper function to get country info
export function getCountryInfo(countryId: number | null | undefined): CountryInfo | null {
  if (!countryId) return null;
  return ETORO_COUNTRY_MAPPING[countryId] || null;
}

// Helper function to get country flag
export function getCountryFlag(countryId: number | null | undefined): string {
  const country = getCountryInfo(countryId);
  return country?.flag || "🌍";
}

// Helper function to get country name
export function getCountryName(countryId: number | null | undefined): string {
  const country = getCountryInfo(countryId);
  return country?.name || "Unknown";
}

// Helper function to get country code
export function getCountryCode(countryId: number | null | undefined): string {
  const country = getCountryInfo(countryId);
  return country?.code || "XX";
}

// Get all supported countries for dropdown/filter
export function getAllCountries(): Array<{ id: number; info: CountryInfo }> {
  return Object.entries(ETORO_COUNTRY_MAPPING)
    .map(([id, info]) => ({ id: parseInt(id), info }))
    .sort((a, b) => a.info.name.localeCompare(b.info.name));
}