import { Navbar } from "./components/Navbar";
import { TerminalView } from "./components/TerminalView";
import { OrdersView } from "./components/OrdersView";
import { AccountsView } from "./components/AccountsView";
import { LogsView } from "./components/LogsView";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { KotakLiveFeed } from "./kotakWebSocket";
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
  Palette,
  Edit3,
  Wallet,
} from "lucide-react";

// Global fetch interceptor to append Auth headers and handle 401 redirects
const nativeFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem("admin-token");
  if (token) {
    init = init || {};
    init.headers = {
      ...init.headers,
      "Authorization": `Bearer ${token}`,
    };
  }
  const response = await nativeFetch(input, init);
  if (response.status === 401) {
    localStorage.removeItem("admin-token");
    window.dispatchEvent(new Event("admin-unauthorized"));
  }
  return response;
};

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
  consumerKey?: string;
  mpin?: string;
  totpSecret?: string;
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

interface ScripCategory {
  key: string;
  label: string;
  exchange: string;
  segment: string;
  count: number;
  isLoaded: boolean;
  url?: string;
}

interface ScripStatusState {
  loaded: boolean;
  totalCount: number;
  categories: ScripCategory[];
  count?: number;
}

type LeftTab = "accounts" | "search" | "pending" | "watchlist" | "positions" | "logs";

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

