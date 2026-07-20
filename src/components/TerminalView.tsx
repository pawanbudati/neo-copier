import React, { useState } from "react";
import {
  Search,
  Star,
  StarOff,
  Trash2,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Sliders,
  DollarSign,
  Play,
  RefreshCw,
  HelpCircle,
  Database,
  ArrowUpRight,
  ArrowDownRight,
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

  // Quotes
  quotes: Record<string, QuoteData>;

  // Order Pad Form State
  instrument: string;
  onInstrumentChange: (inst: string) => void;
  customSymbol: string;
  onCustomSymbolChange: (sym: string) => void;
  optionType: "CE" | "PE" | "FUT" | "EQ";
  onOptionTypeChange: (ot: "CE" | "PE" | "FUT" | "EQ") => void;
  strikePrice: string;
  onStrikePriceChange: (sp: string) => void;
  expiry: string;
  onExpiryChange: (exp: string) => void;
  quantity: string;
  onQuantityChange: (qty: string) => void;
  price: string;
  onPriceChange: (p: string) => void;
  orderType: "MARKET" | "LIMIT";
  onOrderTypeChange: (ot: "MARKET" | "LIMIT") => void;
  transactionType: "BUY" | "SELL";
  onTransactionTypeChange: (tt: "BUY" | "SELL") => void;
  submittingOrder: boolean;
  onSubmitOrder: (e: React.FormEvent) => void;
  onOpenQuickOrder: (scrip: ScripInfo, side: "BUY" | "SELL") => void;

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
  quotes,
  instrument,
  onInstrumentChange,
  customSymbol,
  onCustomSymbolChange,
  optionType,
  onOptionTypeChange,
  strikePrice,
  onStrikePriceChange,
  expiry,
  onExpiryChange,
  quantity,
  onQuantityChange,
  price,
  onPriceChange,
  orderType,
  onOrderTypeChange,
  transactionType,
  onTransactionTypeChange,
  submittingOrder,
  onSubmitOrder,
  onOpenQuickOrder,
  masterAcc,
  slaveAccs,
  margins,
  loadingMargins,
  onFetchMargins,
  positions,
  loadingPositions,
  onFetchPositions,
  exitingAll,
  onExitAllPositions,
  exitingPositionId,
  onExitPosition,
  onOpenOcoDialog,
}: TerminalViewProps) {
  const [terminalTab, setTerminalTab] = useState<"watchlist" | "search">("watchlist");

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Top Section: Left (Watchlist & Search) + Right (Quick Order Pad) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Watchlist & Scrip Search (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col min-h-[520px]">
          {/* Sub-tabs header */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTerminalTab("watchlist")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  terminalTab === "watchlist"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Watchlist ({watchlist.length})</span>
              </button>

              <button
                onClick={() => setTerminalTab("search")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  terminalTab === "search"
                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Instruments</span>
              </button>
            </div>

            <button
              onClick={onOpenScripModal}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Database className="w-3 h-3 text-teal-400" />
              <span>Db Master ({scripStatus.totalCount})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4 flex-1 overflow-y-auto">
            {terminalTab === "watchlist" ? (
              // Watchlist view
              <div>
                {watchlist.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    <Star className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-40" />
                    <p>Your Watchlist is empty.</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Search for instruments and click the star icon to pin them here for fast 1-click execution.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {watchlist.map((item) => {
                      const q = quotes[item.scriptToken];
                      return (
                        <div
                          key={item.scriptToken}
                          className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all group"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-mono font-bold text-slate-100">
                                  {item.tradingSymbol}
                                </h4>
                                <span className="text-[9px] uppercase px-1 py-0.2 bg-slate-800 text-slate-400 rounded">
                                  {item.exchange}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                Lot Size: {item.lotSize}
                              </p>
                            </div>
                            <button
                              onClick={() => onToggleWatchlist(item)}
                              className="text-amber-400 hover:text-amber-300 p-1 cursor-pointer"
                              title="Remove from Watchlist"
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          </div>

                          {/* Live Quote Price */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
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
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => onOpenQuickOrder(item, "BUY")}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] rounded-lg cursor-pointer transition-all"
                              >
                                BUY
                              </button>
                              <button
                                onClick={() => onOpenQuickOrder(item, "SELL")}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-[11px] rounded-lg cursor-pointer transition-all"
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
            ) : (
              // Search view
              <div className="space-y-4">
                <form onSubmit={onSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search Banknifty, Nifty CE/PE, Stock Futures..."
                      value={searchQuery}
                      onChange={(e) => onSearchQueryChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSearching ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Search</span>
                  </button>
                </form>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {searchResults.map((item) => {
                      const starred = isStarred(item.scriptToken);
                      const q = quotes[item.scriptToken];
                      return (
                        <div
                          key={item.scriptToken}
                          className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-100">
                                {item.tradingSymbol}
                              </span>
                              <span className="text-[9px] bg-slate-800 px-1.5 py-0.2 text-slate-400 rounded">
                                {item.exchange}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              Strike: {item.strikePrice || "—"} | Expiry: {item.expiry || "—"} | Lot: {item.lotSize}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {q && (
                              <span className="font-mono font-bold text-teal-400">
                                ₹{fmt(q.ltp)}
                              </span>
                            )}
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
                              onClick={() => onOpenQuickOrder(item, "BUY")}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded cursor-pointer"
                            >
                              BUY
                            </button>
                            <button
                              onClick={() => onOpenQuickOrder(item, "SELL")}
                              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded cursor-pointer"
                            >
                              SELL
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Order Pad (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-slate-100 font-mono">Order Pad</h3>
            </div>
            {masterAcc && (
              <span className="text-[10px] bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded font-mono font-bold">
                Master: {masterAcc.nickname}
              </span>
            )}
          </div>

          <form onSubmit={onSubmitOrder} className="space-y-4 text-xs">
            {/* BUY / SELL Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => onTransactionTypeChange("BUY")}
                className={`py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  transactionType === "BUY"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => onTransactionTypeChange("SELL")}
                className={`py-2 rounded-lg font-bold transition-all text-center cursor-pointer ${
                  transactionType === "SELL"
                    ? "bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                SELL
              </button>
            </div>

            {/* Instrument Selection */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Instrument</label>
              <select
                value={instrument}
                onChange={(e) => onInstrumentChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
              >
                <option value="NIFTY">NIFTY (Lot: 25/50)</option>
                <option value="BANKNIFTY">BANKNIFTY (Lot: 15)</option>
                <option value="FINNIFTY">FINNIFTY (Lot: 25)</option>
                <option value="SENSEX">SENSEX (Lot: 10)</option>
                <option value="CRUDEOIL">CRUDEOIL FUT (MCX)</option>
                <option value="CUSTOM">CUSTOM SYMBOL</option>
              </select>
            </div>

            {instrument === "CUSTOM" ? (
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Custom Symbol</label>
                <input
                  type="text"
                  value={customSymbol}
                  onChange={(e) => onCustomSymbolChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-teal-500"
                  placeholder="e.g. RELIANCE26JUL2500CE"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Type</label>
                  <select
                    value={optionType}
                    onChange={(e) => onOptionTypeChange(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                  >
                    <option value="CE">CE</option>
                    <option value="PE">PE</option>
                    <option value="FUT">FUT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Strike</label>
                  <input
                    type="text"
                    value={strikePrice}
                    onChange={(e) => onStrikePriceChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Expiry</label>
                  <input
                    type="date"
                    value={expiry}
                    onChange={(e) => onExpiryChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            )}

            {/* Order Type & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Order Type</label>
                <select
                  value={orderType}
                  onChange={(e) => onOrderTypeChange(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-teal-500"
                >
                  <option value="MARKET">MARKET</option>
                  <option value="LIMIT">LIMIT</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Price (₹) {orderType === "MARKET" && "(Auto)"}
                </label>
                <input
                  type="number"
                  step="0.05"
                  disabled={orderType === "MARKET"}
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold disabled:opacity-40 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Quantity & Presets */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold">Quantity</label>
                <div className="flex gap-1">
                  {[25, 50, 100, 250].map((qVal) => (
                    <button
                      key={qVal}
                      type="button"
                      onClick={() => onQuantityChange(String(qVal))}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono cursor-pointer"
                    >
                      {qVal}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => onQuantityChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={submittingOrder}
              className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                transactionType === "BUY"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20"
                  : "bg-rose-500 hover:bg-rose-600 text-slate-950 shadow-rose-500/20"
              }`}
            >
              {submittingOrder && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>
                {submittingOrder
                  ? "Executing Order..."
                  : `EXECUTE ${transactionType} (${quantity} QTY)`}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Section: Positions & Margins */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">Open Positions & Margins</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onFetchPositions();
                onFetchMargins();
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPositions ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={onExitAllPositions}
              disabled={exitingAll}
              className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
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
            {positions.map((accPos) => (
              <div
                key={accPos.accountId}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <span className="font-bold text-xs text-slate-200 font-mono">
                    {accPos.nickname || accPos.accountId}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {accPos.positions?.length || 0} Open Position(s)
                  </span>
                </div>

                {accPos.positions?.length === 0 ? (
                  <p className="text-[11px] text-slate-500 py-1">No open positions.</p>
                ) : (
                  <div className="space-y-2">
                    {accPos.positions.map((pos: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-100">
                              {pos.tradingSymbol || pos.symbol}
                            </span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                pos.quantity >= 0
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {pos.quantity >= 0 ? "LONG" : "SHORT"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Qty: {Math.abs(pos.quantity)} | Avg: ₹{pos.buyAvgPrice || pos.averagePrice || 0}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenOcoDialog(pos)}
                            className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded cursor-pointer"
                          >
                            OCO
                          </button>
                          <button
                            onClick={() => onExitPosition(pos)}
                            disabled={exitingPositionId === pos.symbol}
                            className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold rounded cursor-pointer disabled:opacity-50"
                          >
                            {exitingPositionId === pos.symbol ? "..." : "Exit"}
                          </button>
                        </div>
                      </div>
                    ))}
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
