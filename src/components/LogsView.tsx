import React, { useState } from "react";
import { Terminal, RefreshCw, Search, Trash2, Filter } from "lucide-react";

interface LogsViewProps {
  backendLogs: string[];
  loadingLogs: boolean;
  onFetchLogs: () => void;
  logFilter: "ALL" | "INFO" | "WARN" | "ERROR";
  onLogFilterChange: (filter: "ALL" | "INFO" | "WARN" | "ERROR") => void;
  autoRefreshLogs: boolean;
  onAutoRefreshLogsToggle: () => void;
}

export function LogsView({
  backendLogs,
  loadingLogs,
  onFetchLogs,
  logFilter,
  onLogFilterChange,
  autoRefreshLogs,
  onAutoRefreshLogsToggle,
}: LogsViewProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = backendLogs.filter((line) => {
    if (logFilter !== "ALL" && !line.toUpperCase().includes(logFilter)) {
      return false;
    }
    if (searchTerm && !line.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Logs Controls Bar */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
            {(["ALL", "INFO", "WARN", "ERROR"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onLogFilterChange(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                  logFilter === filter
                    ? filter === "ERROR"
                      ? "bg-rose-500 text-slate-950"
                      : filter === "WARN"
                      ? "bg-amber-500 text-slate-950"
                      : "bg-teal-500 text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search log stream..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {/* Auto Refresh Toggle */}
          <button
            onClick={onAutoRefreshLogsToggle}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
              autoRefreshLogs
                ? "bg-teal-500/10 border-teal-500/30 text-teal-400"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefreshLogs ? "animate-spin" : ""}`} />
            <span>Auto Refresh</span>
          </button>

          <button
            onClick={onFetchLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            <span>Fetch Logs</span>
          </button>
        </div>
      </div>

      {/* Terminal Output Viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-hidden shadow-2xl min-h-[550px] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3 text-slate-400 text-[11px]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-slate-200">Backend Event Output Log</span>
          </div>
          <span>Showing {filteredLogs.length} line(s)</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[520px] scrollbar-none pr-1">
          {loadingLogs && filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-600 animate-pulse">
              Fetching system logs from FastAPI backend server...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              No log lines matching the current filter.
            </div>
          ) : (
            filteredLogs.map((line, idx) => {
              const isErr = line.toUpperCase().includes("ERROR") || line.toUpperCase().includes("FAILED");
              const isWarn = line.toUpperCase().includes("WARN");

              return (
                <div
                  key={idx}
                  className={`py-0.5 px-2 rounded hover:bg-slate-900/80 leading-relaxed font-mono text-[11px] break-all ${
                    isErr
                      ? "text-rose-400 bg-rose-950/20"
                      : isWarn
                      ? "text-amber-400 bg-amber-950/20"
                      : "text-slate-300"
                  }`}
                >
                  {line}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