// ─── OCO Bracket Dialog ────────────────────────────────────────────────────────
// ─── OCO Bracket Dialog ────────────────────────────────────────────────────────
function OcoBracketDialog({
  position,
  existingOco,
  quote,
  onClose,
  onSubmit,
}: {
  position: any;
  existingOco?: any;
  quote?: QuoteData;
  onClose: () => void;
  onSubmit: (data: {
    slTriggerPrice: number;
    slLimitPrice: number;
    tpPrice: number;
    quantity: number;
  }) => Promise<void>;
}) {
  const initialSlTrig = existingOco?.slTriggerPrice ? String(existingOco.slTriggerPrice) : "";
  const initialSlLim = existingOco?.slLimitPrice ? String(existingOco.slLimitPrice) : "";
  const initialTp = existingOco?.tpPrice ? String(existingOco.tpPrice) : "";
  const initialQty = existingOco?.quantity
    ? String(existingOco.quantity)
    : Math.abs(position.netQty ?? position.quantity ?? 0).toString();

  const [slTriggerPrice, setSlTriggerPrice] = useState(initialSlTrig);
  const [slLimitPrice, setSlLimitPrice] = useState(initialSlLim);
  const [tpPrice, setTpPrice] = useState(initialTp);
  const [quantity, setQuantity] = useState(initialQty);
  const [submitting, setSubmitting] = useState(false);

  const isExistingOco = Boolean(existingOco);
  const hasChanged = !isExistingOco || (
    slTriggerPrice.trim() !== initialSlTrig.trim() ||
    slLimitPrice.trim() !== initialSlLim.trim() ||
    tpPrice.trim() !== initialTp.trim() ||
    quantity.trim() !== initialQty.trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const slTrig = parseFloat(slTriggerPrice) || 0;
    const slLim = parseFloat(slLimitPrice) || 0;
    const tp = parseFloat(tpPrice) || 0;
    const qty = parseInt(quantity) || 0;

    if (isNaN(qty) || qty <= 0) {
      alert("Please enter a valid Quantity");
      return;
    }

    if (tp <= 0 && slTrig <= 0) {
      alert("Please enter at least a Target Limit Price or Stop Loss Trigger Price");
      return;
    }

    if (slLim > 0 && slTrig <= 0) {
      alert("Please enter SL Trigger Price if SL Limit Price is specified");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ slTriggerPrice: slTrig, slLimitPrice: slLim, tpPrice: tp, quantity: qty });
      onClose();
    } catch (_) {
    } finally {
      setSubmitting(false);
    }
  };

  const netQty = Number(position.netQty ?? position.quantity ?? 0);
  const liveLtp = quote?.ltp ?? Number(position.actvLtp || position.ltp || 0);

  let entryPrice = 0;
  if (netQty > 0) {
    entryPrice = Number(position.buyAvg || position.buyAvgPrice || position.averagePrice || 0);
  } else if (netQty < 0) {
    entryPrice = Number(position.sellAvg || position.buyAvgPrice || position.averagePrice || 0);
  } else {
    entryPrice = Number(position.buyAvg || position.sellAvg || position.averagePrice || 0);
  }

  const qtyNum = Number(quantity) || 0;
  const parsedTp = Number(tpPrice) || 0;
  const parsedSl = Number(slLimitPrice || slTriggerPrice) || 0;

  let projTpPnl = 0;
  let projTpPct = 0;
  if (parsedTp > 0) {
    projTpPnl = netQty > 0 ? (qtyNum * (parsedTp - entryPrice)) : (qtyNum * (entryPrice - parsedTp));
    projTpPct = entryPrice > 0 ? (netQty > 0 ? ((parsedTp - entryPrice) / entryPrice) * 100 : ((entryPrice - parsedTp) / entryPrice) * 100) : 0;
  }

  let projSlPnl = 0;
  let projSlPct = 0;
  if (parsedSl > 0) {
    projSlPnl = netQty > 0 ? (qtyNum * (parsedSl - entryPrice)) : (qtyNum * (entryPrice - parsedSl));
    projSlPct = entryPrice > 0 ? (netQty > 0 ? ((parsedSl - entryPrice) / entryPrice) * 100 : ((entryPrice - parsedSl) / entryPrice) * 100) : 0;
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-mono">
      <div className="bg-[#2b2d30] border border-[#393b40] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#1e1f22] border-b border-[#393b40] flex justify-between items-center">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                {position.scripRefKey || position.tradingSymbol || position.symbol}
              </h3>
              {isExistingOco && (
                <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                  Active Bracket
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Set OCO Bracket — Target & Stop Loss ({position.accountName || position.nickname || "Master"})
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg font-semibold cursor-pointer">
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Position Details */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-sans font-semibold">Qty</span>
              <span className="font-bold text-slate-100">{Math.abs(netQty)}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-sans font-semibold">Buy Executed Avg</span>
              <span className="font-bold text-slate-200">₹{entryPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-sans font-semibold">Current LTP</span>
              <span className="font-bold text-teal-400">₹{liveLtp.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Quantity */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase font-sans">Exit Order Quantity</label>
              <input
                type="number"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-[#1e1f22] border border-[#393b40] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Target Price */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase font-sans flex justify-between">
                <span>Target Limit Price (TP)</span>
                <span className="text-slate-500 font-normal">Optional</span>
              </label>
              <input
                type="number"
                step="0.05"
                placeholder="e.g. 140.00 (Optional)"
                value={tpPrice}
                onChange={(e) => setTpPrice(e.target.value)}
                className="w-full bg-[#1e1f22] border border-[#393b40] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* SL Trigger & Limit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase font-sans flex justify-between">
                  <span>SL Trigger Price</span>
                  <span className="text-slate-500 font-normal">Optional</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="e.g. 110.00 (Optional)"
                  value={slTriggerPrice}
                  onChange={(e) => setSlTriggerPrice(e.target.value)}
                  className="w-full bg-[#1e1f22] border border-[#393b40] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase font-sans flex justify-between">
                  <span>SL Limit Price</span>
                  <span className="text-teal-400/80 font-normal">Leave empty for SL-M</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  placeholder="Leave empty for SL Market"
                  value={slLimitPrice}
                  onChange={(e) => setSlLimitPrice(e.target.value)}
                  className="w-full bg-[#1e1f22] border border-[#393b40] rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Projected Profit and Loss Card */}
            {(parsedTp > 0 || parsedSl > 0) && (
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2 font-mono text-xs mt-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
                  <span>Projected P&L Breakdown</span>
                  <span className="text-[9px] text-slate-500 font-normal">Avg: ₹{entryPrice.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Target TP Projection */}
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-lg space-y-0.5">
                    <span className="text-[9px] text-emerald-400/80 uppercase font-sans font-bold block">Target Profit (TP)</span>
                    {parsedTp > 0 ? (
                      <div>
                        <span className={`font-bold text-xs ${projTpPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {projTpPnl >= 0 ? "+" : ""}₹{projTpPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-emerald-400/80 block font-sans font-semibold">
                          ({projTpPct >= 0 ? "+" : ""}{projTpPct.toFixed(2)}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Set TP Price</span>
                    )}
                  </div>

                  {/* Stop Loss SL Projection */}
                  <div className="bg-rose-950/20 border border-rose-500/20 p-2.5 rounded-lg space-y-0.5">
                    <span className="text-[9px] text-rose-400/80 uppercase font-sans font-bold block">Max Loss (SL)</span>
                    {parsedSl > 0 ? (
                      <div>
                        <span className={`font-bold text-xs ${projSlPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {projSlPnl >= 0 ? "+" : ""}₹{projSlPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-rose-400/80 block font-sans font-semibold">
                          ({projSlPct >= 0 ? "+" : ""}{projSlPct.toFixed(2)}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Set SL Price</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 border-t border-[#393b40] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#2b2d30] border border-[#393b40] hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !hasChanged}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md ${
                !hasChanged
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-teal-600 hover:bg-teal-500 text-white cursor-pointer shadow-teal-900/30"
              }`}
            >
              {submitting
                ? "SUBMITTING..."
                : isExistingOco
                ? (hasChanged ? "UPDATE OCO BRACKET" : "NO CHANGES DETECTED")
                : "CONFIRM OCO BRACKET"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── Quick Order Dialog ───────────────────────────────────────────────────────
function QuickOrderDialog({
  scrip,
  side,
  quote,
  onClose,
  onConfirm,
  slaveAccs,
  masterAcc,
  margins = [],
}: {
  scrip: ScripInfo;
  side: "BUY" | "SELL";
  quote?: QuoteData;
  onClose: () => void;
  onConfirm: (
    qty: number,
    price: number,
    orderType: "MARKET" | "LIMIT" | "SL",
    triggerPrice: number
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  slaveAccs: AccountSummary[];
  masterAcc?: AccountSummary;
  margins?: any[];
}) {
  const [qty, setQty] = useState(String(scrip.lotSize));
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "SL">("MARKET");
  const [limitPrice, setLimitPrice] = useState(
    quote ? String(quote.ltp) : "0"
  );
  const [triggerPrice, setTriggerPrice] = useState(
    quote ? String(quote.ltp) : "0"
  );

  const [dialogStatus, setDialogStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [feedbackText, setFeedbackText] = useState("");

  const [marginData, setMarginData] = useState<{
    unitPrice?: number;
    master?: { accountId: string; accountName: string; requiredMargin: number; availableMargin: number; sufficient: boolean };
    slaves?: Array<{ accountId: string; accountName: string; multiplier: number; quantity: number; requiredMargin: number; availableMargin: number; sufficient: boolean }>;
  } | null>(null);
  const [calculatingMargin, setCalculatingMargin] = useState(false);

  useEffect(() => {
    let active = true;
    setCalculatingMargin(true);
    const timer = setTimeout(async () => {
      try {
        const priceVal = orderType === "MARKET" ? (quote?.ltp || 0) : Number(limitPrice || 0);
        const res = await fetch("/api/orders/margin-required", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scriptToken: scrip.scriptToken,
            exchange: scrip.exchange,
            segment: scrip.segment,
            transactionType: side,
            orderType: orderType,
            price: priceVal,
            triggerPrice: Number(triggerPrice || 0),
            quantity: Number(qty || 1),
            product: "MIS",
          }),
        });
        if (res.ok && active) {
          const data = await res.json();
          setMarginData(data);
        }
      } catch (_) {
      } finally {
        if (active) setCalculatingMargin(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [scrip, side, quote, orderType, limitPrice, triggerPrice, qty]);

  const isBuy = side === "BUY";

  const handleExecute = async () => {
    setDialogStatus("submitting");
    try {
      const res = await onConfirm(
        Number(qty),
        orderType === "LIMIT" || orderType === "SL" ? Number(limitPrice) : 0,
        orderType,
        orderType === "SL" ? Number(triggerPrice) : 0
      );
      if (res.success) {
        setDialogStatus("success");
        setFeedbackText(res.message || "Order replicated successfully!");
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setDialogStatus("error");
        setFeedbackText(res.error || "Execution failed");
      }
    } catch (e: any) {
      setDialogStatus("error");
      setFeedbackText(e.message || "Unexpected failure occurred");
    }
  };

  if (dialogStatus === "success") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl w-full max-w-md my-auto p-6 text-center space-y-4 animate-fade-in font-mono">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wide">Trade Executed!</h3>
          <p className="text-xs text-emerald-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
            {feedbackText}
          </p>
          <div className="text-[10px] text-slate-500 animate-pulse">
            Closing dialog window in a moment...
          </div>
        </div>
      </div>
    );
  }

  if (dialogStatus === "error") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl w-full max-w-md my-auto p-6 text-center space-y-4 animate-fade-in font-mono">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100 uppercase tracking-wide text-rose-400">Order Rejected</h3>
          <p className="text-xs text-rose-300 leading-relaxed bg-rose-950/50 p-3 rounded-xl border border-rose-900/30">
            {feedbackText}
          </p>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setDialogStatus("idle")}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer transition-all"
            >
              Modify Order Details
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-xl border border-rose-500/20 cursor-pointer transition-all"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
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
                {scrip.scripRefKey || scrip.tradingSymbol}
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

          {/* Broker Margin & Funds Breakdown (Live Broker API Call) */}
          {(() => {
            const unitPrice = orderType === "MARKET" ? (quote?.ltp || 0) : Number(limitPrice || 0);
            const masterQtyNum = Number(qty || 0);

            const masterReq = marginData?.master?.requiredMargin ?? (masterQtyNum * unitPrice);
            const masterAvail = marginData?.master?.availableMargin ?? (margins.find((m) => m.accountId === masterAcc?.id || m.role === "master")?.availableMargin || 0);
            const masterSuff = marginData?.master?.sufficient ?? (masterAvail >= masterReq);

            const fmtVal = (val: number) =>
              val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            return (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Wallet className="w-3.5 h-3.5 text-teal-400" />
                    <span>Broker Live Margin API Check</span>
                  </div>
                  {calculatingMargin ? (
                    <span className="text-[10px] text-teal-400 animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Fetching broker API...
                    </span>
                  ) : (
                    unitPrice > 0 && (
                      <span className="text-[10px] text-slate-400">
                        Price: ₹{fmtVal(unitPrice)}
                      </span>
                    )
                  )}
                </div>

                {/* Master Account Funds */}
                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">
                      Master ({masterAcc?.nickname || "Master Account"}):
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        masterSuff
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {masterSuff ? "Sufficient Funds" : "Insufficient Margin"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Broker Req: <strong className="text-slate-200">₹{fmtVal(masterReq)}</strong> ({masterQtyNum} qty)</span>
                    <span>Avail: <strong className="text-slate-200">₹{fmtVal(masterAvail)}</strong></span>
                  </div>
                </div>

                {/* Slave Accounts Funds */}
                {slaveAccs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                      Slave Copying Broker Margin Status
                    </span>
                    {slaveAccs.map((s) => {
                      const slaveApiData = marginData?.slaves?.find((sl) => sl.accountId === s.id);
                      const slaveQty = slaveApiData?.quantity ?? Math.max(1, Math.round(masterQtyNum * (s.multiplier || 1)));
                      const slaveReq = slaveApiData?.requiredMargin ?? (slaveQty * unitPrice);
                      const sMargin = margins.find((m) => m.accountId === s.id || m.accountName === s.nickname);
                      const slaveAvail = slaveApiData?.availableMargin ?? (sMargin ? Number(sMargin.availableMargin || 0) : 0);
                      const sSuff = slaveApiData?.sufficient ?? (slaveAvail >= slaveReq);

                      return (
                        <div key={s.id} className="bg-slate-900/50 border border-slate-800/60 p-2 rounded-lg text-[11px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-300 font-semibold">{s.nickname} ({s.multiplier}x — {slaveQty} qty):</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                sSuff
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {sSuff ? "Sufficient" : "Margin Shortfall"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Broker Req: <strong className="text-slate-200">₹{fmtVal(slaveReq)}</strong></span>
                            <span>Avail: <strong className="text-slate-200">₹{fmtVal(slaveAvail)}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            disabled={dialogStatus === "submitting"}
            onClick={handleExecute}
            className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60 ${isBuy
              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
              : "bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-lg shadow-rose-500/20"
              }`}
          >
            {dialogStatus === "submitting" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            <span>
              {dialogStatus === "submitting"
                ? "EXECUTING REPLICAS..."
                : `CONFIRM ${side} — ${scrip.scripRefKey || scrip.tradingSymbol}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// ScripManagerModal Component
// ─────────────────────────────────────────────────────────────────────────────
interface ScripManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scripStatus: ScripStatusState;
  loadingCategoryKey: string | null;
  clearingCategoryKey: string | null;
  isLoadingAll: boolean;
  hasActiveAccount: boolean;
  onLoadCategory: (key?: string) => void;
  onClearCategory: (key?: string) => void;
  scripCacheStatus: { isCached: boolean; count: number };
  cachingScrips: boolean;
  onCacheScrips: () => void;
}

const ScripManagerModal: React.FC<ScripManagerModalProps> = ({
  isOpen,
  onClose,
  scripStatus,
  loadingCategoryKey,
  clearingCategoryKey,
  isLoadingAll,
  hasActiveAccount,
  onLoadCategory,
  onClearCategory,
  scripCacheStatus,
  cachingScrips,
  onCacheScrips,
}) => {
  if (!isOpen) return null;

  const categories = scripStatus.categories || [];
  const totalCount = scripStatus.totalCount ?? scripStatus.count ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl my-auto overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/60 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Scrip Master Manager
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-medium">
                  {totalCount.toLocaleString()} loaded
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Selectively download or clear scrip categories from Kotak Securities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toolbar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400">
            {!hasActiveAccount && (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Login an active account to download scrips
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLoadCategory()}
              disabled={isLoadingAll || !hasActiveAccount}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-medium transition disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 ${isLoadingAll ? "animate-spin" : ""}`} />
              {isLoadingAll ? "Downloading All..." : "Load All Categories"}
            </button>
            <button
              type="button"
              onClick={() => onClearCategory()}
              disabled={isLoadingAll || totalCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium transition disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Scrips
            </button>
            <button
              type="button"
              onClick={onCacheScrips}
              disabled={isLoadingAll || cachingScrips || totalCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium transition disabled:opacity-50"
              title="Load all database scrips into RAM memory cache for sub-millisecond lightning fast searches."
            >
              <Database className={`w-3.5 h-3.5 ${cachingScrips ? "animate-spin" : ""}`} />
              {cachingScrips ? "Caching RAM..." : scripCacheStatus.isCached ? `In RAM: ${scripCacheStatus.count.toLocaleString()}` : "Cache to RAM"}
            </button>
          </div>
        </div>

        {/* Category List */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[60vh] overflow-y-auto">
          {categories.map((cat) => {
            const isLoadingThis = loadingCategoryKey === cat.key;
            const isClearingThis = clearingCategoryKey === cat.key;

            return (
              <div
                key={cat.key}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100">{cat.label}</h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                        {cat.exchange}
                      </span>
                      <span>{cat.segment}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {cat.isLoaded ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {cat.count.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                        Not Loaded
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => onLoadCategory(cat.key)}
                    disabled={isLoadingThis || isClearingThis || !hasActiveAccount}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${isLoadingThis ? "animate-spin" : ""}`} />
                    {isLoadingThis ? "Loading..." : "Load File"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onClearCategory(cat.key)}
                    disabled={isLoadingThis || isClearingThis || !cat.isLoaded}
                    className="inline-flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 border border-slate-700 hover:border-rose-500/30 text-xs transition disabled:opacity-30"
                    title={`Clear ${cat.label} from DB`}
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${isClearingThis ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            DB Total: <strong className="text-slate-300 font-mono">{totalCount.toLocaleString()}</strong> |{" "}
            RAM Cache: <strong className={scripCacheStatus.isCached ? "text-indigo-400 font-mono font-bold" : "text-slate-500 font-mono"}>{scripCacheStatus.isCached ? `${scripCacheStatus.count.toLocaleString()} Active` : "Inactive"}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // ── Main Screen View State ──
  const [mainScreen, setMainScreen] = useState<"terminal" | "orders" | "accounts" | "logs">("terminal");

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
  const [theme, setTheme] = useState<"classic" | "modern" | "cyberpunk">(
    () => (localStorage.getItem("neo-theme") as "classic" | "modern" | "cyberpunk") || "classic"
  );

  const [currentFavicon, setCurrentFavicon] = useState<string>(() => {
    return localStorage.getItem("neo-favicon") || "default";
  });

  const faviconOptions = [
    { key: "default", name: "NC Monogram", url: `${import.meta.env.BASE_URL}favicon.svg` },
    { key: "A", name: "Sync Circle", url: `${import.meta.env.BASE_URL}favicon_option_A.svg` },
    { key: "B", name: "Twin Pillars", url: `${import.meta.env.BASE_URL}favicon_option_B.svg` },
    { key: "C", name: "Infinity Copy", url: `${import.meta.env.BASE_URL}favicon_option_C.svg` },
    { key: "D", name: "Hexagon Copier", url: `${import.meta.env.BASE_URL}favicon_option_D.svg` }
  ];

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
  const [savingAccount, setSavingAccount] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [loggingInAccountId, setLoggingInAccountId] = useState<string | null>(null);
  const [togglingPower, setTogglingPower] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(
    () => localStorage.getItem("admin-token")
  );
  const [loginPassword, setLoginPassword] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

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
  const [editingOrder, setEditingOrder] = useState<TradeOrder | null>(null);
  const [modifyingOrderId, setModifyingOrderId] = useState<string | null>(null);

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
  const [activeOcos, setActiveOcos] = useState<any[]>([]);
  const [selectedOcoPosition, setSelectedOcoPosition] = useState<any | null>(null);

  // ── NEW: Search ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ScripInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scripStatus, setScripStatus] = useState<ScripStatusState>({
    loaded: false,
    totalCount: 0,
    categories: [],
  });
  const [loadingCategoryKey, setLoadingCategoryKey] = useState<string | null>(null);
  const [clearingCategoryKey, setClearingCategoryKey] = useState<string | null>(null);
  const [isScripModalOpen, setIsScripModalOpen] = useState(false);
  const [isLoadingScrips, setIsLoadingScrips] = useState(false);
  const [scripCacheStatus, setScripCacheStatus] = useState<{ isCached: boolean; count: number }>({ isCached: false, count: 0 });
  const [cachingScrips, setCachingScrips] = useState(false);
  const [subscribeOnSearch, setSubscribeOnSearch] = useState<boolean>(() => (localStorage.getItem("neo-subscribe-on-search") ?? "true") === "true");

  // ── NEW: Watchlist ────────────────────────────────────────────────────────
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  // ── NEW: Live quotes (WS + SSE fallback) ──────────────────────────────────
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [sseConnected, setSseConnected] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const sseTokensRef = useRef<string[]>([]);
  const [streamTokenCount, setStreamTokenCount] = useState(0);

  const [useWebSocket, setUseWebSocket] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const feedRef = useRef<KotakLiveFeed | null>(null);
  const webSocketTokensRef = useRef<string[]>([]);

  // ── NEW: Quick order dialog ───────────────────────────────────────────────
  const [orderDialog, setOrderDialog] = useState<{
    scrip: ScripInfo;
    side: "BUY" | "SELL";
  } | null>(null);

  // Listen to global unauthorized events to prompt login screen
  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthToken(null);
    };
    window.addEventListener("admin-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("admin-unauthorized", handleUnauthorized);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) return;
    setAuthenticating(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        localStorage.setItem("admin-token", d.token);
        setAuthToken(d.token);
        showNotification("Authenticated successfully", "success");
      } else {
        showNotification(d.error || "Invalid password", "error");
      }
    } catch (_) {
      showNotification("Failed to connect to backend auth", "error");
    } finally {
      setAuthenticating(false);
    }
  };

  // Auto-dismiss guide after 10 seconds
  useEffect(() => {
    if (showHelp) {
      const timer = setTimeout(() => {
        setShowHelp(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showHelp]);

  // Intercept all API fetch calls for 401 Unauthorized -> auto logout to login screen
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const currentToken = localStorage.getItem("admin-token");
        if (currentToken) {
          console.warn("[Auth] Received 401 Unauthorized from API. Redirecting to login...");
          localStorage.removeItem("admin-token");
          setAuthToken(null);
          showNotification("Session expired. Please log in again.", "error");
        }
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

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
    if (!authToken) return;
    fetchSettings();
    fetchPowerStatus();
    fetchAccounts();
    fetchOrders();
    fetchWatchlist();
    fetchScripStatus();
    fetchScripCacheStatus();
    fetchMargins();
    fetchPositions();
    fetchActiveOcos();
    const totpInterval = setInterval(fetchTotpPreviews, 15000);
    return () => clearInterval(totpInterval);
  }, [authToken]);

  useEffect(() => {
    if (accounts.length > 0) fetchTotpPreviews();
  }, [accounts]);

  // ─────────────────────────────────────────────────────────────────────────
  // WS & SSE subscription management
  // ─────────────────────────────────────────────────────────────────────────
  const unsubscribeAll = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    sseTokensRef.current = [];
    setSseConnected(false);

    if (feedRef.current) {
      feedRef.current.disconnect();
      feedRef.current = null;
    }
    webSocketTokensRef.current = [];
    setWsConnected(false);

    setStreamTokenCount(0);
  }, []);

  const mapToNeoExchange = (exchange: string): string => {
    const e = (exchange || "").toUpperCase();
    if (e === "NSE") return "nse_cm";
    if (e === "BSE") return "bse_cm";
    if (e === "NFO") return "nse_fo";
    if (e === "BFO") return "bse_fo";
    if (e === "CDS" || e === "CDE") return "cde_fo";
    if (e === "MCX") return "mcx_fo";
    return e.toLowerCase();
  };

  const lookupInstrument = useCallback((token: string) => {
    if (token === "Nifty 50") return { exchange_segment: "nse_cm", instrument_token: "Nifty 50", isIndex: true };
    if (token === "SENSEX") return { exchange_segment: "bse_cm", instrument_token: "SENSEX", isIndex: true };

    const searchItem = searchResults.find(s => s.scriptToken === token);
    if (searchItem) {
      return {
        exchange_segment: mapToNeoExchange(searchItem.exchange),
        instrument_token: token,
        isIndex: false
      };
    }

    const watchItem = watchlist.find(w => w.scriptToken === token);
    if (watchItem) {
      return {
        exchange_segment: mapToNeoExchange(watchItem.exchange),
        instrument_token: token,
        isIndex: false
      };
    }

    for (const acc of positions) {
      const posItem = (acc.positions || []).find((p: any) => p.scriptToken === token);
      if (posItem) {
        return {
          exchange_segment: mapToNeoExchange(posItem.exchange),
          instrument_token: token,
          isIndex: false
        };
      }
    }

    return { exchange_segment: "nse_cm", instrument_token: token, isIndex: false };
  }, [searchResults, watchlist, positions]);

  const fetchFeedCredentials = async () => {
    try {
      const res = await fetch("/api/accounts/feed-credentials");
      if (!res.ok) throw new Error("Failed to fetch feed credentials");
      return await res.json();
    } catch (err) {
      console.error("Error fetching feed credentials:", err);
      return null;
    }
  };

  const initWebSocket = useCallback((creds: any, onConnect: () => void) => {
    if (feedRef.current) return feedRef.current;

    const feed = new KotakLiveFeed({
      accessToken: creds.accessToken,
      sid: creds.sid,
      serverId: creds.serverId,
      dataCenter: creds.dataCenter
    });

    feed.onStatus((connected) => {
      setWsConnected(connected);
      if (connected) {
        onConnect();
      }
    });

    feed.onTick((tick) => {
      setQuotes((prev) => {
        const next = { ...prev };
        next[tick.token] = {
          ltp: tick.ltp,
          change: tick.change,
          changePct: tick.changePct,
          prevLtp: prev[tick.token]?.ltp
        };
        return next;
      });
    });

    feed.connect();
    feedRef.current = feed;
    return feed;
  }, []);

  const subscribeToTokens = useCallback(async (tokens: string[]) => {
    if (!powerOn || !authToken) {
      unsubscribeAll();
      return;
    }

    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    if (!uniqueTokens.length) {
      unsubscribeAll();
      return;
    }

    if (useWebSocket) {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
        setSseConnected(false);
        sseTokensRef.current = [];
      }

      let feed = feedRef.current;
      if (!feed) {
        const creds = await fetchFeedCredentials();
        if (!creds) {
          console.warn("[Feed] Could not fetch feed credentials, falling back to SSE");
          setUseWebSocket(false);
          setTimeout(() => subscribeToTokens(tokens), 0);
          return;
        }

        feed = initWebSocket(creds, () => {
          const insts: any[] = [];
          const idxs: any[] = [];
          for (const t of uniqueTokens) {
            const inst = lookupInstrument(t);
            if (inst.isIndex) {
              idxs.push({ exchange_segment: inst.exchange_segment, instrument_token: inst.instrument_token });
            } else {
              insts.push({ exchange_segment: inst.exchange_segment, instrument_token: inst.instrument_token });
            }
          }
          if (idxs.length) feed?.subscribe(idxs, true);
          if (insts.length) feed?.subscribe(insts, false);
          webSocketTokensRef.current = uniqueTokens;
          setStreamTokenCount(uniqueTokens.length);
        });
        return;
      }

      if (feed.isConnected) {
        const currentTokens = webSocketTokensRef.current;
        const newTokens = uniqueTokens;

        const toAdd = newTokens.filter(t => !currentTokens.includes(t));
        const toRemove = currentTokens.filter(t => !newTokens.includes(t));

        const addScrips: any[] = [];
        const addIndexes: any[] = [];
        const removeScrips: any[] = [];
        const removeIndexes: any[] = [];

        for (const t of toAdd) {
          const inst = lookupInstrument(t);
          if (inst.isIndex) {
            addIndexes.push({ exchange_segment: inst.exchange_segment, instrument_token: inst.instrument_token });
          } else {
            addScrips.push({ exchange_segment: inst.exchange_segment, instrument_token: inst.instrument_token });
          }
        }

        for (const t of toRemove) {
          const inst = lookupInstrument(t);
          if (inst.isIndex) {
            removeIndexes.push({ exchange_segment: inst.exchange_segment, instrument_token: inst.instrument_token });
          } else {
            removeScrips.push({ exchange_segment: inst.exchange_segment, instrument_token: inst.instrument_token });
          }
        }

        if (addIndexes.length) feed.subscribe(addIndexes, true);
        if (addScrips.length) feed.subscribe(addScrips, false);
        if (removeIndexes.length) feed.unsubscribe(removeIndexes, true);
        if (removeScrips.length) feed.unsubscribe(removeScrips, false);

        webSocketTokensRef.current = newTokens;
        setStreamTokenCount(newTokens.length);
      }
    } else {
      if (feedRef.current) {
        feedRef.current.disconnect();
        feedRef.current = null;
        setWsConnected(false);
        webSocketTokensRef.current = [];
      }

      const sorted = uniqueTokens.sort().join(",");
      const prevSorted = [...new Set(sseTokensRef.current)].sort().join(",");
      const currentReadyState = sseRef.current?.readyState;
      if (sorted === prevSorted && (currentReadyState === EventSource.OPEN || currentReadyState === EventSource.CONNECTING)) return;

      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
        setSseConnected(false);
      }

      sseTokensRef.current = uniqueTokens;
      setStreamTokenCount(uniqueTokens.length);
      const es = new EventSource(`/api/quotes/stream?tokens=${sorted}&token=${authToken || ''}`);
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
    }
  }, [unsubscribeAll, powerOn, authToken, useWebSocket, initWebSocket, lookupInstrument]);

  // Subscribe to watchlist tokens, search result tokens, active positions, plus Nifty and Sensex indices
  useEffect(() => {
    if (!authToken) return;
    const watchlistTokens = watchlist.map((w) => w.scriptToken);
    const searchTokens = (leftTab === "search" && subscribeOnSearch) ? searchResults.map((s) => s.scriptToken) : [];
    const dialogToken = orderDialog ? [orderDialog.scrip.scriptToken] : [];
    const positionTokens = positions.flatMap((acc) => (acc.positions || []).map((p: any) => p.scriptToken));
    const allTokens = [...new Set([...watchlistTokens, ...searchTokens, ...dialogToken, ...positionTokens, "Nifty 50", "SENSEX"])];
    subscribeToTokens(allTokens);
  }, [watchlist, searchResults, positions, leftTab, subscribeToTokens, powerOn, authToken, subscribeOnSearch, orderDialog]);

  // Fetch margins and positions when positions tab or terminal screen is loaded with smooth background polling (every 3s)
  useEffect(() => {
    if (!authToken || !powerOn) return;
    if (leftTab !== "positions" && mainScreen !== "terminal" && !orderDialog) return;

    fetchMargins(false);
    fetchPositions(false);
    if (leftTab === "positions") {
      fetchActiveOcos();
    }

    const interval = setInterval(() => {
      fetchPositions(false);
      fetchMargins(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [leftTab, mainScreen, orderDialog, authToken, powerOn]);

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

  useEffect(() => {
    const option = faviconOptions.find(opt => opt.key === currentFavicon) || faviconOptions[0];
    let url = option.url;
    if (currentFavicon === "default" && theme === "modern") {
      url = `${import.meta.env.BASE_URL}favicon_light.svg`;
    }
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = url;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.type = "image/svg+xml";
      newLink.href = url;
      document.head.appendChild(newLink);
    }
    localStorage.setItem("neo-favicon", currentFavicon);
  }, [currentFavicon, theme]);

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
    let active = true;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (res.ok && active) {
          const data = await res.json();
          setSearchResults(data.results || []);
          // Merge search quotes into existing state instead of replacing
          setQuotes((prev) => ({ ...prev, ...(data.quotes || {}) }));
        }
      } catch (_) {
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
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

  const handleToggleFavicon = () => {
    setCurrentFavicon((prev) => {
      const idx = faviconOptions.findIndex((opt) => opt.key === prev);
      const nextIdx = (idx + 1) % faviconOptions.length;
      const nextOpt = faviconOptions[nextIdx];
      showNotification(`Favicon updated to: ${nextOpt.name}`, "success");
      return nextOpt.key;
    });
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
    setTogglingPower(true);
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
    } finally {
      setTogglingPower(false);
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

  const fetchScripCacheStatus = async () => {
    try {
      const r = await fetch("/api/scrips/cache/status");
      if (r.ok) {
        setScripCacheStatus(await r.json());
      }
    } catch (_) { }
  };

  const handleCacheScrips = async () => {
    setCachingScrips(true);
    try {
      const r = await fetch("/api/scrips/cache", { method: "POST" });
      const d = await r.json();
      if (r.ok && d.success) {
        setScripCacheStatus(d.status);
        showNotification(`Successfully cached ${d.count.toLocaleString()} scrips to RAM for fast searches`, "success");
      } else {
        showNotification(d.error || "Failed to cache scrips", "error");
      }
    } catch (_) {
      showNotification("Network error during caching", "error");
    } finally {
      setCachingScrips(false);
    }
  };

  const fetchMargins = async (showLoading = false) => {
    if (showLoading) setLoadingMargins(true);
    try {
      const r = await fetch("/api/accounts/margins");
      if (r.ok) {
        setMargins(await r.json());
      }
    } catch (_) {
    } finally {
      if (showLoading) setLoadingMargins(false);
    }
  };

  const fetchPositions = async (showLoading = false) => {
    if (showLoading) setLoadingPositions(true);
    try {
      const r = await fetch("/api/accounts/positions");
      if (r.ok) {
        setPositions(await r.json());
      }
    } catch (_) {
    } finally {
      if (showLoading) setLoadingPositions(false);
    }
  };

  const fetchActiveOcos = async () => {
    try {
      const res = await fetch("/api/positions/oco/active");
      if (res.ok) {
        setActiveOcos(await res.json());
      }
    } catch (err) {
      console.error("Error fetching active OCO brackets:", err);
    }
  };

  const handleCancelOco = async (ocoId: string) => {
    if (!window.confirm("Are you sure you want to cancel this Stop Loss / Target bracket?")) {
      return;
    }
    try {
      const res = await fetch(`/api/positions/oco/${ocoId}`, { method: "DELETE" });
      if (res.ok) {
        showNotification("OCO Bracket cancelled successfully", "success");
        fetchActiveOcos();
      } else {
        const data = await res.json();
        showNotification(data.error || "Failed to cancel bracket", "error");
      }
    } catch (_) {
      showNotification("Error cancelling OCO bracket", "error");
    }
  };

  const handleSubmitOco = async (data: {
    slTriggerPrice: number;
    slLimitPrice: number;
    tpPrice: number;
    quantity: number;
  }) => {
    if (!selectedOcoPosition) return;
    try {
      const activeAccId = selectedOcoPosition.accountId || masterAcc?.id || (accounts.find((a) => a.status === "active")?.id);
      const body = {
        accountId: activeAccId,
        symbol: selectedOcoPosition.symbol,
        segment: selectedOcoPosition.segment,
        quantity: data.quantity,
        slTriggerPrice: data.slTriggerPrice,
        slLimitPrice: data.slLimitPrice,
        tpPrice: data.tpPrice,
        transactionType: selectedOcoPosition.netQty > 0 ? "SELL" : "BUY"
      };

      const res = await fetch("/api/positions/oco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        showNotification("SL & Target Bracket orders placed successfully", "success");
        fetchActiveOcos();
      } else {
        const errData = await res.json();
        showNotification(errData.detail || errData.error || "Failed to place bracket orders", "error");
      }
    } catch (_) {
      showNotification("Error placing bracket orders", "error");
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

  const toggleSubscribeOnSearch = () => {
    setSubscribeOnSearch((prev) => {
      const next = !prev;
      localStorage.setItem("neo-subscribe-on-search", String(next));
      return next;
    });
  };

  const handleLoadScripCategory = async (categoryKey?: string) => {
    if (categoryKey) {
      setLoadingCategoryKey(categoryKey);
    } else {
      setIsLoadingScrips(true);
    }
    try {
      const r = await fetch("/api/scrips/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryKey ? { category: categoryKey } : {}),
      });
      const d = await r.json();
      if (r.ok) {
        if (d.status) setScripStatus(d.status);
        else fetchScripStatus();
        fetchScripCacheStatus();
        const loadedCount = d.count ?? d.totalCount ?? 0;
        showNotification(
          categoryKey
            ? `Loaded ${loadedCount.toLocaleString()} scrips for category`
            : `Scrip master loaded (${loadedCount.toLocaleString()})`,
          "success"
        );
      } else {
        showNotification(d.detail || d.error || "Failed to load scrips", "error");
      }
    } catch (_) {
      showNotification("Failed to load scrips", "error");
    } finally {
      setLoadingCategoryKey(null);
      setIsLoadingScrips(false);
    }
  };

  const handleClearScripCategory = async (categoryKey?: string) => {
    if (categoryKey) {
      setClearingCategoryKey(categoryKey);
    } else {
      setIsLoadingScrips(true);
    }
    try {
      const r = await fetch("/api/scrips/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryKey ? { category: categoryKey } : {}),
      });
      const d = await r.json();
      if (r.ok) {
        if (d.status) setScripStatus(d.status);
        else fetchScripStatus();
        fetchScripCacheStatus();
        showNotification(
          categoryKey ? `Cleared category scrips` : `Cleared all scrips from database`,
          "info"
        );
      } else {
        showNotification(d.detail || d.error || "Failed to clear scrips", "error");
      }
    } catch (_) {
      showNotification("Failed to clear scrips", "error");
    } finally {
      setClearingCategoryKey(null);
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
    setSavingAccount(true);
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
    } finally {
      setSavingAccount(false);
    }
  };

  const handleEditAccount = (acc: AccountSummary) => {
    setEditingAccountId(acc.id);
    setNickname(acc.nickname);
    setRole(acc.role);
    setMobileNumber(acc.mobileNumber);
    setUcc(acc.ucc);
    setMultiplier(acc.multiplier);
    setMpin(acc.mpin || "");
    setConsumerKey(acc.consumerKey || "");
    setTotpSecret(acc.totpSecret || "");
    setShowAddForm(true);
    setLeftTab("accounts");
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`Remove account '${name}'?`)) return;
    setDeletingAccountId(id);
    try {
      const r = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (r.ok) {
        showNotification(`Account '${name}' removed`, "success");
        fetchAccounts();
      }
    } catch (_) {
      showNotification("Failed to delete account", "error");
    } finally {
      setDeletingAccountId(null);
    }
  };

  const handleLoginAccount = async (acc: AccountSummary) => {
    setLoggingInAccountId(acc.id);
    try {
      let manualOtp = "";
      if (!acc.hasAutoTotpSecret) {
        const enteredOtp = window.prompt(
          `Enter current 6-digit Kotak TOTP for ${acc.nickname}`
        );
        if (!enteredOtp) {
          setLoggingInAccountId(null);
          return;
        }
        manualOtp = enteredOtp.replace(/\D/g, "");
        if (manualOtp.length !== 6) {
          showNotification("Enter a valid 6-digit TOTP", "error");
          setLoggingInAccountId(null);
          return;
        }
      }

      const r = await fetch(`/api/accounts/${acc.id}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manualOtp }),
      });
      const d = await r.json();
      if (d.success) {
        showNotification(`Session active for ${acc.nickname}`, "success");
        // Refetch feed credentials and update the WebSocket stream if running
        fetchFeedCredentials().then((creds) => {
          if (creds && feedRef.current) {
            console.log("[Feed] Updating WebSocket credentials after login");
            feedRef.current.updateCredentials({
              accessToken: creds.accessToken,
              sid: creds.sid,
              serverId: creds.serverId,
              dataCenter: creds.dataCenter
            });
          }
        });
      } else {
        showNotification(`Auth failed for ${acc.nickname}: ${d.error}`, "error");
      }

      // Update only the logged-in account in the local state instead of reloading all
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === acc.id
            ? {
              ...a,
              status: d.status,
              errorMessage: d.error,
              lastLogin: d.lastLogin,
            }
            : a
        )
      );
    } catch (_) {
      showNotification("Network error during login", "error");
    } finally {
      setLoggingInAccountId(null);
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
      const err = "Configure and login to a Master account first";
      showNotification(err, "error");
      setSubmittingOrder(false);
      return { success: false, error: err };
    }
    if (masterAcc.status !== "active") {
      const err = "Master account must be Active before placing trades";
      showNotification(err, "error");
      setSubmittingOrder(false);
      return { success: false, error: err };
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
        const successMsg = `Trade executed! Master ID: ${d.masterOrder.id}. Copied to ${d.slaveOrders.length} slave(s).`;
        showNotification(successMsg, "success");
        fetchOrders();
        fetchPositions();
        fetchMargins();
        return { success: true, message: successMsg };
      } else {
        const errorMsg = d.masterOrder.errorMessage || "Rejected by broker";
        showNotification(`Order failed: ${errorMsg}`, "error");
        return { success: false, error: errorMsg };
      }
    } catch (_) {
      const networkErr = "Failed to execute order due to connection issues";
      showNotification(networkErr, "error");
      return { success: false, error: networkErr };
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
    if (!orderDialog) return { success: false, error: "No active order frame context" };
    const { scrip, side } = orderDialog;

    const res = await placeOrderCore(
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
    return res;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Order log grouping
  // ─────────────────────────────────────────────────────────────────────────
  const masterOrders = orders.filter((o) => o.accountRole === "master");
  const completedMasterOrders = masterOrders.filter(
    (o) => o.status === "SUCCESS" || o.status === "CANCELLED" || o.status === "FAILED"
  );
  const pendingMasterOrders = masterOrders.filter((o) => o.status === "PENDING");
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

  // Modify a pending order
  const handleModifyOrder = async (
    orderId: string,
    updates: { price?: number; triggerPrice?: number; quantity?: number; orderType?: string }
  ) => {
    setModifyingOrderId(orderId);
    try {
      const r = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        showNotification("Order modified successfully", "success");
        setEditingOrder(null);
        fetchOrders();
      } else {
        showNotification(`Modification failed: ${d.detail || d.error || "Unknown error"}`, "error");
      }
    } catch (_) {
      showNotification("Failed to send order modification request", "error");
    } finally {
      setModifyingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order record? This will remove the master order and all copy logs.")) return;
    try {
      const r = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      const d = await r.json();
      if (r.ok && d.success) {
        showNotification("Order record deleted", "info");
        fetchOrders();
      } else {
        showNotification(`Delete failed: ${d.error || "Unknown error"}`, "error");
      }
    } catch (_) {
      showNotification("Failed to delete order record", "error");
    }
  };

  const handleClearOrders = async () => {
    if (!confirm("🚨 WARNING: This will permanently delete all order logs and replication copy histories. Proceed?")) return;
    try {
      const r = await fetch("/api/orders", { method: "DELETE" });
      const d = await r.json();
      if (r.ok && d.success) {
        showNotification("All order records cleared", "success");
        fetchOrders();
      } else {
        showNotification(`Clear failed: ${d.error || "Unknown error"}`, "error");
      }
    } catch (_) {
      showNotification("Failed to clear order records", "error");
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
  if (!authToken) {
    return (
      <div
        id="neo-copier-auth"
        className={`min-h-screen bg-slate-900 text-slate-100 font-sans flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white transition-colors duration-300 ${theme === "modern" ? "theme-modern" : theme === "cyberpunk" ? "theme-cyberpunk" : ""
          }`}
      >
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 w-full max-w-md space-y-6 shadow-2xl relative">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-100 uppercase terminal-cursor">
              Neo-Copier Login
            </h1>
            <p className="text-xs text-slate-400">
              Enter admin dashboard password to proceed
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 font-medium mb-1">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="e.g. admin"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={authenticating}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 rounded-lg text-sm font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              {authenticating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{authenticating ? "Authenticating..." : "Unlock Dashboard"}</span>
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800/60">
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Your friendly neighbourhood dev <code className="bg-slate-900 px-1 py-0.5 rounded text-teal-400">Pavan</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      showNotification("Settings updated", "success");
    } catch (_) {
      showNotification("Failed to update settings", "error");
    }
  };

  const isStarred = (token: string) => watchlist.some((w) => w.scriptToken === token);

  return (
    <div
      id="neo-copier-dashboard"
      className={`min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-teal-500 selection:text-white transition-colors duration-300 ${
        theme === "modern" ? "theme-modern" : theme === "cyberpunk" ? "theme-cyberpunk" : ""
      }`}
    >
      {/* Notification Banner */}
      {actionStatus && (
        <div
          id="notification-banner"
          className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 p-4 rounded-xl flex items-start gap-3 border shadow-2xl transition-all max-w-sm sm:max-w-md backdrop-blur-md ${
            actionStatus.type === "success"
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

      {/* Top Navbar with Multi-Screen Switcher & Tickers */}
      <Navbar
        activeScreen={mainScreen}
        onSelectScreen={setMainScreen}
        quotes={quotes}
        powerOn={powerOn}
        onTogglePower={togglePower}
        theme={theme}
        onCycleTheme={() =>
          setTheme((t) => (t === "classic" ? "modern" : t === "modern" ? "cyberpunk" : "classic"))
        }
        pendingOrdersCount={pendingMasterOrders.length}
        masterAccount={masterAcc}
        authToken={authToken}
        onLogout={() => {
          localStorage.removeItem("admin-token");
          setAuthToken(null);
        }}
      />

      {/* Main Multi-Screen Content Container */}
      <main className="max-w-[1700px] mx-auto px-4 py-6">
        {mainScreen === "terminal" && (
          <TerminalView
            watchlist={watchlist}
            searchResults={searchResults}
            isSearching={isSearching}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            onSearchSubmit={(e: React.FormEvent) => e.preventDefault()}
            onToggleWatchlist={handleToggleWatchlist}
            isStarred={isStarred}
            scripStatus={scripStatus}
            onOpenScripModal={() => setIsScripModalOpen(true)}
            subscribeOnSearch={subscribeOnSearch}
            onToggleSubscribeOnSearch={toggleSubscribeOnSearch}
            onTabChange={(tab) => setLeftTab(tab === "search" ? "search" : "watchlist")}
            quotes={quotes}
            onOpenQuickOrder={(scrip: ScripInfo, side: "BUY" | "SELL") => setOrderDialog({ scrip, side })}
            masterAcc={masterAcc}
            slaveAccs={slaveAccs}
            margins={margins}
            loadingMargins={loadingMargins}
            onFetchMargins={() => fetchMargins(true)}
            positions={positions}
            loadingPositions={loadingPositions}
            onFetchPositions={() => fetchPositions(true)}
            exitingAll={exitingAll}
            onExitAllPositions={handleExitAllPositions}
            exitingPositionId={exitingPositionId}
            onExitPosition={(pos: any) => handleExitPosition(pos.accountId, pos.symbol, pos.netQty, pos.segment, pos.exchange)}
            onOpenOcoDialog={(pos: any) => setSelectedOcoPosition(pos)}
          />
        )}

        {mainScreen === "orders" && (
          <OrdersView
            orders={orders}
            loadingOrders={loadingOrders}
            onFetchOrders={fetchOrders}
            syncingOrders={syncingOrders}
            onSyncOrderStatus={handleSyncOrderStatus}
            cancellingOrderId={cancellingOrderId}
            onCancelOrder={handleCancelOrder}
            onOpenEditModal={(order: TradeOrder) => setEditingOrder(order)}
            onDeleteOrderRecord={handleDeleteOrder}
            onClearAllOrderLogs={handleClearOrders}
            modifyingOrderId={modifyingOrderId}
          />
        )}

        {mainScreen === "accounts" && (
          <AccountsView
            masterAcc={masterAcc}
            slaveAccs={slaveAccs}
            onLoginAccount={handleLoginAccount}
            onEditAccount={handleEditAccount}
            onDeleteAccount={handleDeleteAccount}
            onOpenAddModal={(roleType: "master" | "slave") => {
              setRole(roleType);
              setShowAddForm(true);
            }}
            loggingInAccountId={loggingInAccountId}
            deletingAccountId={deletingAccountId}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            scripStatus={scripStatus}
            onOpenScripModal={() => setIsScripModalOpen(true)}
          />
        )}

        {mainScreen === "logs" && (
          <LogsView
            backendLogs={backendLogs}
            loadingLogs={loadingLogs}
            onFetchLogs={fetchLogs}
            logFilter={logFilter}
            onLogFilterChange={setLogFilter}
            autoRefreshLogs={autoRefreshLogs}
            onAutoRefreshLogsToggle={() => setAutoRefreshLogs((prev) => !prev)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 bg-slate-950 text-slate-500 text-xs py-8 mt-12 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-mono font-bold text-slate-400">
            Neo Copier v2.0 — Multi-Screen Kotak Neo Trade Copier
          </p>
          <p className="text-[11px]">
            Trade Terminal • Orders & Replication Logs • Account Management • System Diagnostics
          </p>
        </div>
      </footer>

      {/* Global Modals */}
      <ScripManagerModal
        isOpen={isScripModalOpen}
        onClose={() => setIsScripModalOpen(false)}
        scripStatus={scripStatus}
        loadingCategoryKey={loadingCategoryKey}
        clearingCategoryKey={clearingCategoryKey}
        isLoadingAll={isLoadingScrips}
        hasActiveAccount={accounts.some((a) => a.status === "active")}
        onLoadCategory={handleLoadScripCategory}
        onClearCategory={handleClearScripCategory}
        scripCacheStatus={scripCacheStatus}
        cachingScrips={cachingScrips}
        onCacheScrips={handleCacheScrips}
      />

      {orderDialog && (
        <QuickOrderDialog
          scrip={orderDialog.scrip}
          side={orderDialog.side}
          quote={quotes[orderDialog.scrip.scriptToken]}
          onClose={() => setOrderDialog(null)}
          onConfirm={handleQuickOrderConfirm}
          slaveAccs={slaveAccs}
          masterAcc={masterAcc}
          margins={margins}
        />
      )}

      {selectedOcoPosition && (
        <OcoBracketDialog
          position={selectedOcoPosition}
          existingOco={activeOcos.find((o: any) =>
            (o.accountId === selectedOcoPosition.accountId || o.accountName === selectedOcoPosition.accountName) &&
            (o.symbol === selectedOcoPosition.symbol || o.tradingSymbol === selectedOcoPosition.symbol) &&
            (o.status === "PENDING" || !o.status)
          )}
          quote={quotes[selectedOcoPosition.scriptToken]}
          onClose={() => setSelectedOcoPosition(null)}
          onSubmit={handleSubmitOco}
        />
      )}

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          quote={quotes[editingOrder.symbol]}
          onClose={() => setEditingOrder(null)}
          onConfirm={handleModifyOrder}
          loading={modifyingOrderId === editingOrder.id}
        />
      )}
    </div>
  );
}

// ─── EditOrderModal Component ────────────────────────────────────────────────
function EditOrderModal({
  order,
  quote,
  onClose,
  onConfirm,
  loading = false,
}: {
  order: TradeOrder;
  quote?: QuoteData;
  onClose: () => void;
  onConfirm: (orderId: string, updates: { price?: number; triggerPrice?: number; quantity?: number; orderType?: string }) => void | Promise<void>;
  loading?: boolean;
}) {
  const [quantity, setQuantity] = useState<number>(order.quantity);
  const [orderType, setOrderType] = useState<string>(order.orderType || "LIMIT");
  const [price, setPrice] = useState<number>(order.price || quote?.ltp || 0);
  const [triggerPrice, setTriggerPrice] = useState<number>(order.triggerPrice || 0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }
    if ((orderType === "LIMIT" || orderType === "SL") && price <= 0) {
      setError("Price must be greater than 0 for Limit/SL orders");
      return;
    }
    if (orderType === "SL" && triggerPrice <= 0) {
      setError("Trigger price must be greater than 0 for SL orders");
      return;
    }
    setError(null);
    onConfirm(order.id, {
      quantity,
      orderType,
      price: orderType === "MARKET" ? 0 : price,
      triggerPrice: orderType === "SL" ? triggerPrice : 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Edit Pending Order
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${order.transactionType === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {order.transactionType}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{order.symbol} [{order.accountName}]</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {quote && (
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Live Price (LTP):</span>
            <span className="font-bold text-teal-400">₹{quote.ltp.toFixed(2)}</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Order Type */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Order Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["LIMIT", "SL", "MARKET"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`py-2 rounded-lg font-bold transition-all text-center border cursor-pointer ${orderType === type
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Price */}
          {orderType !== "MARKET" && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Price (₹)</label>
              <input
                type="number"
                step="0.05"
                min={0}
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          {/* Trigger Price */}
          {orderType === "SL" && (
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Trigger Price (₹)</label>
              <input
                type="number"
                step="0.05"
                min={0}
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? "Modifying..." : "Update Order"}</span>
            </button>
          </div>
        </form>
      </div>
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
  isLoggingIn = false,
  isDeleting = false,
}: {
  acc: AccountSummary;
  totpCode?: string;
  onLogin: (acc: AccountSummary) => void | Promise<void>;
  onEdit: (acc: AccountSummary) => void;
  onDelete: (id: string, name: string) => void | Promise<void>;
  colorClass: string;
  iconBg: string;
  isLoggingIn?: boolean;
  isDeleting?: boolean;
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
          disabled={isLoggingIn || isDeleting}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500 disabled:opacity-50 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
        >
          {isLoggingIn ? (
            <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
          ) : (
            <Play className="w-3 h-3 text-emerald-400" />
          )}
          <span>{isLoggingIn ? "Logging in..." : "Login"}</span>
        </button>
        <button
          onClick={() => onEdit(acc)}
          disabled={isLoggingIn || isDeleting}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-white rounded-lg cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(acc.id, acc.nickname)}
          disabled={isLoggingIn || isDeleting}
          className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-rose-400 hover:text-rose-300 rounded-lg cursor-pointer flex items-center justify-center"
        >
          {isDeleting ? (
            <RefreshCw className="w-3.5 h-3.5 text-rose-400 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
