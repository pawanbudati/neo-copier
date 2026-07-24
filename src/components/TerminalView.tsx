import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Star,
  RefreshCw,
  Activity,
  Database,
  Wifi,
  WifiOff,
  BarChart2,
  X,
} from "lucide-react";
import {
  AccountSummary,
  ScripInfo,
  WatchlistItem,
  QuoteData,
  ScripStatusState,
} from "../types";

interface TerminalViewProps {
  // Watchlist & Search
  watchlist: WatchlistItem[];
  searchResults: ScripInfo[];
  isSearching: boolean;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onToggleWatchlist: (scrip: ScripInfo) => void;
  isStarred: (scriptToken: string) => boolean;
  scripStatus: ScripStatusState;
  onOpenScripModal: () => void;

  // Streaming
  subscribeOnSearch: boolean;
  onToggleSubscribeOnSearch: () => void;
  onTabChange?: (tab: "watchlist" | "search") => void;

  // Quotes
  quotes: Record<string, QuoteData>;

  // Quick Order Dialog Trigger
  onOpenQuickOrder: (scrip: ScripInfo, side: "BUY" | "SELL") => void;

  // Live Chart Trigger
  onOpenChart: (scrip: any) => void;

  // Accounts & Master
  masterAcc?: AccountSummary;
  slaveAccs: AccountSummary[];

  // Positions & Margins
  margins: any[];
  loadingMargins: boolean;
  onFetchMargins: () => void;
  positions: any[];
  loadingPositions: boolean;
  onFetchPositions: () => void;
  autoPollPositions?: boolean;
  onToggleAutoPollPositions?: () => void;
  autoPollMargins?: boolean;
  onToggleAutoPollMargins?: () => void;
  exitingAll: boolean;
  onExitAllPositions: () => void;
  exitingPositionId: string | null;
  onExitPosition: (pos: any) => void;
  onOpenOcoDialog: (pos: any) => void;
}

