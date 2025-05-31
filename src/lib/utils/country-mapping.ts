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
  
  // Discovered from API data analysis (May 31, 2025)
  5: { name: "Andorra", code: "AD", flag: "🇦🇩" },
  9: { name: "Argentina", code: "AR", flag: "🇦🇷" },
  12: { name: "Austria", code: "AT", flag: "🇦🇹" },
  14: { name: "Australia", code: "AU", flag: "🇦🇺" },
  15: { name: "Bahrain", code: "BH", flag: "🇧🇭" },
  19: { name: "Belgium", code: "BE", flag: "🇧🇪" },
  24: { name: "Bolivia", code: "BO", flag: "🇧🇴" },
  28: { name: "Brazil", code: "BR", flag: "🇧🇷" },
  32: { name: "Bulgaria", code: "BG", flag: "🇧🇬" },
  37: { name: "Cameroon", code: "CM", flag: "🇨🇲" },
  43: { name: "Chile", code: "CL", flag: "🇨🇱" },
  47: { name: "Colombia", code: "CO", flag: "🇨🇴" },
  51: { name: "Costa Rica", code: "CR", flag: "🇨🇷" },
  52: { name: "Croatia", code: "HR", flag: "🇭🇷" },
  54: { name: "Cyprus", code: "CY", flag: "🇨🇾" },
  55: { name: "Czech Republic", code: "CZ", flag: "🇨🇿" },
  57: { name: "Denmark", code: "DK", flag: "🇩🇰" },
  60: { name: "Dominican Republic", code: "DO", flag: "🇩🇴" },
  62: { name: "Ecuador", code: "EC", flag: "🇪🇨" },
  67: { name: "Estonia", code: "EE", flag: "🇪🇪" },
  72: { name: "France", code: "FR", flag: "🇫🇷" },
  74: { name: "Finland", code: "FI", flag: "🇫🇮" },
  78: { name: "Georgia", code: "GE", flag: "🇬🇪" },
  93: { name: "Hong Kong", code: "HK", flag: "🇭🇰" },
  94: { name: "Hong Kong", code: "HK", flag: "🇭🇰" },
  95: { name: "Iceland", code: "IS", flag: "🇮🇸" },
  96: { name: "India", code: "IN", flag: "🇮🇳" },
  97: { name: "Hungary", code: "HU", flag: "🇭🇺" },
  100: { name: "Indonesia", code: "ID", flag: "🇮🇩" },
  101: { name: "Iran", code: "IR", flag: "🇮🇷" },
  102: { name: "Italy", code: "IT", flag: "🇮🇹" },
  109: { name: "Jamaica", code: "JM", flag: "🇯🇲" },
  112: { name: "Jordan", code: "JO", flag: "🇯🇴" },
  118: { name: "Kuwait", code: "KW", flag: "🇰🇼" },
  119: { name: "Latvia", code: "LV", flag: "🇱🇻" },
  123: { name: "Malaysia", code: "MY", flag: "🇲🇾" },
  126: { name: "Malta", code: "MT", flag: "🇲🇹" },
  130: { name: "Mauritius", code: "MU", flag: "🇲🇺" },
  132: { name: "Mexico", code: "MX", flag: "🇲🇽" },
  138: { name: "Morocco", code: "MA", flag: "🇲🇦" },
  143: { name: "Netherlands", code: "NL", flag: "🇳🇱" },
  146: { name: "New Zealand", code: "NZ", flag: "🇳🇿" },
  154: { name: "Norway", code: "NO", flag: "🇳🇴" },
  155: { name: "Oman", code: "OM", flag: "🇴🇲" },
  161: { name: "Peru", code: "PE", flag: "🇵🇪" },
  164: { name: "Poland", code: "PL", flag: "🇵🇱" },
  165: { name: "Portugal", code: "PT", flag: "🇵🇹" },
  167: { name: "Qatar", code: "QA", flag: "🇶🇦" },
  168: { name: "Romania", code: "RO", flag: "🇷🇴" },
  179: { name: "Saudi Arabia", code: "SA", flag: "🇸🇦" },
  183: { name: "Serbia", code: "RS", flag: "🇷🇸" },
  184: { name: "Singapore", code: "SG", flag: "🇸🇬" },
  185: { name: "Slovakia", code: "SK", flag: "🇸🇰" },
  188: { name: "South Africa", code: "ZA", flag: "🇿🇦" },
  190: { name: "Sri Lanka", code: "LK", flag: "🇱🇰" },
  191: { name: "Spain", code: "ES", flag: "🇪🇸" },
  196: { name: "Sweden", code: "SE", flag: "🇸🇪" },
  197: { name: "Switzerland", code: "CH", flag: "🇨🇭" },
  199: { name: "Taiwan", code: "TW", flag: "🇹🇼" },
  202: { name: "Thailand", code: "TH", flag: "🇹🇭" },
  217: { name: "United Arab Emirates", code: "AE", flag: "🇦🇪" },
  219: { name: "Uruguay", code: "UY", flag: "🇺🇾" },
  221: { name: "Venezuela", code: "VE", flag: "🇻🇪" },
  226: { name: "Vietnam", code: "VN", flag: "🇻🇳" },
  236: { name: "Réunion", code: "RE", flag: "🇷🇪" },
  
  // Other eToro countries
  38: { name: "Canada", code: "CA", flag: "🇨🇦" },
  65: { name: "Egypt", code: "EG", flag: "🇪🇬" },
  104: { name: "Israel", code: "IL", flag: "🇮🇱" },
  106: { name: "Ireland", code: "IE", flag: "🇮🇪" },
  152: { name: "Nigeria", code: "NG", flag: "🇳🇬" },
  163: { name: "Philippines", code: "PH", flag: "🇵🇭" },
  182: { name: "Russia", code: "RU", flag: "🇷🇺" },
  192: { name: "South Korea", code: "KR", flag: "🇰🇷" },
  212: { name: "Turkey", code: "TR", flag: "🇹🇷" },
  225: { name: "United States", code: "US", flag: "🇺🇸" }
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