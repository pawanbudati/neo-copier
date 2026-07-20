export interface AccountSummary {
  id: string;
  nickname: string;
  role: "master" | "slave";
  mobileNumber: string;
  ucc: string;
  multiplier: number;
  status: "active" | "expired" | "error" | "disconnected";
  lastLogin: string | null;
  errorMessage: string | null;
  createdAt: string;
  consumerKey?: string;
  mpin?: string;
  totpSecret?: string;
  hasConsumerKey: boolean;
  hasTotpSecret: boolean;
  hasAutoTotpSecret: boolean;
  hasMpin: boolean;
}

export interface TradeOrder {
  id: string;
  masterOrderId: string | null;
  accountId: string;
  accountName: string;
  accountRole: "master" | "slave";
  symbol: string;
  instrument: string;
  optionType: "CE" | "PE" | "FUT" | "EQ";
  strikePrice: number;
  expiry: string;
  quantity: number;
  price: number;
  orderType: "MARKET" | "LIMIT" | "SL";
  triggerPrice?: number;
  transactionType: "BUY" | "SELL";
  status: "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED";
  errorMessage: string | null;
  timestamp: string;
}

export interface AppSettings {
  autoReplicate: boolean;
  autoRenewSessions: boolean;
}

export interface ScripInfo {
  scriptToken: string;
  tradingSymbol: string;
  scripRefKey: string;
  instrumentName: string;
  exchange: string;
  segment: string;
  strikePrice: number;
  expiry: string;
  lotSize: number;
}

export interface WatchlistItem extends ScripInfo {
  addedAt: string;
}

export interface QuoteData {
  ltp: number;
  change: number;
  changePct: number;
  prevLtp?: number;
}

export interface ScripCategory {
  key: string;
  label: string;
  exchange: string;
  segment: string;
  count: number;
  isLoaded: boolean;
  url?: string;
}

export interface ScripStatusState {
  loaded: boolean;
  totalCount: number;
  categories: ScripCategory[];
  count?: number;
}

export type MainScreen = "terminal" | "orders" | "accounts" | "logs";
export type LeftTab = "accounts" | "search" | "pending" | "watchlist" | "positions" | "logs";