export function TerminalView({
  watchlist,
  searchResults,
  isSearching,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onToggleWatchlist,
  isStarred,
  scripStatus,
  onOpenScripModal,
  subscribeOnSearch,
  onToggleSubscribeOnSearch,
  onTabChange,
  quotes,
  onOpenQuickOrder,
  onOpenChart,
  masterAcc,
  slaveAccs,
  margins,
  loadingMargins,
  onFetchMargins,
  positions,
  loadingPositions,
  onFetchPositions,
  autoPollPositions = false,
  onToggleAutoPollPositions,
  autoPollMargins = false,
  onToggleAutoPollMargins,
  exitingAll,
  onExitAllPositions,
  exitingPositionId,
  onExitPosition,
  onOpenOcoDialog,
}: TerminalViewProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Top Section: Watchlist & Floating Absolute Search Dropdown */}
      <div className="relative z-30 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-sm flex flex-col">
        {/* Top Toolbar Header */}
        <div className="p-3 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-950/60 rounded-t-2xl relative">
          
          {/* Watchlist Header Badge & Db Master Button (Flex row on mobile, split on desktop) */}
          <div className="flex items-center justify-between gap-2 sm:contents">
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shrink-0">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Watchlist ({watchlist.length})</span>
            </div>

            <button
              onClick={onOpenScripModal}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 sm:order-last"
            >
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span>Db Master ({scripStatus.totalCount?.toLocaleString() || 0})</span>
            </button>
          </div>

          {/* Search Input with Floating Absolute Autocomplete Dropdown */}
          <div className="relative flex-1 max-w-md w-full" ref={searchRef}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 z-10" />
              <input
                type="text"
                placeholder="Search NIFTY, SENSEX, CE/PE Options, Stocks..."
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  onSearchQueryChange(e.target.value);
                  setIsSearchOpen(true);
                }}
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-teal-500 rounded-xl pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-all font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchQueryChange("");
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Floating Absolute Dropdown List - Always on Top with z-[100] */}
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-[100] bg-slate-900/98 border border-slate-700/90 shadow-2xl rounded-2xl backdrop-blur-xl p-3 max-h-[380px] overflow-y-auto space-y-2 border-t-2 border-t-teal-500 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 px-1 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Search Results ({searchResults.length})</span>
                  <button
                    onClick={onToggleSubscribeOnSearch}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 cursor-pointer ${
                      subscribeOnSearch
                        ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                        : "bg-slate-800 text-slate-500 border border-slate-700"
                    }`}
                  >
                    {subscribeOnSearch ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span>Stream</span>
                  </button>
                </div>

                {isSearching ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                    <span>Searching scrip master...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 font-mono">
                    No scrips found matching "{searchQuery}".
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const starred = isStarred(item.scriptToken);
                    const q = quotes[item.scriptToken];
                    return (
                      <div
                        key={item.scriptToken}
                        className="p-2.5 bg-slate-950/90 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-slate-100">
                              {item.scripRefKey || item.tradingSymbol}
                            </span>
                            <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 text-slate-400 rounded font-mono font-bold uppercase">
                              {item.exchange}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Strike: {item.strikePrice || "—"} | Expiry: {item.expiry || "—"} | Lot: {item.lotSize}
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t border-slate-800/60 pt-2 sm:border-t-0 sm:pt-0">
                          {q && (
                            <span className="font-mono font-bold text-teal-400 text-xs">
                              ₹{fmt(q.ltp)}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onOpenChart(item)}
                              className="p-1.5 rounded-lg border bg-slate-800 border-slate-700 text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer"
                              title="Open Live Chart"
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onToggleWatchlist(item)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                starred
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                              }`}
                              title={starred ? "Remove from Watchlist" : "Add to Watchlist"}
                            >
                              <Star className={`w-3.5 h-3.5 ${starred ? "fill-current" : ""}`} />
                            </button>
                            <button
                              onClick={() => {
                                onOpenQuickOrder(item, "BUY");
                                setIsSearchOpen(false);
                              }}
                              className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold rounded cursor-pointer"
                            >
                              BUY
                            </button>
                            <button
                              onClick={() => {
                                onOpenQuickOrder(item, "SELL");
                                setIsSearchOpen(false);
                              }}
                              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold rounded cursor-pointer"
                            >
                              SELL
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Watchlist Grid Items — Dynamic Height up to 5 items, scrollbar when > 5 items */}
        <div className={`p-3 sm:p-4 transition-all duration-300 ${watchlist.length > 5 ? "max-h-[380px] overflow-y-auto" : ""}`}>
          {watchlist.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs px-4">
              <Star className="w-6 h-6 mx-auto mb-1.5 text-slate-600 opacity-40" />
              <p className="font-semibold text-slate-400 text-xs">Your Watchlist is empty.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Type in the search bar above to find scrips and click the ⭐ icon to pin them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlist.map((item) => {
                const q = quotes[item.scriptToken];
                return (
                  <div
                    key={item.scriptToken}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-mono font-bold text-slate-100">
                            {item.scripRefKey || item.tradingSymbol}
                          </h4>
                          <span className="text-[9px] uppercase px-1 py-0.2 bg-slate-800 text-slate-400 rounded font-mono font-bold">
                            {item.exchange}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          Lot Size: {item.lotSize}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenChart(item)}
                          className="text-cyan-400 hover:text-cyan-300 p-1 cursor-pointer"
                          title="Open Live Chart"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onToggleWatchlist(item)}
                          className="text-amber-400 hover:text-amber-300 p-1 cursor-pointer"
                          title="Remove from Watchlist"
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </div>
                    </div>

                    {/* Live Quote Price & Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                      <div>
                        {q ? (
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-mono font-bold text-slate-100">
                              ₹{fmt(q.ltp)}
                            </span>
                            <span
                              className={`text-[10px] font-mono font-bold ${
                                q.change >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {q.change >= 0 ? "+" : ""}
                              {q.change.toFixed(2)} ({q.changePct >= 0 ? "+" : ""}
                              {q.changePct.toFixed(2)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600 font-mono animate-pulse">
                            Fetching price...
                          </span>
                        )}
                      </div>

                      {/* 1-Click Buy / Sell buttons */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        <button
                          onClick={() => onOpenQuickOrder(item, "BUY")}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-lg cursor-pointer transition-all text-center"
                        >
                          BUY
                        </button>
                        <button
                          onClick={() => onOpenQuickOrder(item, "SELL")}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs rounded-lg cursor-pointer transition-all text-center"
                        >
                          SELL
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Positions & Margins */}
      <div className="relative z-10 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">Open Positions & Margins</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {onToggleAutoPollPositions && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-mono text-slate-300 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-lg hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={autoPollPositions}
                  onChange={onToggleAutoPollPositions}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 relative" />
                <span className="text-[11px] font-semibold text-slate-300">Auto-Poll Pos</span>
              </label>
            )}

            {onToggleAutoPollMargins && (
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-mono text-slate-300 bg-slate-950/60 border border-slate-800 px-2.5 py-1 rounded-lg hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={autoPollMargins}
                  onChange={onToggleAutoPollMargins}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-500 relative" />
                <span className="text-[11px] font-semibold text-slate-300">Auto-Poll Margins</span>
              </label>
            )}

            <button
              onClick={() => {
                onFetchPositions();
                onFetchMargins();
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPositions || loadingMargins ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onExitAllPositions}
              disabled={exitingAll}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>{exitingAll ? "Exiting All..." : "Exit All Positions"}</span>
            </button>
          </div>
        </div>

        {/* Account Positions Cards */}
        {loadingPositions ? (
          <div className="text-center py-8 text-slate-500 text-xs animate-pulse">
            Loading active positions from broker accounts...
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No active open positions.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...positions]
              .sort((a: any, b: any) => {
                const aMaster = (a.role || "").toLowerCase() === "master" ? 0 : 1;
                const bMaster = (b.role || "").toLowerCase() === "master" ? 0 : 1;
                return aMaster - bMaster;
              })
              .map((accPos) => (
              <div
                key={accPos.accountId}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-100 font-mono">
                      {accPos.accountName || accPos.nickname || accPos.accountId}
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded font-bold">
                      {accPos.role}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {accPos.positions?.length || 0} Open Position(s)
                  </span>
                </div>

                {accPos.positions?.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-1">No open positions.</p>
                ) : (
                  <div className="space-y-2.5">
                    {[...(accPos.positions || [])]
                      .sort((a: any, b: any) => {
                        const aClosed = Number(a.netQty ?? a.quantity ?? 0) === 0 ? 1 : 0;
                        const bClosed = Number(b.netQty ?? b.quantity ?? 0) === 0 ? 1 : 0;
                        return aClosed - bClosed;
                      })
                      .map((pos: any, idx: number) => {
                        const netQty = Number(pos.netQty ?? pos.quantity ?? 0);
                        const q = quotes[pos.scriptToken];
                        const liveLtp = q ? q.ltp : Number(pos.actvLtp || 0);

                        let entryPrice = 0;
                        if (netQty > 0) {
                          entryPrice = Number(pos.buyAvg || pos.buyAvgPrice || pos.averagePrice || 0);
                        } else if (netQty < 0) {
                          entryPrice = Number(pos.sellAvg || pos.buyAvgPrice || pos.averagePrice || 0);
                        } else {
                          entryPrice = Number(pos.buyAvg || pos.sellAvg || 0);
                        }

                        let pnl = 0;
                        if (netQty > 0) {
                          pnl = netQty * (liveLtp - entryPrice);
                        } else if (netQty < 0) {
                          pnl = Math.abs(netQty) * (entryPrice - liveLtp);
                        } else {
                          const buyQty = Number(pos.buyQty || 0);
                          const sellQty = Number(pos.sellQty || 0);
                          pnl = (sellQty * Number(pos.sellAvg || 0)) - (buyQty * Number(pos.buyAvg || 0));
                        }

                        const isLong = netQty > 0;
                        const isShort = netQty < 0;
                        const isClosed = netQty === 0;

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-slate-100">
                                  {pos.scripRefKey || pos.tradingSymbol || pos.symbol}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    isLong
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : isShort
                                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                      : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {isLong ? "LONG" : isShort ? "SHORT" : "CLOSED"}
                                </span>
                                <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-mono">
                                  {pos.exchange}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                                <span>Qty: <strong className="text-slate-200">{Math.abs(netQty)}</strong></span>
                                <span>Buy Avg: <strong className="text-slate-200">₹{fmt(entryPrice)}</strong></span>
                                <span>LTP: <strong className="text-teal-400">₹{fmt(liveLtp)}</strong></span>
                                {pos.strikePrice > 0 && (
                                  <span>Strike: <strong className="text-slate-300">₹{pos.strikePrice}</strong></span>
                                )}
                                {pos.expiry && (
                                  <span>Expiry: <strong className="text-slate-300">{pos.expiry}</strong></span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 font-mono">
                              <div className="text-right">
                                <span className="text-[9px] uppercase text-slate-500 font-semibold block tracking-wider">
                                  Live P&L
                                </span>
                                <span
                                  className={`text-xs font-bold ${
                                    pnl >= 0 ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  {pnl >= 0 ? "+" : ""}₹{fmt(pnl)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => onOpenChart(pos)}
                                  className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
                                  title="Open Live Chart with Trades Overlay"
                                >
                                  <BarChart2 className="w-3 h-3" />
                                  <span>Chart</span>
                                </button>
                                {!isClosed && (
                                  <button
                                    onClick={() => onOpenOcoDialog({ ...pos, accountId: pos.accountId || accPos.accountId, accountName: pos.accountName || accPos.accountName || accPos.nickname })}
                                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded-lg cursor-pointer"
                                  >
                                    OCO
                                  </button>
                                )}
                                {!isClosed && (
                                  <button
                                    onClick={() => onExitPosition(pos)}
                                    disabled={exitingPositionId === `${accPos.accountId}_${pos.symbol}`}
                                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded-lg cursor-pointer disabled:opacity-50"
                                  >
                                    {exitingPositionId === `${accPos.accountId}_${pos.symbol}` ? "..." : "Exit"}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
