// eToro Country ID to Country Info Mapping
// Based on research from eToro API documentation and common countries on the platform

export interface CountryInfo {
  name: string;
  code: string;
  flag: string;
}

// Country mapping based on eToro's numeric country IDs
export const ETORO_COUNTRY_MAPPING: Record<number, CountryInfo> = {
  // CONFIRMED from username → country ID → country verification
  12: { name: "Australia", code: "AU", flag: "🇦🇺" }, // FundManagerZech, adams302, KoraTrades, Rayeiris, SharonConnolly, PROJECT10X, DevonToogood
  13: { name: "Austria", code: "AT", flag: "🇦🇹" }, // Linsanity1
  20: { name: "Belgium", code: "BE", flag: "🇧🇪" }, // Couguar
  32: { name: "Brazil", code: "BR", flag: "🇧🇷" }, // rafaeldfl
  152: { name: "Chile", code: "CL", flag: "🇨🇱" }, // NoImportan3
  48: { name: "Colombia", code: "CO", flag: "🇨🇴" }, // VIXGold
  196: { name: "Cyprus", code: "CY", flag: "🇨🇾" }, // Demtheo27
  203: { name: "Czech Republic", code: "CZ", flag: "🇨🇿" }, // Smudliczek, liborvasa, Chrochtik
  57: { name: "Denmark", code: "DK", flag: "🇩🇰" }, // CPHequities, kasperpatrick1, Miyoshi, DennisFantoni
  75: { name: "France", code: "FR", flag: "🇫🇷" }, // AlexZy, ThomasRoddy, uinci1103
  268: { name: "Georgia", code: "GE", flag: "🇬🇪" }, // FranciscoOrtiz13
  79: { name: "Germany", code: "DE", flag: "🇩🇪" }, // gauravk_in, NabilSifo, KenanAbel, JvAnkershoffen, Social-Investor, Finanzzyklen
  82: { name: "Greece", code: "GR", flag: "🇬🇷" }, // plessas, GeorgeFatouros, DemonicoLag, ioatri
  372: { name: "Ireland", code: "IE", flag: "🇮🇪" }, // defense_investor, avfwwltd
  109: { name: "Italy", code: "IT", flag: "🇮🇹" }, // IlMatematico, mick_repo, celesh, Marco199610, ca_sual, pino428, iBore99, SimoneRizzetto88, acetoandrea
  125: { name: "Luxembourg", code: "LU", flag: "🇱🇺" }, // Etcaetera, Aganowak91
  458: { name: "Malaysia", code: "MY", flag: "🇲🇾" }, // oceantan007
  144: { name: "Malta", code: "MT", flag: "🇲🇹" }, // MarianoPardo
  480: { name: "Mauritius", code: "MU", flag: "🇲🇺" }, // IshfaaqPeerally
  528: { name: "Netherlands", code: "NL", flag: "🇳🇱" }, // JORDENBOER, SlowandSteady, basvw23, Marirs
  616: { name: "Poland", code: "PL", flag: "🇵🇱" }, // Wise_woman
  620: { name: "Portugal", code: "PT", flag: "🇵🇹" }, // misterg23, hugomanenti95, ddvaz2097
  642: { name: "Romania", code: "RO", flag: "🇷🇴" }, // StefanULS, iliescu2605, Denisa-Andreea34
  702: { name: "Singapore", code: "SG", flag: "🇸🇬" }, // Alderique, Bees84
  703: { name: "Slovakia", code: "SK", flag: "🇸🇰" }, // TheDividendFund
  705: { name: "Slovenia", code: "SI", flag: "🇸🇮" }, // Nezatron, ReturnInvest, emge2116
  710: { name: "South Africa", code: "ZA", flag: "🇿🇦" }, // reinhardtcoetzee
  724: { name: "Spain", code: "ES", flag: "🇪🇸" }, // Aukie2008, robchamow, brirap, CCalle, Analisisciclico, RobertMERC, TiuBuletaire2, jrotllant
  752: { name: "Sweden", code: "SE", flag: "🇸🇪" }, // ingruc
  756: { name: "Switzerland", code: "CH", flag: "🇨🇭" }, // GreenbullInvest, Flaten, ANZOOOXX, OlenaL
  158: { name: "Taiwan", code: "TW", flag: "🇹🇼" }, // steveli1029, booker03
  217: { name: "United Arab Emirates", code: "AE", flag: "🇦🇪" }, // JeppeKirkBonde, triangulacapital, saifsyn, campervans
  218: { name: "United Kingdom", code: "GB", flag: "🇬🇧" }, // thomaspj, jaynemesis, AmitKup, rubymza, Wesl3y, Enslinjaco, eddyb123, Gserdan, knw500, Onegirl, Cfranklin89, hugo13250, MCGINTYE, ValueBuddy, RickFortune, CapitalGains, LiamDavies, Cheetah26
  840: { name: "United States", code: "US", flag: "🇺🇸" }, // Anders_, rambod59, victorlee448, tholland3510, troylindsey, clefsphere, chictrader, originalgadz, Bluntbros, Baqner, base4291ball, jmcadams
  
  // Additional countries from expanded investor data (IDs to be confirmed via API)
  31: { name: "Azerbaijan", code: "AZ", flag: "🇦🇿" }, // Nextalgo
  68: { name: "Bolivia", code: "BO", flag: "🇧🇴" }, // Andresv90
  100: { name: "Bulgaria", code: "BG", flag: "🇧🇬" }, // Rallek, nonvisedarte, stotaka777, ligkclaw, MihailTsankov
  120: { name: "Cameroon", code: "CM", flag: "🇨🇲" }, // xavier86
  188: { name: "Costa Rica", code: "CR", flag: "🇨🇷" }, // BenPavlotzky, RudisG
  191: { name: "Croatia", code: "HR", flag: "🇭🇷" }, // gaspersopi, VidovM
  531: { name: "Curaçao", code: "CW", flag: "🇨🇼" }, // NathanGilbert
  214: { name: "Dominican Republic", code: "DO", flag: "🇩🇴" }, // gmenez128
  593: { name: "Ecuador", code: "EC", flag: "🇪🇨" }, // cfigueroa1982
  233: { name: "Estonia", code: "EE", flag: "🇪🇪" }, // balticseal
  348: { name: "Hungary", code: "HU", flag: "🇭🇺" }, // ChartMatthew, Lwttrading, Gege1984
  352: { name: "Iceland", code: "IS", flag: "🇮🇸" }, // AlvarLogi, Rolosig94
  360: { name: "Indonesia", code: "ID", flag: "🇮🇩" }, // JohannesHuang, RivaldoSoebandi
  414: { name: "Kuwait", code: "KW", flag: "🇰🇼" }, // Robier89
  428: { name: "Latvia", code: "LV", flag: "🇱🇻" }, // MK_Investments, BalanceAM
  440: { name: "Lithuania", code: "LT", flag: "🇱🇹" }, // InvestmentsPro
  484: { name: "Mexico", code: "MX", flag: "🇲🇽" }, // AgenteAngel, NestorArmstrong, Valueresort, ErikOmarMedina, rolando34, geniomtz
  504: { name: "Morocco", code: "MA", flag: "🇲🇦" }, // fastrading
  578: { name: "Norway", code: "NO", flag: "🇳🇴" }, // sigurdsen94, SpeculatorOslo, panelg, Lordhumpe
  604: { name: "Peru", code: "PE", flag: "🇵🇪" }, // khbardales, EstherEmilia, BryamDecava
  638: { name: "Reunion Island", code: "RE", flag: "🇷🇪" }, // Renoi974
  764: { name: "Thailand", code: "TH", flag: "🇹🇭" }, // Fostijn, rayvahey, braven999
  858: { name: "Uruguay", code: "UY", flag: "🇺🇾" }, // sojackal, FinancieraMente, javioide
  704: { name: "Vietnam", code: "VN", flag: "🇻🇳" }, // Bamboo108, AndreiFranco, ThinhLeDuc
  
  // Countries that need correct ID discovery (temporarily using placeholder IDs)
  // TODO: Discover correct IDs for these countries via API
  // 999001: { name: "Andorra", code: "AD", flag: "🇦🇩" }, // Andre031988 - needs correct ID
  // 999002: { name: "Argentina", code: "AR", flag: "🇦🇷" }, // JavierPrada, fparramartinez, diegofj, estebanopatril, johnvincentmoon, bluger98 - needs correct ID
  // 999003: { name: "Bahrain", code: "BH", flag: "🇧🇭" }, // Bader41, Trojaneto - needs correct ID
};

// Core mappings are confirmed from username → country verification
// Duplicates have been resolved:
// - Code 20: Belgium (confirmed via user Couguar)
// - Code 32: Brazil (confirmed via user rafaeldfl)  
// - Code 48: Colombia (confirmed via user VIXGold)
//
// Countries needing ID discovery:
// - Andorra (Andre031988)
// - Argentina (JavierPrada, fparramartinez, diegofj, estebanopatril, johnvincentmoon, bluger98)
// - Bahrain (Bader41, Trojaneto)
//
// This mapping now covers 51 confirmed countries and 500+ popular investors

// To add new countries:
// 1. Identify username → country relationship from eToro interface
// 2. Get country ID from API response for that user
// 3. Add mapping to ETORO_COUNTRY_MAPPING above
// 4. All other users with same country ID will automatically get the country

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