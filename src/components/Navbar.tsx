import React from "react";
import {
  Activity,
  BookOpen,
  Users,
  Terminal,
  Power,
  Palette,
  Zap,
} from "lucide-react";
import { MainScreen, QuoteData, AccountSummary } from "../types";

interface NavbarProps {
  activeScreen: MainScreen;
  onSelectScreen: (screen: MainScreen) => void;
  quotes: Record<string, QuoteData>;
  powerOn: boolean;
  onTogglePower: () => void;
  theme: "classic" | "modern" | "cyberpunk";
  onCycleTheme: () => void;
  pendingOrdersCount: number;
  masterAccount?: AccountSummary;
  authToken: string | null;
  onLogout: () => void;
}

export function Navbar({
  activeScreen,
  onSelectScreen,
  quotes,
  powerOn,
  onTogglePower,
  theme,
  onCycleTheme,
  pendingOrdersCount,
  masterAccount,
  authToken,
  onLogout,
}: NavbarProps) {
  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Ticker helper to safely resolve crude oil or index quote
  const getQuote = (key: string) => {
    return quotes[key] || quotes[key.toUpperCase()] || quotes[key.toLowerCase()];
  };

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1700px] mx-auto px-3 sm:px-4 py-2.5 space-y-2.5 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
        {/* Top Header Row: Logo Branding & System Controls */}
        <div className="flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="p-1.5 sm:p-2 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl shadow-lg shadow-teal-500/20 text-slate-950">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 font-black fill-current" />
            </div>
          </div>

          {/* Nav Tabs for Desktop (lg screens) */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onSelectScreen("terminal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeScreen === "terminal"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
            >
              <Activity className="w-4 h-4" />
              <span>Trade Terminal</span>
            </button>

            <button
              onClick={() => onSelectScreen("orders")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${activeScreen === "orders"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Orders</span>
              {pendingOrdersCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeScreen === "orders"
                    ? "bg-slate-950 text-teal-400"
                    : "bg-amber-500 text-slate-950 animate-pulse"
                    }`}
                >
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectScreen("accounts")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeScreen === "accounts"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
            >
              <Users className="w-4 h-4" />
              <span>Accounts</span>
            </button>

            <button
              onClick={() => onSelectScreen("logs")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${activeScreen === "logs"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Logs</span>
            </button>
          </nav>

          {/* Right Controls: Power, Theme, Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Master status indicator */}
            {masterAccount && (
              <div className="hidden xl:flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-lg text-xs">
                <span className="text-slate-400 text-[11px]">Master:</span>
                <span className="font-bold text-slate-200 font-mono">{masterAccount.nickname}</span>
                <span
                  className={`w-2 h-2 rounded-full ${masterAccount.status === "active" ? "bg-emerald-500 animate-ping" : "bg-slate-500"
                    }`}
                />
              </div>
            )}

            {/* System Power Switch */}
            <button
              onClick={onTogglePower}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${powerOn
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                }`}
              title="System Power Toggle (Master Auto Replicator)"
            >
              <Power className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">{powerOn ? "ON" : "OFF"}</span>
            </button>

            {/* Theme switcher */}
            <button
              onClick={onCycleTheme}
              className="p-1.5 sm:p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-all"
              title={`Current Theme: ${theme}`}
            >
              <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400" />
            </button>

            {/* Auth Logout */}
            {authToken && (
              <button
                onClick={onLogout}
                className="px-2 py-1.5 sm:px-2.5 sm:py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-lg cursor-pointer transition-all"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Tabs (< lg screens) */}
        <div className="lg:hidden flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 w-full justify-around sm:justify-start">
            <button
              onClick={() => onSelectScreen("terminal")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${activeScreen === "terminal"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-100"
                }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Terminal</span>
            </button>

            <button
              onClick={() => onSelectScreen("orders")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative shrink-0 ${activeScreen === "orders"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-100"
                }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Orders</span>
              {pendingOrdersCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeScreen === "orders"
                    ? "bg-slate-950 text-teal-400"
                    : "bg-amber-500 text-slate-950 animate-pulse"
                    }`}
                >
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectScreen("accounts")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${activeScreen === "accounts"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-100"
                }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Accounts</span>
            </button>

            <button
              onClick={() => onSelectScreen("logs")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${activeScreen === "logs"
                ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                : "text-slate-400 hover:text-slate-100"
                }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="text-[11px] sm:text-xs">Logs</span>
            </button>
          </nav>
        </div>

        {/* Live Index & Commodities Ticker Bar */}
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-xl backdrop-blur-sm shadow-inner overflow-x-auto no-scrollbar shrink-0 max-w-full">
          {/* NIFTY 50 */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 font-mono">
              NIFTY 50
            </span>
            {quotes["Nifty 50"] ? (
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono font-bold text-slate-100">
                  {fmt(quotes["Nifty 50"].ltp)}
                </span>
                <span
                  className={`text-[10px] font-bold font-mono ${quotes["Nifty 50"].change >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                >
                  {quotes["Nifty 50"].change >= 0 ? "+" : ""}
                  {quotes["Nifty 50"].change.toFixed(2)} ({quotes["Nifty 50"].changePct.toFixed(2)}%)
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-600 animate-pulse font-mono">
                loading...
              </span>
            )}
          </div>

          <div className="h-3 w-px bg-slate-800 shrink-0" />

          {/* SENSEX */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 font-mono">
              SENSEX
            </span>
            {quotes["SENSEX"] ? (
              <div className="flex items-center gap-1">
                <span className="text-xs font-mono font-bold text-slate-100">
                  {fmt(quotes["SENSEX"].ltp)}
                </span>
                <span
                  className={`text-[10px] font-bold font-mono ${quotes["SENSEX"].change >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                >
                  {quotes["SENSEX"].change >= 0 ? "+" : ""}
                  {quotes["SENSEX"].change.toFixed(2)} ({quotes["SENSEX"].changePct.toFixed(2)}%)
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-600 animate-pulse font-mono">
                loading...
              </span>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
