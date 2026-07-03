import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  RefreshCw,
  Clock,
  ShieldCheck,
  Zap,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings,
  Database,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Activity,
  UserCheck,
  UserMinus,
  HelpCircle,
  Search,
  Star,
  StarOff,
  X,
  TrendingDown,
  BookOpen,
  Wifi,
  WifiOff,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Ban,
  Terminal,
  Download,
  Sun,
  Moon,
  Power,
} from "lucide-react";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface AccountSummary {
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
  hasConsumerKey: boolean;
  hasTotpSecret: boolean;
  hasAutoTotpSecret: boolean;
  hasMpin: boolean;
}

interface TradeOrder {
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

interface AppSettings {
  autoReplicate: boolean;
  autoRenewSessions: boolean;
}

interface ScripInfo {
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

interface WatchlistItem extends ScripInfo {
  addedAt: string;
}

interface QuoteData {
  ltp: number;
  change: number;
  changePct: number;
  prevLtp?: number;
}

type LeftTab = "accounts" | "search" | "watchlist" | "positions" | "logs";

// ─── Helper: format price ────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Live Quote Cell component ───────────────────────────────────────────────
function QuoteCell({ quote, compact = false }: { quote?: QuoteData; compact?: boolean }) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!quote) return;
    if (prev.current !== undefined && prev.current !== quote.ltp) {
      setFlash(quote.ltp > prev.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 400);
      prev.current = quote.ltp;
      return () => clearTimeout(t);
    }
    prev.current = quote.ltp;
  }, [quote?.ltp]);

  if (!quote) {
    return (
      <span className="text-slate-600 text-xs font-mono animate-pulse">
        {compact ? "—" : "Fetching..."}
      </span>
    );
  }

  const isPos = quote.changePct >= 0;
  const flashCls =
    flash === "up"
      ? "bg-emerald-500/20"
      : flash === "down"
        ? "bg-rose-500/20"
        : "";

  if (compact) {
    return (
      <span
        className={`font-mono text-xs font-bold transition-all duration-300 rounded px-1 ${flashCls} ${isPos ? "text-emerald-400" : "text-rose-400"
          }`}
      >
        ₹{fmt(quote.ltp)}
      </span>
    );
  }

  return (
    <div
      className={`flex flex-col items-end transition-all duration-300 rounded px-1 ${flashCls}`}
    >
      <span
        className={`font-mono text-sm font-bold ${isPos ? "text-emerald-400" : "text-rose-400"
          }`}
      >
        ₹{fmt(quote.ltp)}
      </span>
      <span
        className={`text-[10px] font-semibold flex items-center gap-0.5 ${isPos ? "text-emerald-500" : "text-rose-500"
          }`}
      >
        {isPos ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        {isPos ? "+" : ""}{quote.change.toFixed(2)} ({isPos ? "+" : ""}{quote.changePct.toFixed(2)}%)
      </span>
    </div>
  );
}

