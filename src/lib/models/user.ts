export type PeriodType = "CurrMonth" | "CurrQuarter" | "CurrYear" | "LastYear" | "LastTwoYears" | 
                "OneMonthAgo" | "TwoMonthsAgo" | "ThreeMonthsAgo" | "SixMonthsAgo" | "OneYearAgo";

export interface PopularInvestor {
  customerId: number;
  userName: string;
  fullName: string;
  hasAvatar: boolean;
  popularInvestor: boolean;
  gain: number;
  dailyGain: number;
  riskScore: number;
  copiers: number;
  trades: number;
  winRatio: number;
  country?: string;
  avatarUrl?: string;
}

export interface PopularInvestorsResponse {
  status: string;
  totalRows: number;
  items: PopularInvestor[];
}

export interface UserAvatar {
  url: string;
  width: string;
  height: string;
  avatarType: number;
}

export interface UserDetail {
  gcid: number;
  realCID: number;
  demoCID: number;
  username: string;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  language: number;
  languageIsoCode: string;
  country: number;
  allowDisplayFullName: boolean;
  aboutMe: string | null;
  aboutMeShort: string | null;
  userBio: {
    gcid: number;
    aboutMe: string | null;
    aboutMeShort: string | null;
    languageCode: string | null;
    strategyID: string | null;
  };
  whiteLabel: number;
  optOut: boolean;
  homepage: string | null;
  playerStatus: string | null;
  piLevel: number;
  isPi: boolean;
  avatars: UserAvatar[];
  masterAccountCid: number | null;
  accountType: number;
  fundType: string | null;
  isVerified: boolean;
  verificationLevel: number;
  accountStatus: number;
  gdprInfo: unknown | null;
  userFlowSignature: string;
}

export interface UserInfoResponse {
  users: UserDetail[];
}