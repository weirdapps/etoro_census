// eToro Country ID to Country Info Mapping
// Based on research from eToro API documentation and common countries on the platform

export interface CountryInfo {
  name: string;
  code: string;
  flag: string;
}

// Country mapping based on eToro's numeric country IDs
export const ETORO_COUNTRY_MAPPING: Record<number, CountryInfo> = {
  // CONFIRMED from actual API data and profile verification
  82: { name: "Greece", code: "GR", flag: "🇬🇷" }, // Confirmed: plessas profile
  218: { name: "United Kingdom", code: "GB", flag: "🇬🇧" }, // Confirmed: multiple UK profiles
  
  // NEEDS CONFIRMATION - Listed in API docs but not verified
  // 13: { name: "Austria", code: "AT", flag: "🇦🇹" }, // Needs verification
  // 79: { name: "Germany", code: "DE", flag: "🇩🇪" }, // Needs verification
  
  // UNCONFIRMED - Need verification
  // Add new mappings here ONLY after confirming via:
  // 1. Checking the actual eToro profile page (when not logged in)
  // 2. Cross-referencing with API response
  // 3. Multiple users from same country showing same ID
};

// IDs discovered but not yet verified:
// 12: FundManagerZech (Austria?)
// 57: CPHequities (Denmark? CPH=Copenhagen)
// 74: Napoleon-X (France?)
// 100: defense_investor (?)
// 165: misterg23 (Portugal?)
// 217: JeppeKirkBonde (UAE?)
// ... and many more

// To verify a country:
// 1. Visit https://www.etoro.com/people/USERNAME in incognito mode
// 2. Look for country in About section or breadcrumbs
// 3. Confirm with multiple users from same country
// 4. Add to CONFIRMED section above

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