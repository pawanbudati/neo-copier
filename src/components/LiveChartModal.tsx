import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  AreaSeries,
  CandlestickData,
  Time,
  ColorType,
  LineStyle,
} from "lightweight-charts";
import { Maximize2, Minimize2, TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { QuoteData, ScripInfo } from "../types";

interface LiveChartModalProps {
  scrip: ScripInfo | any;
  quote?: QuoteData;
  position?: any;
  onClose: () => void;
  onOpenQuickOrder?: (scrip: any, side: "BUY" | "SELL") => void;
}

export function LiveChartModal({
  scrip,
  quote,
  position,
  onClose,
  onOpenQuickOrder,
}: LiveChartModalProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);

  const [timeframe, setTimeframe] = useState<"1m" | "5m" | "15m" | "1h">("1m");
  const [chartType, setChartType] = useState<"candles" | "area">("candles");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // In-memory candles store for active session
  const candlesRef = useRef<CandlestickData[]>([]);
  const currentCandleRef = useRef<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

  const fmt = (n: number) =>
    n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const symbolDisplay = scrip?.scripRefKey || scrip?.tradingSymbol || scrip?.symbol || "Chart";
  const liveLtp = quote?.ltp ?? Number(position?.actvLtp || scrip?.ltp || 0);
  const liveChange = quote?.change ?? 0;
  const liveChangePct = quote?.changePct ?? 0;

  // 1. Initialize Chart Canvas
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 420,
      layout: {
        background: { type: ColorType.Solid, color: "#090d16" },
        textColor: "#94a3b8",
        fontFamily: "'JetBrains Mono', monospace, sans-serif",
      },
      grid: {
        vertLines: { color: "#1e293b50" },
        horzLines: { color: "#1e293b50" },
      },
      crosshair: {
        vertLine: { color: "#0ea5e9", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "#0ea5e9", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "#334155",
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });
    candleSeriesRef.current = candleSeries;

    // Add Area Series (hidden initially unless toggled)
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(16, 185, 129, 0.4)",
      bottomColor: "rgba(16, 185, 129, 0.0)",
      lineColor: "#10b981",
      lineWidth: 2,
      visible: false,
    });
    areaSeriesRef.current = areaSeries;

    // Seed baseline historical candles if empty
    const nowSec = Math.floor(Date.now() / 1000);
    const tfSec = timeframe === "5m" ? 300 : timeframe === "15m" ? 900 : timeframe === "1h" ? 3600 : 60;
    const seedPrice = liveLtp > 0 ? liveLtp : 100;

    const seeded: CandlestickData[] = [];
    let curPx = seedPrice;
    for (let i = 30; i >= 0; i--) {
      const t = (nowSec - i * tfSec) as Time;
      const variation = (Math.random() - 0.49) * (curPx * 0.002);
      const open = curPx;
      const close = curPx + variation;
      const high = Math.max(open, close) + Math.random() * (curPx * 0.001);
      const low = Math.min(open, close) - Math.random() * (curPx * 0.001);
      curPx = close;
      seeded.push({ time: t, open, high, low, close });
    }

    candlesRef.current = seeded;
    candleSeries.setData(seeded);

    const last = seeded[seeded.length - 1];
    currentCandleRef.current = {
      time: Number(last.time),
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
    };

    // 2. Draw Position Overlay Lines if Position exists
    if (position) {
      const entryPrice = Number(position.buyAvg || position.sellAvg || position.averagePrice || 0);
      if (entryPrice > 0) {
        candleSeries.createPriceLine({
          price: entryPrice,
          color: "#3b82f6",
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          title: `ENTRY (₹${entryPrice.toFixed(2)})`,
        });
      }

      if (position.slTriggerPrice > 0) {
        candleSeries.createPriceLine({
          price: position.slTriggerPrice,
          color: "#f43f5e",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          title: `SL (₹${position.slTriggerPrice})`,
        });
      }

      if (position.tpPrice > 0) {
        candleSeries.createPriceLine({
          price: position.tpPrice,
          color: "#14b8a6",
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          title: `TARGET (₹${position.tpPrice})`,
        });
      }
    }

    // Auto-fit content
    chart.timeScale().fitContent();

    // Handle Window Resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [timeframe]);

  // 3. Real-Time Tick Streaming Handler
  useEffect(() => {
    if (!liveLtp || liveLtp <= 0 || !candleSeriesRef.current) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const tfSec = timeframe === "5m" ? 300 : timeframe === "15m" ? 900 : timeframe === "1h" ? 3600 : 60;
    const bucketTime = Math.floor(nowSec / tfSec) * tfSec;

    const cur = currentCandleRef.current;

    if (!cur || cur.time !== bucketTime) {
      // Create new candle bucket
      const newCandle = {
        time: bucketTime as Time,
        open: liveLtp,
        high: liveLtp,
        low: liveLtp,
        close: liveLtp,
      };
      currentCandleRef.current = {
        time: bucketTime,
        open: liveLtp,
        high: liveLtp,
        low: liveLtp,
        close: liveLtp,
      };
      candleSeriesRef.current.update(newCandle);
      if (areaSeriesRef.current) {
        areaSeriesRef.current.update({ time: bucketTime as Time, value: liveLtp });
      }
    } else {
      // Update existing candle bucket
      const updatedCandle = {
        time: cur.time as Time,
        open: cur.open,
        high: Math.max(cur.high, liveLtp),
        low: Math.min(cur.low, liveLtp),
        close: liveLtp,
      };
      currentCandleRef.current = {
        time: cur.time,
        open: cur.open,
        high: updatedCandle.high,
        low: updatedCandle.low,
        close: liveLtp,
      };

      candleSeriesRef.current.update(updatedCandle);
      if (areaSeriesRef.current) {
        areaSeriesRef.current.update({ time: cur.time as Time, value: liveLtp });
      }
    }
  }, [liveLtp, timeframe]);

  // Toggle chart type (Candles vs Area)
  const toggleChartType = (type: "candles" | "area") => {
    setChartType(type);
    if (candleSeriesRef.current && areaSeriesRef.current) {
      candleSeriesRef.current.applyOptions({ visible: type === "candles" });
      areaSeriesRef.current.applyOptions({ visible: type === "area" });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in font-mono">
      <div
        className={`bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col transition-all ${
          isFullscreen ? "w-full h-full" : "w-full max-w-5xl h-[85vh] max-h-[720px]"
        }`}
      >
        {/* Header Bar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Symbol Info */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  {symbolDisplay}
                </h3>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-bold uppercase">
                  {scrip?.exchange || position?.exchange || "NSE"}
                </span>
                {position && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold uppercase">
                    Open Position
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                <span className="font-bold text-slate-100 text-sm">
                  ₹{fmt(liveLtp)}
                </span>
                <span
                  className={`text-[11px] font-bold flex items-center gap-0.5 ${
                    liveChange >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {liveChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {liveChange >= 0 ? "+" : ""}
                  {liveChange.toFixed(2)} ({liveChangePct >= 0 ? "+" : ""}
                  {liveChangePct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Timeframe & Chart Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeframe Buttons */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              {(["1m", "5m", "15m", "1h"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    timeframe === tf
                      ? "bg-teal-500 text-slate-950"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Type Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => toggleChartType("candles")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  chartType === "candles"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Candles
              </button>
              <button
                onClick={() => toggleChartType("area")}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  chartType === "area"
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Area
              </button>
            </div>

            {/* 1-Click Order Placement directly from Chart */}
            {onOpenQuickOrder && (
              <div className="flex items-center gap-1.5 border-l border-slate-800 pl-2">
                <button
                  onClick={() => onOpenQuickOrder(scrip || position, "BUY")}
                  className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                >
                  BUY
                </button>
                <button
                  onClick={() => onOpenQuickOrder(scrip || position, "SELL")}
                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold rounded-lg cursor-pointer transition-all"
                >
                  SELL
                </button>
              </div>
            )}

            {/* Fullscreen & Close */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="flex-1 w-full relative min-h-[350px]">
          <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