// ─── Scrip Row (used in both Search + Watchlist) ─────────────────────────────
function ScripRow({
  scrip,
  quote,
  isFaved,
  onFav,
  onBuySell,
}: {
  scrip: ScripInfo;
  quote?: QuoteData;
  isFaved: boolean;
  onFav: (scrip: ScripInfo) => void | Promise<void>;
  onBuySell: (scrip: ScripInfo, side: "BUY" | "SELL") => void;
  [key: string]: any;
}) {
  const segmentColor: Record<string, string> = {
    CE: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    PE: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    FUT: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    EQ: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  };
  const segCls = segmentColor[scrip.segment] || "text-slate-400 bg-slate-800";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 lg:px-4 lg:py-2.5 hover:bg-slate-800/60 rounded-xl lg:rounded-lg border border-slate-800/40 lg:border-transparent group transition-all bg-slate-900/20 lg:bg-transparent">
      {/* Top half / Left side: Instrument Name + Tags & Live Quote */}
      <div className="flex items-center justify-between lg:justify-start lg:flex-1 min-w-0 gap-3">
        {/* Info */}
        <div className="min-w-0 flex-1 lg:flex-initial">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono truncate">
              {scrip.scripRefKey || scrip.tradingSymbol}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${segCls}`}>
              {scrip.segment}
            </span>
            <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded shrink-0">
              {scrip.exchange}
            </span>
          </div>

          {/* Subtitle details */}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 flex-wrap">
            {scrip.strikePrice > 0 && (
              <span className="bg-slate-800/40 px-1.5 py-0.5 rounded">
                Strike: <span className="font-semibold text-slate-300">₹{scrip.strikePrice.toLocaleString("en-IN")}</span>
              </span>
            )}
            {scrip.expiry && (
              <span className="bg-slate-800/40 px-1.5 py-0.5 rounded">
                Exp: <span className="font-semibold text-slate-300">{scrip.expiry}</span>
              </span>
            )}
            <span className="bg-slate-800/40 px-1.5 py-0.5 rounded">
              Lot: <span className="font-semibold text-slate-300">{scrip.lotSize}</span>
            </span>
          </div>
        </div>

        {/* Live quote on mobile (visible only on mobile right side) */}
        <div className="lg:hidden shrink-0">
          <QuoteCell quote={quote} />
        </div>
      </div>

      {/* Live quote on desktop (visible only on desktop) */}
      <div className="hidden lg:block shrink-0">
        <QuoteCell quote={quote} />
      </div>

      {/* Actions: on mobile, it wraps to its own row, aligned nicely; on desktop, it displays on the right on hover */}
      <div className="flex items-center justify-between lg:justify-end gap-2 border-t border-slate-800/40 pt-2 lg:pt-0 lg:border-t-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
        {/* Watchlist star (left on mobile, right on desktop) */}
        <button
          onClick={() => onFav(scrip)}
          title={isFaved ? "Remove from watchlist" : "Add to watchlist"}
          className="p-2 lg:p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-700 text-slate-400 hover:text-amber-400 cursor-pointer transition-all flex items-center justify-center border border-slate-800 lg:border-transparent lg:bg-transparent"
        >
          {isFaved ? (
            <Star className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-amber-400 fill-amber-400" />
          ) : (
            <Star className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
          )}
        </button>

        {/* Buy/Sell buttons container */}
        <div className="flex items-center gap-1.5 flex-1 lg:flex-initial justify-end">
          <button
            onClick={() => onBuySell(scrip, "BUY")}
            className="flex-1 lg:flex-none px-3.5 py-1.5 lg:px-2.5 lg:py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs lg:text-[10px] font-bold rounded-lg lg:rounded cursor-pointer transition-all text-center"
          >
            BUY
          </button>
          <button
            onClick={() => onBuySell(scrip, "SELL")}
            className="flex-1 lg:flex-none px-3.5 py-1.5 lg:px-2.5 lg:py-1 bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs lg:text-[10px] font-bold rounded-lg lg:rounded cursor-pointer transition-all text-center"
          >
            SELL
          </button>
        </div>
      </div>
    </div>
  );
}

// function formatStringDate(epochTime) {
// if (!epochTime) return "N/A";

//   // JavaScript Date expects milliseconds, so multiply the 10-digit Unix timestamp by 1000
//   const dateObj = new Date(epochTime * 1000);

//   if (isNaN(dateObj.getTime())) return "Invalid Date";

//   return dateObj.toLocaleDateString('en-IN', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric'
//   });
// }

// ─── Quick Order Dialog ───────────────────────────────────────────────────────
function QuickOrderDialog({
  scrip,
  side,
  quote,
  onClose,
  onConfirm,
  submitting,
  slaveAccs,
}: {
  scrip: ScripInfo;
  side: "BUY" | "SELL";
  quote?: QuoteData;
  onClose: () => void;
  onConfirm: (qty: number, price: number, orderType: "MARKET" | "LIMIT" | "SL", triggerPrice: number) => void;
  submitting: boolean;
  slaveAccs: AccountSummary[];
}) {
  const [qty, setQty] = useState(String(scrip.lotSize));
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "SL">("MARKET");
  const [limitPrice, setLimitPrice] = useState(
    quote ? String(quote.ltp) : "0"
  );
  const [triggerPrice, setTriggerPrice] = useState(
    quote ? String(quote.ltp) : "0"
  );

  const isBuy = side === "BUY";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md my-auto overflow-hidden animate-fade-in">
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between ${isBuy
            ? "bg-emerald-500/10 border-b border-emerald-500/20"
            : "bg-rose-500/10 border-b border-rose-500/20"
            }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${isBuy ? "bg-emerald-500/20" : "bg-rose-500/20"
                }`}
            >
              <ShoppingCart
                className={`w-4 h-4 ${isBuy ? "text-emerald-400" : "text-rose-400"
                  }`}
              />
            </div>
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wider ${isBuy ? "text-emerald-400" : "text-rose-400"
                  }`}
              >
                {side} Order
              </p>
              <p className="text-sm font-bold text-slate-100 font-mono">
                {scrip.tradingSymbol}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Scrip info pills */}
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">
              Exchange: {scrip.exchange}
            </span>
            <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">
              Segment: {scrip.segment}
            </span>
            {scrip.strikePrice > 0 && (
              <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">
                Strike: ₹{scrip.strikePrice.toLocaleString("en-IN")}
              </span>
            )}
            <span className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700">
              Lot: {scrip.lotSize}
            </span>
          </div>

          {/* LTP */}
          {quote && (
            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
              <span className="text-xs text-slate-400">Last Traded Price</span>
              <QuoteCell quote={quote} />
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1">
              Quantity (Master lots)
            </label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-xs text-slate-400 font-medium mb-1.5">
              Order Type
            </label>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(["MARKET", "LIMIT", "SL"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderType(t)}
                  className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${orderType === t
                    ? "bg-teal-500 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  {t === "SL" ? "SL-LIMIT" : t}
                </button>
              ))}
            </div>
          </div>

          {(orderType === "LIMIT" || orderType === "SL") && (
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">
                Limit Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          )}

          {orderType === "SL" && (
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">
                Trigger Price (₹)
              </label>
              <input
                type="number"
                step="0.05"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 font-mono text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          )}

          {/* Slave preview */}
          {slaveAccs.length > 0 && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                Slave Replications
              </span>
              {slaveAccs.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between text-xs text-slate-400"
                >
                  <span>{s.nickname} ({s.multiplier}x):</span>
                  <span className="font-mono text-slate-300">
                    {Math.max(1, Math.round(Number(qty) * s.multiplier))} qty
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            disabled={submitting}
            onClick={() =>
              onConfirm(
                Number(qty),
                (orderType === "LIMIT" || orderType === "SL") ? Number(limitPrice) : 0,
                orderType,
                orderType === "SL" ? Number(triggerPrice) : 0
              )
            }
            className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 ${isBuy
              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
              : "bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/20"
              }`}
          >
            <TrendingUp className="w-4 h-4" />
            {submitting
              ? "EXECUTING..."
              : `CONFIRM ${side} — ${scrip.scripRefKey || scrip.tradingSymbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Core state
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    autoReplicate: true,
    autoRenewSessions: true,
  });
  const [currentTime, setCurrentTime] = useState("");
  const [totpPreviews, setTotpPreviews] = useState<Record<string, string>>({});
  const [actionStatus, setActionStatus] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [theme, setTheme] = useState<"classic" | "modern">(
    () => (localStorage.getItem("neo-theme") as "classic" | "modern") || "classic"
  );
  const [expandedMasterOrders, setExpandedMasterOrders] = useState<
    Record<string, boolean>
  >({});

  // Account form
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState<"master" | "slave">("slave");
  const [mobileNumber, setMobileNumber] = useState("");
  const [ucc, setUcc] = useState("");
  const [mpin, setMpin] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [multiplier, setMultiplier] = useState(1.0);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Order pad
  const [instrument, setInstrument] = useState("NIFTY");
  const [customSymbol, setCustomSymbol] = useState("NIFTY26JUN2423500CE");
  const [optionType, setOptionType] = useState<"CE" | "PE" | "FUT" | "EQ">("CE");
  const [strikePrice, setStrikePrice] = useState("23500");
  const [expiry, setExpiry] = useState("2026-06-26");
  const [quantity, setQuantity] = useState("50");
  const [price, setPrice] = useState("0");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [transactionType, setTransactionType] = useState<"BUY" | "SELL">("BUY");
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [syncingOrders, setSyncingOrders] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  // ── NEW: Left panel tab ───────────────────────────────────────────────────
  const [leftTab, setLeftTab] = useState<LeftTab>("accounts");

  // ── System Logs state ──
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<"ALL" | "INFO" | "WARN" | "ERROR">("ALL");
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
  const [powerOn, setPowerOn] = useState(true);


  // ── Positions & Margins States ─────────────────────────────────────────────
  const [margins, setMargins] = useState<any[]>([]);
  const [loadingMargins, setLoadingMargins] = useState(false);
  const [positions, setPositions] = useState<any[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [exitingAll, setExitingAll] = useState(false);
  const [exitingPositionId, setExitingPositionId] = useState<string | null>(null);

  // ── NEW: Search ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScripInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scripStatus, setScripStatus] = useState({ loaded: false, count: 0 });
  const [isLoadingScrips, setIsLoadingScrips] = useState(false);

  // ── NEW: Watchlist ────────────────────────────────────────────────────────
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // ── NEW: Live quotes (SSE) ────────────────────────────────────────────────
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const sseTokensRef = useRef<string[]>([]);
  const [streamTokenCount, setStreamTokenCount] = useState(0);

  // ── NEW: Quick order dialog ───────────────────────────────────────────────
  const [orderDialog, setOrderDialog] = useState<{
    scrip: ScripInfo;
    side: "BUY" | "SELL";
  } | null>(null);

  // Auto-dismiss guide after 10 seconds
  useEffect(() => {
    if (showHelp) {
      const timer = setTimeout(() => {
        setShowHelp(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showHelp]);

  // ─────────────────────────────────────────────────────────────────────────
  // Clock
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setCurrentTime(now.toLocaleTimeString("en-US", options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Initial loads
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSettings();
    fetchPowerStatus();
    fetchAccounts();
    fetchOrders();
    fetchWatchlist();
    fetchScripStatus();
    const totpInterval = setInterval(fetchTotpPreviews, 15000);
    return () => clearInterval(totpInterval);
  }, []);

  useEffect(() => {
    if (accounts.length > 0) fetchTotpPreviews();
  }, [accounts]);

  // ─────────────────────────────────────────────────────────────────────────
  // SSE subscription management
  // ─────────────────────────────────────────────────────────────────────────
  const unsubscribeAll = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    sseTokensRef.current = [];
    setStreamTokenCount(0);
    setSseConnected(false);
  }, []);

  const subscribeToTokens = useCallback((tokens: string[]) => {
    if (!powerOn) {
      unsubscribeAll();
      return;
    }
    // Deduplicate and sort for stable comparison
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    if (!uniqueTokens.length) {
      unsubscribeAll();
      return;
    }

    const sorted = uniqueTokens.sort().join(",");
    const prevSorted = [...new Set(sseTokensRef.current)].sort().join(",");
    const currentReadyState = sseRef.current?.readyState;
    if (sorted === prevSorted && (currentReadyState === EventSource.OPEN || currentReadyState === EventSource.CONNECTING)) return;

    // Close existing
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
      setSseConnected(false);
    }

    sseTokensRef.current = uniqueTokens;
    setStreamTokenCount(uniqueTokens.length);
    const es = new EventSource(`/api/quotes/stream?tokens=${sorted}`);
    sseRef.current = es;

    es.onopen = () => setSseConnected(true);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as Record<
          string,
          { ltp: number; change: number; changePct: number }
        >;
        setQuotes((prev) => {
          const next = { ...prev };
          for (const [token, q] of Object.entries(data)) {
            next[token] = { ...q, prevLtp: prev[token]?.ltp };
          }
          return next;
        });
      } catch (_) { }
    };
    es.onerror = () => setSseConnected(false);
  }, [unsubscribeAll, powerOn]);

  // Subscribe to watchlist tokens, search result tokens, active positions, plus Nifty and Sensex indices
  useEffect(() => {
    const watchlistTokens = watchlist.map((w) => w.scriptToken);
    const searchTokens = leftTab === "search" ? searchResults.map((s) => s.scriptToken) : [];
    const positionTokens = leftTab === "positions"
      ? positions.flatMap((acc) => (acc.positions || []).map((p: any) => p.scriptToken))
      : [];
    const allTokens = [...new Set([...watchlistTokens, ...searchTokens, ...positionTokens, "Nifty 50", "SENSEX"])];
    subscribeToTokens(allTokens);
  }, [watchlist, searchResults, positions, leftTab, subscribeToTokens, powerOn]);

  // Fetch margins and positions when positions tab is loaded
  useEffect(() => {
    if (leftTab === "positions") {
      fetchMargins();
      fetchPositions();
    }
  }, [leftTab]);

  // Logs Auto-refresh polling
  useEffect(() => {
    if (leftTab !== "logs" || !autoRefreshLogs || !powerOn) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [leftTab, autoRefreshLogs]);



  // Fetch logs when logs tab is active
  useEffect(() => {
    if (leftTab === "logs") {
      fetchLogs();
    }
  }, [leftTab]);

  useEffect(() => unsubscribeAll, [unsubscribeAll]);

  useEffect(() => {
    localStorage.setItem("neo-theme", theme);
  }, [theme]);

  // ─────────────────────────────────────────────────────────────────────────
  // Search — debounced
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          // Merge search quotes into existing state instead of replacing
          setQuotes((prev) => ({ ...prev, ...(data.quotes || {}) }));
        }
      } catch (_) {
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────────
  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setActionStatus({ message, type });
    setTimeout(() => setActionStatus(null), 5000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // API calls — settings, accounts, orders, TOTP
  // ─────────────────────────────────────────────────────────────────────────
  const fetchSettings = async () => {
    try {
      const r = await fetch("/api/settings");
      if (r.ok) setSettings(await r.json());
    } catch (_) { }
  };


  const toggleAutoReplicate = async () => {
    try {
      const updated = { ...settings, autoReplicate: !settings.autoReplicate };
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (r.ok) {
        const d = await r.json();
        setSettings(d);
        showNotification(
          `Auto-replication ${d.autoReplicate ? "ENABLED" : "DISABLED"}`,
          "success"
        );
      }
    } catch (_) {
      showNotification("Failed to save replication settings", "error");
    }
  };

  const fetchPowerStatus = async () => {
    try {
      const r = await fetch("/api/system/power");
      if (r.ok) {
        const d = await r.json();
        setPowerOn(d.powerOn);
      }
    } catch (_) { }
  };

  const togglePower = async () => {
    try {
      const nextPower = !powerOn;
      const r = await fetch("/api/system/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ powerOn: nextPower }),
      });
      if (r.ok) {
        const d = await r.json();
        setPowerOn(d.powerOn);
        showNotification(
          `System operations ${d.powerOn ? "RESUMED" : "SUSPENDED"}`,
          d.powerOn ? "success" : "info"
        );
      }
    } catch (_) {
      showNotification("Failed to toggle system power", "error");
    }
  };

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const r = await fetch("/api/accounts");
      if (r.ok) setAccounts(await r.json());
    } catch (_) {
      showNotification("Error loading accounts", "error");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const r = await fetch("/api/orders");
      if (r.ok) setOrders(await r.json());
    } catch (_) { } finally {
      setLoadingOrders(false);
    }
  };

  const fetchTotpPreviews = async () => {
    if (!powerOn) return;
    const accsWithTotp = accounts.filter((a) => a.hasTotpSecret);
    const newPreviews: Record<string, string> = {};
    for (const acc of accsWithTotp) {
      try {
        const r = await fetch(`/api/accounts/${acc.id}/totp-preview`);
        if (r.ok) {
          const d = await r.json();
          newPreviews[acc.id] = d.code;
        }
      } catch (_) { }
    }
    setTotpPreviews((prev) => ({ ...prev, ...newPreviews }));
  };

  const fetchScripStatus = async () => {
    try {
      const r = await fetch("/api/scrips/status");
      if (r.ok) {
        setScripStatus(await r.json());
      }
    } catch (_) { }
  };

  const fetchMargins = async () => {
    setLoadingMargins(true);
    try {
      const r = await fetch("/api/accounts/margins");
      if (r.ok) {
        setMargins(await r.json());
      } else {
        showNotification("Failed to load margin balances", "error");
      }
    } catch (_) {
      showNotification("Error loading margins", "error");
    } finally {
      setLoadingMargins(false);
    }
  };

  const fetchPositions = async () => {
    setLoadingPositions(true);
    try {
      const r = await fetch("/api/accounts/positions");
      if (r.ok) {
        setPositions(await r.json());
      } else {
        showNotification("Failed to load positions", "error");
      }
    } catch (_) {
      showNotification("Error loading positions", "error");
    } finally {
      setLoadingPositions(false);
    }
  };

  const handleExitPosition = async (accountId: string, symbol: string, netQty: number, segment: string, exchange: string) => {
    if (!window.confirm(`Are you sure you want to square off position for ${symbol} (Qty: ${netQty})?`)) {
      return;
    }
    setExitingPositionId(`${accountId}_${symbol}`);
    try {
      const r = await fetch("/api/positions/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, symbol, quantity: netQty, segment, exchange }),
      });
      if (r.ok) {
        showNotification(`Exit order placed for ${symbol}`, "success");
        fetchPositions();
        fetchMargins();
        fetchOrders();
      } else {
        const errData = await r.json();
        showNotification(`Exit failed: ${errData.error || "Unknown error"}`, "error");
      }
    } catch (e: any) {
      showNotification(`Exit error: ${e.message}`, "error");
    } finally {
      setExitingPositionId(null);
    }
  };

  const handleExitAllPositions = async () => {
    if (!window.confirm("🚨 WARNING: You are triggering an EMERGENCY EXIT ALL. This will close all open positions across all active master and slave accounts. Proceed?")) {
      return;
    }
    setExitingAll(true);
    try {
      const r = await fetch("/api/positions/exit-all", { method: "POST" });
      if (r.ok) {
        const d = await r.json();
        showNotification(`Emergency Exit triggered! Closed ${d.totalExits} position(s).`, "success");
        fetchPositions();
        fetchMargins();
        fetchOrders();
      } else {
        const errData = await r.json();
        showNotification(`Emergency Exit failed: ${errData.error || "Unknown error"}`, "error");
      }
    } catch (e: any) {
      showNotification(`Emergency Exit error: ${e.message}`, "error");
    } finally {
      setExitingAll(false);
    }
  };

  const handleLoadScrips = async () => {
    setIsLoadingScrips(true);
    try {
      const r = await fetch("/api/scrips/load", { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        setScripStatus({ loaded: d.loaded, count: d.count });
        showNotification(`Scrip master loaded (${d.count})`, "success");
      } else {
        showNotification(d.error || "Failed to load scrips", "error");
      }
    } catch (_) {
      showNotification("Failed to load scrips", "error");
    } finally {
      setIsLoadingScrips(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Watchlist API calls
  // ─────────────────────────────────────────────────────────────────────────
  const fetchWatchlist = async () => {
    try {
      const r = await fetch("/api/watchlist");
      if (r.ok) setWatchlist(await r.json());
    } catch (_) { }
  };

  const handleToggleWatchlist = async (scrip: ScripInfo) => {
    const isFaved = watchlist.some((w) => w.scriptToken === scrip.scriptToken);
    if (isFaved) {
      try {
        await fetch(`/api/watchlist/${scrip.scriptToken}`, { method: "DELETE" });
        setWatchlist((prev) => prev.filter((w) => w.scriptToken !== scrip.scriptToken));
        showNotification(`Removed ${scrip.scripRefKey || scrip.tradingSymbol} from watchlist`, "info");
      } catch (_) {
        showNotification("Failed to remove from watchlist", "error");
      }
    } else {
      try {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...scrip, addedAt: new Date().toISOString() }),
        });
        setWatchlist((prev) => [
          ...prev,
          { ...scrip, addedAt: new Date().toISOString() },
        ]);
        showNotification(`Added ${scrip.scripRefKey || scrip.tradingSymbol} to watchlist ★`, "success");
      } catch (_) {
        showNotification("Failed to add to watchlist", "error");
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Account CRUD
  // ─────────────────────────────────────────────────────────────────────────
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname || !mobileNumber) {
      showNotification("Please provide nickname and mobile number", "error");
      return;
    }
    try {
      const payload = {
        id: editingAccountId,
        nickname,
        role,
        mobileNumber,
        ucc,
        mpin,
        consumerKey,
        totpSecret,
        multiplier,
      };
      const r = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const errData = await r.json();
        throw new Error(errData.error || "Failed to save account");
      }
      showNotification(`Account '${nickname}' saved`, "success");
      resetForm();
      fetchAccounts();
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const handleEditAccount = (acc: AccountSummary) => {
    setEditingAccountId(acc.id);
    setNickname(acc.nickname);
    setRole(acc.role);
    setMobileNumber(acc.mobileNumber);
    setUcc(acc.ucc);
    setMultiplier(acc.multiplier);
    setMpin("");
    setConsumerKey("");
    setTotpSecret("");
    setShowAddForm(true);
    setLeftTab("accounts");
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`Remove account '${name}'?`)) return;
    try {
      const r = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (r.ok) {
        showNotification(`Account '${name}' removed`, "success");
        fetchAccounts();
      }
    } catch (_) {
      showNotification("Failed to delete account", "error");
    }
  };

  const handleLoginAccount = async (acc: AccountSummary) => {
    try {
      let manualOtp = "";
      if (!acc.hasAutoTotpSecret) {
        const enteredOtp = window.prompt(
          `Enter current 6-digit Kotak TOTP for ${acc.nickname}`
        );
        if (!enteredOtp) return;
        manualOtp = enteredOtp.replace(/\D/g, "");
        if (manualOtp.length !== 6) {
          showNotification("Enter a valid 6-digit TOTP", "error");
          return;
        }
      }

      showNotification(`Authenticating ${acc.nickname}...`, "info");
      const r = await fetch(`/api/accounts/${acc.id}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualOtp }),
      });
      const d = await r.json();
      if (d.success) {
        showNotification(`Session active for ${acc.nickname}`, "success");
      } else {
        showNotification(`Auth failed for ${acc.nickname}: ${d.error}`, "error");
      }
      fetchAccounts();
    } catch (_) {
      showNotification("Network error during login", "error");
    }
  };

  const handleRefreshAllSessions = async () => {
    setRefreshingAll(true);
    try {
      showNotification("Syncing all sessions...", "info");
      const r = await fetch("/api/accounts/refresh-all", { method: "POST" });
      const d = await r.json();
      if (d.success) {
        const counts = d.results.reduce(
          (acc: any, r: any) => {
            r.success ? acc.success++ : acc.failed++;
            return acc;
          },
          { success: 0, failed: 0 }
        );
        showNotification(
          `Sessions synced. Active: ${counts.success}, Errors: ${counts.failed}`,
          counts.failed > 0 ? "error" : "success"
        );
      }
      fetchAccounts();
    } catch (_) {
      showNotification("Failed to refresh sessions", "error");
    } finally {
      setRefreshingAll(false);
    }
  };

  const resetForm = () => {
    setEditingAccountId(null);
    setNickname("");
    setRole("slave");
    setMobileNumber("");
    setUcc("");
    setMpin("");
    setConsumerKey("");
    setTotpSecret("");
    setMultiplier(1.0);
    setShowAddForm(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Order placement (existing pad + quick dialog)
  // ─────────────────────────────────────────────────────────────────────────
  const masterAcc = accounts.find((a) => a.role === "master");
  const slaveAccs = accounts.filter((a) => a.role === "slave");

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    await placeOrderCore(
      instrument,
      customSymbol,
      optionType,
      strikePrice,
      expiry,
      Number(quantity),
      Number(price),
      orderType,
      transactionType
    );
  };

  const placeOrderCore = async (
    instr: string,
    custSym: string,
    opType: "CE" | "PE" | "FUT" | "EQ",
    strike: string,
    exp: string,
    qty: number,
    px: number,
    ordType: "MARKET" | "LIMIT" | "SL",
    txType: "BUY" | "SELL",
    isQuickOrder = false,
    triggerPx = 0
  ) => {
    setSubmittingOrder(true);

    if (!masterAcc) {
      showNotification("Configure and login to a Master account first", "error");
      setSubmittingOrder(false);
      return false;
    }
    if (masterAcc.status !== "active") {
      showNotification("Master account must be Active before placing trades", "error");
      setSubmittingOrder(false);
      return false;
    }

    try {
      let finalSymbol = custSym;
      if (instr !== "CUSTOM" && !isQuickOrder) {
        const strikeStr = opType === "CE" || opType === "PE" ? strike : "";
        const formattedExpiry = exp.replace(/-/g, "").slice(2);
        finalSymbol = `${instr}${formattedExpiry}${strikeStr}${opType}`;
      }

      const payload = {
        symbol: finalSymbol.toUpperCase(),
        instrument: instr,
        optionType: opType,
        strikePrice: Number(strike) || 0,
        expiry: exp,
        quantity: qty,
        price: px || 0,
        triggerPrice: triggerPx || 0,
        orderType: ordType === "SL" ? "SL" : (px === 0 ? "MARKET" : ordType),
        transactionType: txType,
      };

      const r = await fetch("/api/orders/replicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const d = await r.json();
      if (d.success) {
        showNotification(
          `Trade executed! Master ID: ${d.masterOrder.id}. Copied to ${d.slaveOrders.length} slave(s).`,
          "success"
        );
        fetchOrders();
        return true;
      } else {
        showNotification(
          `Order failed: ${d.masterOrder.errorMessage || "Unknown error"}`,
          "error"
        );
        return false;
      }
    } catch (_) {
      showNotification("Failed to execute order", "error");
      return false;
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Quick order from watchlist/search
  const handleQuickOrderConfirm = async (
    qty: number,
    px: number,
    ordType: "MARKET" | "LIMIT" | "SL",
    triggerPx = 0
  ) => {
    if (!orderDialog) return;
    const { scrip, side } = orderDialog;

    const ok = await placeOrderCore(
      scrip.instrumentName,
      scrip.tradingSymbol,
      scrip.segment as "CE" | "PE" | "FUT" | "EQ",
      String(scrip.strikePrice),
      scrip.expiry,
      qty,
      px,
      ordType,
      side,
      true, // isQuickOrder
      triggerPx
    );
    if (ok) setOrderDialog(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Order log grouping
  // ─────────────────────────────────────────────────────────────────────────
  const masterOrders = orders.filter((o) => o.accountRole === "master");
  const getSlavesForMaster = (mid: string) =>
    orders.filter((o) => o.masterOrderId === mid);

  const toggleMasterExpand = (id: string) =>
    setExpandedMasterOrders((prev) => ({ ...prev, [id]: !prev[id] }));

  // Cancel a pending order
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this pending order?")) return;
    setCancellingOrderId(orderId);
    try {
      const r = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const d = await r.json();
      if (r.ok && d.success) {
        showNotification(`Order ${orderId} cancelled successfully`, "success");
        fetchOrders();
      } else {
        showNotification(`Cancel failed: ${d.error || "Unknown error"}`, "error");
      }
    } catch (_) {
      showNotification("Failed to cancel order", "error");
    } finally {
      setCancellingOrderId(null);
    }
  };

  // Sync all pending order statuses from broker
  const handleSyncOrderStatus = async () => {
    setSyncingOrders(true);
    try {
      const r = await fetch("/api/orders/sync-status", { method: "POST" });
      const d = await r.json();
      if (r.ok) {
        setOrders(d.orders);
        if (d.updated > 0) {
          showNotification(`Updated ${d.updated} order(s) from broker`, "success");
        } else {
          showNotification("All orders are up to date", "info");
        }
      } else {
        showNotification(`Sync failed: ${d.error || "Unknown error"}`, "error");
      }
    } catch (_) {
      showNotification("Failed to sync order statuses", "error");
    } finally {
      setSyncingOrders(false);
    }
  };

  // Fetch backend logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const r = await fetch("/api/logs?lines=500");
      if (r.ok) {
        const d = await r.json();
        setBackendLogs(d.logs || []);
      }
    } catch (_) {
      showNotification("Failed to fetch backend logs", "error");
    } finally {
      setLoadingLogs(false);
    }
  };

  // Clear backend logs file
  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear the backend log file? This cannot be undone.")) return;
    try {
      const r = await fetch("/api/logs/clear", { method: "POST" });
      if (r.ok) {
        showNotification("Backend logs cleared", "success");
        setBackendLogs([]);
      } else {
        showNotification("Failed to clear logs", "error");
      }
    } catch (_) {
      showNotification("Failed to clear logs", "error");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      id="neo-copier-dashboard"
      className={`min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-teal-500 selection:text-white transition-colors duration-300 ${theme === "modern" ? "theme-modern" : ""
        }`}
    >
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 shadow-xl backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col xl:flex-row items-center xl:justify-between gap-3 xl:gap-4">
          {/* Live Index Tickers */}
          {accounts.some((a) => a.role === "master" && a.status === "active") && (
            <div className="flex items-center justify-between xl:justify-start gap-4 bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl backdrop-blur-sm shadow-inner overflow-x-auto scrollbar-none max-w-full w-full xl:w-auto">
              {/* NIFTY 50 */}
              <div className="gap-2 pr-4 border-r border-slate-800">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">NIFTY 50</div>
                {quotes["Nifty 50"] ? (
                  <div className="gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-100">
                      {quotes["Nifty 50"].ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[10px] font-bold font-mono flex items-center gap-0.5 ${quotes["Nifty 50"].change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {quotes["Nifty 50"].change >= 0 ? "+" : ""}{quotes["Nifty 50"].change.toFixed(2)} ({quotes["Nifty 50"].change >= 0 ? "+" : ""}{quotes["Nifty 50"].changePct.toFixed(2)}%)
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 animate-pulse font-medium">loading...</div>
                )}
              </div>

              {/* SENSEX */}
              <div className="gap-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">SENSEX</div>
                {quotes["SENSEX"] ? (
                  <div className="gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-100">
                      {quotes["SENSEX"].ltp.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[10px] font-bold font-mono flex items-center gap-0.5 ${quotes["SENSEX"].change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {quotes["SENSEX"].change >= 0 ? "+" : ""}{quotes["SENSEX"].change.toFixed(2)} ({quotes["SENSEX"].change >= 0 ? "+" : ""}{quotes["SENSEX"].changePct.toFixed(2)}%)
                    </span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-600 animate-pulse font-medium">loading...</div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 xl:pb-0 w-full xl:w-auto xl:justify-end whitespace-nowrap">
            {/* SSE Status */}
            <div
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${sseConnected
                ? "bg-teal-500/10 border-teal-500/20 text-teal-400"
                : "bg-slate-800 border-slate-700 text-slate-500"
                }`}
              title={sseConnected ? "Live price feed connected" : "Price feed disconnected"}
            >
              {sseConnected ? (
                <Wifi className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline font-semibold">
                {sseConnected ? "LIVE FEED" : "FEED OFF"}
              </span>
            </div>

            {/* Clock */}
            <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-mono font-medium text-slate-300">
              <Clock className="w-4 h-4 text-teal-400 animate-pulse" />
              <span>IST: {currentTime || "09:15:00 AM"}</span>
            </div>

            {/* Live indicator */}
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>LIVE TRADING</span>
            </div>

            {/* Auto-replicator */}
            <button
              id="replication-toggle"
              onClick={toggleAutoReplicate}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${settings.autoReplicate
                ? "bg-teal-500 text-slate-950 font-bold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
            >
              <Zap className="w-4 h-4" />
              <span>REPLICATOR</span>
            </button>

            {/* Help / Guide Toggle */}
            <button
              id="guide-toggle"
              onClick={() => setShowHelp((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${showHelp
                ? "bg-teal-500 text-slate-950 font-bold"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                }`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Refresh sessions */}
            <button
              id="global-session-refresh"
              onClick={handleRefreshAllSessions}
              disabled={refreshingAll}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Refresh sessions for all accounts"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingAll ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>

            {/* Power Toggle */}
            <button
              id="power-toggle"
              onClick={togglePower}
              className={`p-2 border rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${powerOn
                ? "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400"
                : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20 text-rose-400 animate-pulse"
                }`}
              title={powerOn ? "Suspend all background quote polling (Save GCP bill)" : "Resume all background quote polling"}
            >
              <Power className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              id="theme-toggle"
              onClick={() => setTheme((prev) => (prev === "classic" ? "modern" : "classic"))}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Toggle theme (Classic Dark vs. Modern Light)"
            >
              {theme === "classic" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* ── NOTIFICATION ────────────────────────────────────────────────── */}
        {actionStatus && (
          <div
            id="notification-banner"
            className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-4 rounded-xl flex items-start gap-3 border shadow-2xl transition-all max-w-sm sm:max-w-md backdrop-blur-md ${actionStatus.type === "success"
              ? "bg-teal-950/90 border-teal-500/40 text-teal-300"
              : actionStatus.type === "error"
                ? "bg-rose-950/90 border-rose-500/40 text-rose-300"
                : "bg-sky-950/90 border-sky-500/40 text-sky-300"
              }`}
          >
            {actionStatus.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-grow">
              <p className="text-sm font-medium">{actionStatus.message}</p>
            </div>
            <button
              onClick={() => setActionStatus(null)}
              className="text-slate-400 hover:text-white shrink-0 font-bold ml-1 hover:scale-115 transition-transform"
              style={{ lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
        )}

        {/* ── GUIDE ───────────────────────────────────────────────────────── */}
        {showHelp && (
          <div
            id="info-workspace-guide"
            className="bg-gradient-to-r from-teal-950/20 to-slate-900 border border-teal-500/20 rounded-xl p-5 relative"
          >
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800"
            >
              Dismiss Guide
            </button>
            <div className="flex items-start gap-3">
              <HelpCircle className="w-6 h-6 text-teal-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-teal-300">
                  Kotak Neo Multi-Account Trade Copier — Quick Start
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                  {[
                    {
                      title: "1. Master Setup",
                      desc: "Register one Master account. All trades replicate from it.",
                    },
                    {
                      title: "2. Search & Watch",
                      desc: "Use Search tab to find instruments. Star ★ them to watchlist.",
                    },
                    {
                      title: "3. Live Prices",
                      desc: "Watchlisted & searched instruments stream live LTP via SSE.",
                    },
                    {
                      title: "4. Quick Trade",
                      desc: "Hit BUY/SELL on any row to instantly place & replicate.",
                    },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800"
                    >
                      <span className="text-[10px] uppercase font-bold text-teal-400 block mb-1">
                        {card.title}
                      </span>
                      <span className="text-xs text-slate-400">{card.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
          <section className="lg:col-span-12 space-y-6">
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              {/* Tab Bar */}
              <div className="border-b border-slate-800 bg-slate-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 pt-3 gap-2">
                  <div className="flex gap-1 overflow-x-auto scrollbar-none max-w-full pb-1 sm:pb-0 whitespace-nowrap">
                    {(
                      [
                        { id: "accounts", label: "Accounts", icon: Users },
                        { id: "search", label: "Search", icon: Search },
                        { id: "watchlist", label: "Watchlist", icon: Star, badge: watchlist.length },
                        { id: "positions", label: "Positions & Funds", icon: Activity },
                        { id: "logs", label: "System Logs", icon: Terminal },
                      ] as { id: LeftTab; label: string; icon: any; badge?: number }[]
                    ).map(({ id, label, icon: Icon, badge }) => (
                      <button
                        key={id}
                        onClick={() => setLeftTab(id)}
                        className={`px-3 sm:px-4 py-2.5 text-xs font-semibold rounded-t-lg flex items-center gap-1.5 cursor-pointer transition-all border-b-2 shrink-0 ${leftTab === id
                          ? "text-teal-400 border-teal-500 bg-slate-950"
                          : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/50"
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                        {badge !== undefined && (
                          <span className="font-mono bg-slate-800 text-[10px] text-slate-300 px-1.5 py-0.5 rounded">
                            {badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {!powerOn && (
                    <div className="bg-rose-500/10 border-b border-rose-500/20 px-4 py-2.5 text-xs text-rose-400 flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Background price quote polling is currently suspended (GCP Save Mode). Click the Power button in the header to resume.</span>
                    </div>
                  )}

                  {/* Tab-specific action */}
                  {leftTab === "accounts" && (
                    <button
                      id="add-account-btn"
                      onClick={() => {
                        if (showAddForm) resetForm();
                        else setShowAddForm(true);
                      }}
                      className="px-3 py-1.5 mb-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all"
                    >
                      {showAddForm ? (
                        "Cancel"
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Account</span>
                        </>
                      )}
                    </button>
                  )}

                  {leftTab === "positions" && (
                    <button
                      onClick={handleExitAllPositions}
                      disabled={exitingAll}
                      className="px-3 py-1.5 mb-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{exitingAll ? "EXITING ALL..." : "EMERGENCY EXIT ALL"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ── ACCOUNTS TAB ──────────────────────────────────────────── */}
              {leftTab === "accounts" && (
                <div>
                  {showAddForm && (
                    <form
                      onSubmit={handleSaveAccount}
                      className="p-5 border-b border-slate-800 bg-slate-900/30 space-y-4"
                    >
                      <h3 className="text-xs font-bold uppercase text-teal-400 tracking-wider">
                        {editingAccountId
                          ? "Edit Kotak Neo Account"
                          : "Register Kotak Neo Account"}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 font-medium mb-1">
                            Nickname / Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="e.g. Master Trader"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 font-medium mb-1">
                            Account Role *
                          </label>
                          <select
                            value={role}
                            onChange={(e) =>
                              setRole(e.target.value as "master" | "slave")
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                          >
                            <option value="slave">Slave (Copier Sub-Account)</option>
                            <option value="master">Master (Main Trader)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 font-medium mb-1">
                            Mobile Number *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={10}
                            value={mobileNumber}
                            onChange={(e) =>
                              setMobileNumber(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder="e.g. 9876543210"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 font-medium mb-1">
                            UCC (Unique Client Code) *
                          </label>
                          <input
                            type="text"
                            required
                            value={ucc}
                            onChange={(e) => setUcc(e.target.value.toUpperCase())}
                            placeholder="e.g. ABC123"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 font-medium mb-1">
                            Kotak MPIN *
                          </label>
                          <input
                            type="password"
                            maxLength={6}
                            value={mpin}
                            onChange={(e) =>
                              setMpin(e.target.value.replace(/\D/g, ""))
                            }
                            placeholder={editingAccountId ? "••••••" : "e.g. 123456"}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono tracking-widest focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 font-medium mb-1">
                            Consumer Key
                          </label>
                          <input
                            type="text"
                            value={consumerKey}
                            onChange={(e) => setConsumerKey(e.target.value)}
                            placeholder="e.g. your_consumer_key"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 font-medium mb-1">
                            TOTP Secret — Optional
                          </label>
                          <input
                            type="text"
                            value={totpSecret}
                            onChange={(e) => setTotpSecret(e.target.value)}
                            placeholder="e.g. JBSWY3DPEHPK3PXP"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-teal-500 uppercase"
                          />
                        </div>
                        {role === "slave" && (
                          <div>
                            <label className="block text-xs text-slate-400 font-medium mb-1">
                              Lot Multiplier
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="20"
                              value={multiplier}
                              onChange={(e) => setMultiplier(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={resetForm}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {editingAccountId ? "Update Account" : "Register Account"}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="p-4 space-y-4">
                    {loadingAccounts ? (
                      <div className="flex flex-col items-center justify-center py-10 space-y-2">
                        <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
                        <span className="text-xs text-slate-400">
                          Loading accounts...
                        </span>
                      </div>
                    ) : accounts.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl space-y-3">
                        <div className="bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-slate-500">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-300">
                            No accounts registered
                          </p>
                          <p className="text-xs text-slate-500">
                            Add your Master account to get started.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowAddForm(true)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Register First Account
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Master */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded">
                              Master Source Account
                            </span>
                            <div className="h-px bg-slate-800 flex-1" />
                          </div>
                          {masterAcc ? (
                            <AccountCard
                              acc={masterAcc}
                              totpCode={totpPreviews[masterAcc.id]}
                              onLogin={handleLoginAccount}
                              onEdit={handleEditAccount}
                              onDelete={handleDeleteAccount}
                              colorClass="border-teal-500/30"
                              iconBg="bg-teal-500/10 text-teal-400"
                            />
                          ) : (
                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 text-amber-300 rounded-xl text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>No Master Account registered.</span>
                            </div>
                          )}
                        </div>

                        {/* Slaves */}
                        <div className="pt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded">
                              Slave Replicas ({slaveAccs.length})
                            </span>
                            <div className="h-px bg-slate-800 flex-1" />
                          </div>
                          {slaveAccs.length === 0 ? (
                            <div className="p-3 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl text-xs text-center">
                              No slave accounts added.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {slaveAccs.map((slave) => (
                                <AccountCard
                                  key={slave.id}
                                  acc={slave}
                                  totpCode={totpPreviews[slave.id]}
                                  onLogin={handleLoginAccount}
                                  onEdit={handleEditAccount}
                                  onDelete={handleDeleteAccount}
                                  colorClass="border-slate-800"
                                  iconBg="bg-sky-500/10 text-sky-400"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── SEARCH TAB ────────────────────────────────────────────── */}
              {leftTab === "search" && (
                <div className="flex flex-col h-full">
                  {/* Search input */}
                  <div className="p-4 border-b border-slate-800">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          id="scrip-search-input"
                          type="text"
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search NIFTY, BANKNIFTY, SENSEX, RELIANCE…"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                        />
                        {isSearching && (
                          <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-400 animate-spin" />
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <button
                          type="button"
                          onClick={handleLoadScrips}
                          disabled={
                            isLoadingScrips ||
                            !accounts.some((a) => a.status === "active")
                          }
                          className="inline-flex items-center justify-center rounded-xl border border-teal-500 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isLoadingScrips ? "Loading scrips..." : "Load Scrips"}
                        </button>
                        <div className="text-xs text-slate-500">
                          {scripStatus.loaded
                            ? `Loaded ${scripStatus.count} scrips`
                            : "Scrips not loaded yet"}
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1.5 px-1">
                      Hover a row to see BUY/SELL buttons and ★ favourites
                    </p>
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-y-auto p-2 max-h-[420px]">
                    {!searchQuery.trim() ? (
                      <div className="text-center py-10 text-slate-600 text-xs space-y-2">
                        <Search className="w-8 h-8 mx-auto text-slate-700" />
                        <p>Type to search instruments</p>
                        <p className="text-[10px]">
                          Try: NIFTY, BANKNIFTY, CE, FUT, RELIANCE
                        </p>
                      </div>
                    ) : searchResults.length === 0 && !isSearching ? (
                      <div className="text-center py-8 text-slate-600 text-xs">
                        No instruments found for "{searchQuery}"
                      </div>
                    ) : (
                      <div className="space-y-2 lg:space-y-0.5">
                        {searchResults.map((scrip) => (
                          <ScripRow
                            key={scrip.scriptToken}
                            scrip={scrip}
                            quote={quotes[scrip.scriptToken]}
                            isFaved={watchlist.some(
                              (w) => w.scriptToken === scrip.scriptToken
                            )}
                            onFav={handleToggleWatchlist}
                            onBuySell={(s, side) => setOrderDialog({ scrip: s, side })}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="px-4 py-2 border-t border-slate-800/50 flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${sseConnected ? "bg-teal-500 animate-pulse" : "bg-slate-600"
                        }`}
                    />
                    <span className="text-[10px] text-slate-600">
                      {sseConnected
                        ? `Streaming prices for ${searchResults.length} instrument(s)`
                        : "Price feed inactive"}
                    </span>
                  </div>
                </div>
              )}

              {/* ── WATCHLIST TAB ─────────────────────────────────────────── */}
              {leftTab === "watchlist" && (
                <div className="flex flex-col h-full">
                  <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold text-slate-100">
                        My Watchlist
                      </span>
                      <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-mono">
                        {watchlist.length} items
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 text-[10px] ${sseConnected ? "text-teal-400" : "text-slate-600"
                        }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${sseConnected ? "bg-teal-500 animate-pulse" : "bg-slate-600"
                          }`}
                      />
                      {sseConnected ? "Live prices" : "No feed"}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 max-h-[460px]">
                    {watchlist.length === 0 ? (
                      <div className="text-center py-12 text-slate-600 text-xs space-y-2">
                        <Star className="w-10 h-10 mx-auto text-slate-800" />
                        <p className="font-semibold text-slate-500">
                          No instruments in watchlist
                        </p>
                        <p className="text-[10px]">
                          Go to Search tab and ★ star instruments to add them here
                        </p>
                        <button
                          onClick={() => setLeftTab("search")}
                          className="mt-2 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg text-xs font-semibold cursor-pointer hover:bg-teal-500/20 transition-all"
                        >
                          Open Search →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 lg:space-y-0.5">
                        {watchlist.map((item) => (
                          <ScripRow
                            key={item.scriptToken}
                            scrip={item}
                            quote={quotes[item.scriptToken]}
                            isFaved={true}
                            onFav={handleToggleWatchlist}
                            onBuySell={(s, side) =>
                              setOrderDialog({ scrip: s, side })
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── POSITIONS & FUNDS TAB ──────────────────────────────────── */}
              {leftTab === "positions" && (
                <div className="flex flex-col h-full space-y-6 p-4">
                  {/* Margin Summary Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Account Funds</h3>
                      <button
                        onClick={() => { fetchMargins(); fetchPositions(); }}
                        disabled={loadingMargins || loadingPositions}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px] font-semibold cursor-pointer transition-all"
                      >
                        Refresh Funds
                      </button>
                    </div>

                    {loadingMargins && margins.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs animate-pulse">Loading margins...</div>
                    ) : margins.length === 0 ? (
                      <div className="text-center py-6 text-slate-600 text-xs border border-slate-800 rounded-lg bg-slate-900/10">No active accounts to show funds.</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {margins.map((m: any) => (
                          <div key={m.accountId} className="bg-slate-900/40 border border-slate-800/60 p-3.5 rounded-xl space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800/40 pb-1.5">
                              <span className="text-xs font-bold text-slate-100 truncate max-w-[120px]">{m.accountName}</span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${m.role === "master"
                                ? "text-teal-400 bg-teal-400/10 border-teal-500/30"
                                : "text-amber-400 bg-amber-400/10 border-amber-500/30"
                                }`}>
                                {m.role ? m.role.toUpperCase() : "SLAVE"}
                              </span>
                            </div>
                            {m.error ? (
                              <div className="text-[10px] text-rose-400">{m.error}</div>
                            ) : (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-left">
                                <div className="flex justify-between items-center border-b border-slate-800/20 pb-0.5">
                                  <span className="text-[10px] text-slate-500">Ledger Cash</span>
                                  <span className="text-xs font-bold font-mono text-slate-200">₹{fmt(m.cashBalance)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-800/20 pb-0.5">
                                  <span className="text-[10px] text-slate-500">Available</span>
                                  <span className="text-xs font-bold font-mono text-teal-400">₹{fmt(m.availableMargin)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-800/20 pb-0.5">
                                  <span className="text-[10px] text-slate-500">Margin Used</span>
                                  <span className="text-xs font-bold font-mono text-slate-200">₹{fmt(m.utilMargin)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-800/20 pb-0.5">
                                  <span className="text-[10px] text-slate-500">Collateral</span>
                                  <span className="text-xs font-bold font-mono text-slate-200">₹{fmt(m.collateral || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-800/20 pb-0.5">
                                  <span className="text-[10px] text-slate-500">Realized MTM</span>
                                  <span className={`text-xs font-bold font-mono ${(m.realizedPL || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {(m.realizedPL || 0) >= 0 ? "+" : ""}₹{fmt(m.realizedPL || 0)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-800/20 pb-0.5">
                                  <span className="text-[10px] text-slate-500">Unrealized MTM</span>
                                  <span className={`text-xs font-bold font-mono ${(m.unrealizedPL || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                    {(m.unrealizedPL || 0) >= 0 ? "+" : ""}₹{fmt(m.unrealizedPL || 0)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Positions Section */}
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Trading Positions</h3>
                      <button
                        onClick={fetchPositions}
                        disabled={loadingPositions}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px] font-semibold cursor-pointer transition-all"
                      >
                        Refresh Positions
                      </button>
                    </div>

                    {loadingPositions && positions.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 text-xs animate-pulse">Loading positions...</div>
                    ) : positions.length === 0 ? (
                      <div className="text-center py-12 text-slate-600 text-xs border border-slate-800 rounded-lg bg-slate-900/10">No active accounts.</div>
                    ) : (
                      <div className="space-y-5 flex-1 overflow-y-auto max-h-[500px]">
                        {positions.map((acc: any) => {
                          const openPositions = (acc.positions || []).filter((p: any) => p.netQty !== 0);

                          return (
                            <div key={acc.accountId} className="space-y-2 border border-slate-800/80 rounded-xl p-4 bg-slate-950/40">
                              {/* Account Header */}
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-100">{acc.accountName}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${acc.role === "master"
                                    ? "text-teal-400 bg-teal-400/10 border-teal-500/30"
                                    : "text-amber-400 bg-amber-400/10 border-amber-500/30"
                                    }`}>
                                    {acc.role ? acc.role.toUpperCase() : "SLAVE"}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500">
                                  {(acc.positions || []).length} positions ({openPositions.length} open)
                                </span>
                              </div>

                              {acc.error && (
                                <div className="text-center py-4 text-xs text-rose-400">{acc.error}</div>
                              )}

                              {(!acc.positions || acc.positions.length === 0) && !acc.error && (
                                <div className="text-center py-4 text-xs text-slate-600">No positions found for this account.</div>
                              )}

                              {/* Positions List */}
                              {acc.positions && acc.positions.length > 0 && (
                                <div className="space-y-3">
                                  {acc.positions.map((p: any, idx: number) => {
                                    // Live P/L calculation: PL = (sellQty * sellAvg) - (buyQty * buyAvg) + (netQty * LTP)
                                    const ltp = quotes[p.scriptToken]?.ltp || p.actvLtp || 0;
                                    const pl = (p.sellQty * p.sellAvg) - (p.buyQty * p.buyAvg) + (p.netQty * ltp);
                                    const isPlPos = pl >= 0;

                                    return (
                                      <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-900/60 border border-slate-800/40 rounded-xl hover:border-slate-700/60 transition-all">
                                        {/* Instrument & Details */}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono truncate">{p.symbol}</span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border text-teal-400 bg-teal-400/10 border-teal-500/20">{p.segment}</span>
                                            <span className="text-[9px] text-slate-400 bg-slate-800 px-1 rounded">{p.exchange}</span>
                                          </div>

                                          {/* Position Quantity / Avg Rates details */}
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[10px] text-slate-400">
                                            <div>NET QTY: <span className={`font-semibold font-mono ${p.netQty > 0 ? "text-emerald-400" : p.netQty < 0 ? "text-rose-400" : "text-slate-400"}`}>{p.netQty}</span></div>
                                            <div>BUY QTY: <span className="font-semibold text-slate-300">{p.buyQty} @ ₹{fmt(p.buyAvg)}</span></div>
                                            <div>SELL QTY: <span className="font-semibold text-slate-300">{p.sellQty} @ ₹{fmt(p.sellAvg)}</span></div>
                                            <div>LTP: <span className="font-semibold text-teal-400 font-mono">₹{fmt(ltp)}</span></div>
                                          </div>
                                        </div>

                                        {/* Live P/L & Square Off Action */}
                                        <div className="flex items-center justify-between md:justify-end gap-4 border-t border-slate-800/40 pt-2 md:pt-0 md:border-t-0 shrink-0">
                                          {/* P/L Badge */}
                                          <div className="text-right">
                                            <span className="text-[9px] text-slate-500 block uppercase font-semibold">P/L</span>
                                            <span className={`text-xs sm:text-sm font-extrabold font-mono ${isPlPos ? "text-emerald-400" : "text-rose-400"}`}>
                                              {isPlPos ? "+" : ""}₹{fmt(pl)}
                                            </span>
                                          </div>

                                          {/* Exit Square Off Button */}
                                          {p.netQty !== 0 && (
                                            <button
                                              onClick={() => handleExitPosition(acc.accountId, p.symbol, p.netQty, p.segment, p.exchange)}
                                              disabled={exitingPositionId === `${acc.accountId}_${p.symbol}`}
                                              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-all"
                                            >
                                              {exitingPositionId === `${acc.accountId}_${p.symbol}` ? "EXITING..." : "SQUARE OFF"}
                                            </button>
                                          )}
                                          {p.netQty === 0 && (
                                            <span className="text-[10px] font-bold text-slate-600 bg-slate-800/50 px-2 py-1 rounded-lg">
                                              CLOSED
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* ── SYSTEM LOGS TAB ──────────────────────────────────────────── */}
              {leftTab === "logs" && (
                <div className="flex flex-col h-full space-y-4 p-4 font-mono">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Filter:</span>
                      {(["ALL", "INFO", "WARN", "ERROR"] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setLogFilter(filter)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer transition-all ${logFilter === filter
                            ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                            }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={autoRefreshLogs}
                          onChange={(e) => setAutoRefreshLogs(e.target.checked)}
                          className="accent-teal-500 rounded border-slate-800 bg-slate-900"
                        />
                        Auto-Refresh
                      </label>

                      <button
                        onClick={fetchLogs}
                        disabled={loadingLogs}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px] font-semibold cursor-pointer transition-all"
                      >
                        {loadingLogs ? "Loading..." : "Refresh"}
                      </button>

                      <a
                        href={`${(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}/api/logs/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>

                      <button
                        onClick={handleClearLogs}
                        className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear File
                      </button>
                    </div>
                  </div>

                  {/* Logs Console Container */}
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 h-[450px] max-h-[450px] overflow-y-auto space-y-1 text-[11px] leading-relaxed text-left">
                    {backendLogs.length === 0 ? (
                      <div className="text-center py-12 text-slate-600 text-xs italic">
                        {loadingLogs ? "Fetching logs from backend..." : "No logs recorded in file."}
                      </div>
                    ) : (
                      backendLogs
                        .filter((line) => {
                          if (logFilter === "ALL") return true;
                          return line.includes(`[${logFilter}]`);
                        })
                        .map((line, idx) => {
                          let colorClass = "text-slate-400";
                          if (line.includes("[ERROR]")) colorClass = "text-rose-400 font-semibold";
                          else if (line.includes("[WARN]")) colorClass = "text-amber-400";
                          else if (line.includes("[INFO]")) colorClass = "text-slate-300";

                          return (
                            <div key={idx} className={`${colorClass} whitespace-pre-wrap font-mono`}>
                              {line}
                            </div>
                          );
                        })
                    )}

                  </div>
                </div>
              )}
            </div>
          </section>


        </div>

        {/* ── ORDER LOGS ───────────────────────────────────────────────────── */}
        <section className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold text-slate-100">
                Replicated Orders & Copy Logs
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncOrderStatus}
                disabled={syncingOrders}
                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Check broker for updated statuses of pending orders"
              >
                <Activity className={`w-3.5 h-3.5 ${syncingOrders ? "animate-pulse" : ""}`} />
                {syncingOrders ? "Syncing..." : "Sync Status"}
              </button>
              <button
                onClick={fetchOrders}
                disabled={loadingOrders}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-800 text-slate-300 rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${loadingOrders ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="p-4 overflow-x-auto">
            {loadingOrders ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Loading order logs...
              </div>
            ) : masterOrders.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No orders placed yet. Use the order pad or BUY/SELL from watchlist.
              </div>
            ) : (
              <div className="space-y-4">
                {masterOrders.map((mOrder) => {
                  const slaves = getSlavesForMaster(mOrder.id);
                  const isExpanded = !!expandedMasterOrders[mOrder.id];
                  const hasFailedSlaves = slaves.some((s) => s.status === "FAILED");

                  return (
                    <div
                      key={mOrder.id}
                      className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/10"
                    >
                      <div className="p-4 bg-slate-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-lg ${mOrder.transactionType === "BUY"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                              }`}
                          >
                            <span className="text-xs font-black uppercase tracking-wider">
                              {mOrder.transactionType}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-100 font-mono">
                                {mOrder.symbol}
                              </h4>
                              <span className="text-[10px] text-slate-500">
                                [{mOrder.instrument} | {mOrder.orderType}]
                              </span>

                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                              <span>
                                Qty: <strong>{mOrder.quantity}</strong>
                              </span>
                              <span>
                                Price:{" "}
                                <strong>
                                  {mOrder.orderType === "SL"
                                    ? `₹${mOrder.price} (Trigger: ₹${mOrder.triggerPrice})`
                                    : mOrder.price === 0
                                      ? "MARKET"
                                      : `₹${mOrder.price}`}
                                </strong>
                              </span>
                              <span>
                                Time:{" "}
                                <strong>
                                  {new Date(mOrder.timestamp).toLocaleTimeString()}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Status:</span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${mOrder.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : mOrder.status === "PENDING"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                                  : mOrder.status === "CANCELLED"
                                    ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                }`}
                            >
                              {mOrder.status}
                            </span>
                            {mOrder.status === "PENDING" && (
                              <button
                                onClick={() => handleCancelOrder(mOrder.id)}
                                disabled={cancellingOrderId === mOrder.id}
                                className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 border border-rose-500/20 text-rose-400 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                                title="Cancel this pending order"
                              >
                                <Ban className="w-3 h-3" />
                                {cancellingOrderId === mOrder.id ? "..." : "Cancel"}
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => toggleMasterExpand(mOrder.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Copies ({slaves.length})</span>
                            {hasFailedSlaves && (
                              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-800/80 bg-slate-950/40 p-3 space-y-2">
                          <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 px-3 py-1">
                            Slave Account Replications
                          </div>
                          {slaves.length === 0 ? (
                            <div className="text-xs text-slate-500 text-center py-2">
                              No copies (auto-replicator was off or no active slaves).
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {slaves.map((sOrder) => (
                                <div
                                  key={sOrder.id}
                                  className="px-3 py-2 bg-slate-900/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-slate-300">
                                      {sOrder.accountName}
                                    </span>
                                    <span className="text-slate-500">|</span>
                                    <span>
                                      Qty:{" "}
                                      <strong className="text-slate-300">
                                        {sOrder.quantity}
                                      </strong>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {sOrder.errorMessage && (
                                      <span
                                        className="text-rose-400 text-[11px] font-mono mr-2"
                                        title={sOrder.errorMessage}
                                      >
                                        ({sOrder.errorMessage.slice(0, 30)}...)
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${sOrder.status === "SUCCESS"
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : sOrder.status === "PENDING"
                                          ? "bg-amber-500/10 text-amber-400 animate-pulse"
                                          : sOrder.status === "CANCELLED"
                                            ? "bg-slate-500/10 text-slate-400"
                                            : "bg-rose-500/10 text-rose-400"
                                        }`}
                                    >
                                      {sOrder.status}
                                    </span>
                                    {sOrder.status === "PENDING" && (
                                      <button
                                        onClick={() => handleCancelOrder(sOrder.id)}
                                        disabled={cancellingOrderId === sOrder.id}
                                        className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-50 border border-rose-500/20 text-rose-400 rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer transition-all"
                                        title="Cancel this pending order"
                                      >
                                        <Ban className="w-2.5 h-2.5" />
                                        {cancellingOrderId === sOrder.id ? "..." : "Cancel"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 bg-slate-950 text-slate-500 text-xs py-8 mt-12 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p>
            Neo Copier — Kotak Neo F&O Trade Copier with Live Instrument Search &
            Watchlist
          </p>
          <p className="text-[11px]">
            Search instruments → Star to watchlist → Buy/Sell with one click →
            Replicates to all slave accounts.
          </p>
        </div>
      </footer>

      {/* ── QUICK ORDER DIALOG ─────────────────────────────────────────────── */}
      {orderDialog && (
        <QuickOrderDialog
          scrip={orderDialog.scrip}
          side={orderDialog.side}
          quote={quotes[orderDialog.scrip.scriptToken]}
          onClose={() => setOrderDialog(null)}
          onConfirm={handleQuickOrderConfirm}
          submitting={submittingOrder}
          slaveAccs={slaveAccs}
        />
      )}
    </div>
  );
}

// ─── AccountCard helper component ────────────────────────────────────────────
function AccountCard({
  acc,
  totpCode,
  onLogin,
  onEdit,
  onDelete,
  colorClass,
  iconBg,
}: {
  acc: AccountSummary;
  totpCode?: string;
  onLogin: (acc: AccountSummary) => void | Promise<void>;
  onEdit: (acc: AccountSummary) => void;
  onDelete: (id: string, name: string) => void | Promise<void>;
  colorClass: string;
  iconBg: string;
  [key: string]: any;
}) {
  return (
    <div
      className={`bg-slate-900/60 border ${colorClass} rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`${iconBg} p-2 rounded-lg mt-0.5`}>
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-100">{acc.nickname}</h4>
            <span
              className={`w-2 h-2 rounded-full ${acc.status === "active"
                ? "bg-emerald-500 animate-ping"
                : "bg-slate-500"
                }`}
            />
            <span className="text-[10px] text-slate-400">({acc.mobileNumber})</span>
            {acc.role === "slave" && (
              <span className="text-[10px] font-semibold bg-slate-800 text-sky-300 px-1.5 py-0.5 rounded border border-slate-700">
                {acc.multiplier}x
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              Status:{" "}
              <strong
                className={`uppercase ${acc.status === "active"
                  ? "text-emerald-400"
                  : acc.status === "error"
                    ? "text-rose-400"
                    : "text-slate-400"
                  }`}
              >
                {acc.status}
              </strong>
            </span>
            {acc.lastLogin && (
              <span>
                Last: {new Date(acc.lastLogin).toLocaleTimeString()}
              </span>
            )}
          </div>
          {acc.errorMessage && (
            <p className="text-[11px] text-rose-400 bg-rose-950/20 px-2 py-1 rounded border border-rose-500/10">
              {acc.errorMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center">
        <button
          id={`login-${acc.role}-${acc.id}`}
          onClick={() => onLogin(acc)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
        >
          <Play className="w-3 h-3 text-emerald-400" />
          <span>Login</span>
        </button>
        <button
          onClick={() => onEdit(acc)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(acc.id, acc.nickname)}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 rounded-lg cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
