import React from "react";
import {
  Users,
  Plus,
  TrendingUp,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Play,
  Settings,
  Trash2,
  RefreshCw,
  Database,
} from "lucide-react";
import { AccountSummary, AppSettings, ScripStatusState } from "../types";

interface AccountsViewProps {
  masterAcc?: AccountSummary;
  slaveAccs: AccountSummary[];
  onLoginAccount: (acc: AccountSummary) => void;
  onEditAccount: (acc: AccountSummary) => void;
  onDeleteAccount: (id: string, name: string) => void;
  onOpenAddModal: (role: "master" | "slave") => void;
  loggingInAccountId: string | null;
  deletingAccountId: string | null;

  // Settings
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;

  // Scrip Master
  scripStatus: ScripStatusState;
  onOpenScripModal: () => void;
}

export function AccountsView({
  masterAcc,
  slaveAccs,
  onLoginAccount,
  onEditAccount,
  onDeleteAccount,
  onOpenAddModal,
  loggingInAccountId,
  deletingAccountId,
  settings,
  onUpdateSettings,
  scripStatus,
  onOpenScripModal,
}: AccountsViewProps) {
  return (
    <div className="space-y-6">
      {/* Top Section: Copier Settings & Scrip Cache Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Copier Controls */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">Global Replicator Controls</h3>
          </div>

          <div className="space-y-3">
            {/* Auto Replicate Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Auto Order Replication</h4>
                <p className="text-[11px] text-slate-400">
                  Automatically copy master account orders to all active slave accounts.
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({ autoReplicate: !settings.autoReplicate })
                }
                className={`w-12 h-6 rounded-full transition-all relative p-1 cursor-pointer ${
                  settings.autoReplicate ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all ${
                    settings.autoReplicate ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Auto Renew Sessions Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Auto Session Renewal</h4>
                <p className="text-[11px] text-slate-400">
                  Automatically re-authenticate Kotak SDK sessions using TOTP secrets.
                </p>
              </div>
              <button
                onClick={() =>
                  onUpdateSettings({ autoRenewSessions: !settings.autoRenewSessions })
                }
                className={`w-12 h-6 rounded-full transition-all relative p-1 cursor-pointer ${
                  settings.autoRenewSessions ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-all ${
                    settings.autoRenewSessions ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Instrument Master Database Status Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  Kotak Instrument Master Db
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded">
                {scripStatus.totalCount} Scrips Loaded
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Pre-load Kotak Securities contract masters (NIFTY, BANKNIFTY, SENSEX, Stock Options, Futures, MCX Commodities) into memory/database for fast live search and order execution.
            </p>
          </div>

          <button
            onClick={onOpenScripModal}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500 text-teal-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Database className="w-4 h-4" />
            <span>Manage Contract Master Database</span>
          </button>
        </div>
      </div>

      {/* Master Account Section */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">Master Account</h3>
          </div>
          {!masterAcc && (
            <button
              onClick={() => onOpenAddModal("master")}
              className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Master Account</span>
            </button>
          )}
        </div>

        {!masterAcc ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No Master account configured yet. Click above to add your primary Kotak Neo account.
          </div>
        ) : (
          <AccountCardItem
            acc={masterAcc}
            onLogin={onLoginAccount}
            onEdit={onEditAccount}
            onDelete={onDeleteAccount}
            colorClass="border-teal-500/30"
            iconBg="bg-teal-500/10 text-teal-400"
            isLoggingIn={loggingInAccountId === masterAcc.id}
            isDeleting={deletingAccountId === masterAcc.id}
          />
        )}
      </div>

      {/* Slave Accounts Section */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              Slave Accounts ({slaveAccs.length})
            </h3>
          </div>
          <button
            onClick={() => onOpenAddModal("slave")}
            className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Slave Account</span>
          </button>
        </div>

        {slaveAccs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No Slave accounts configured. Add slave accounts to replicate master orders with customized position sizing.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slaveAccs.map((slave) => (
              <AccountCardItem
                key={slave.id}
                acc={slave}
                onLogin={onLoginAccount}
                onEdit={onEditAccount}
                onDelete={onDeleteAccount}
                colorClass="border-sky-500/30"
                iconBg="bg-sky-500/10 text-sky-400"
                isLoggingIn={loggingInAccountId === slave.id}
                isDeleting={deletingAccountId === slave.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for account card item
function AccountCardItem({
  acc,
  onLogin,
  onEdit,
  onDelete,
  colorClass,
  iconBg,
  isLoggingIn,
  isDeleting,
}: {
  acc: AccountSummary;
  onLogin: (acc: AccountSummary) => void;
  onEdit: (acc: AccountSummary) => void;
  onDelete: (id: string, name: string) => void;
  colorClass: string;
  iconBg: string;
  isLoggingIn: boolean;
  isDeleting: boolean;
}) {
  return (
    <div
      className={`bg-slate-900/60 border ${colorClass} rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4`}
    >
      <div className="flex items-start gap-3">
        <div className={`${iconBg} p-2.5 rounded-xl mt-0.5`}>
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-100 font-mono">{acc.nickname}</h4>
            <span
              className={`w-2 h-2 rounded-full ${
                acc.status === "active" ? "bg-emerald-500 animate-ping" : "bg-slate-500"
              }`}
            />
            <span className="text-[10px] text-slate-400 font-mono">({acc.mobileNumber})</span>
            {acc.role === "slave" && (
              <span className="text-[10px] font-semibold bg-slate-800 text-sky-300 px-2 py-0.5 rounded border border-slate-700 font-mono">
                {acc.multiplier}x Multiplier
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
            <span>
              Status:{" "}
              <strong
                className={`uppercase ${
                  acc.status === "active"
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
                Last Login: {new Date(acc.lastLogin).toLocaleTimeString()}
              </span>
            )}
          </div>
          {acc.errorMessage && (
            <p className="text-[11px] text-rose-400 bg-rose-950/20 px-2 py-1 rounded border border-rose-500/10 font-mono">
              {acc.errorMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center">
        <button
          onClick={() => onLogin(acc)}
          disabled={isLoggingIn || isDeleting}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500 disabled:opacity-50 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
        >
          {isLoggingIn ? (
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
          )}
          <span>{isLoggingIn ? "Logging in..." : "Login"}</span>
        </button>
        <button
          onClick={() => onEdit(acc)}
          disabled={isLoggingIn || isDeleting}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-xl cursor-pointer transition-all"
          title="Account Settings & Credentials"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(acc.id, acc.nickname)}
          disabled={isLoggingIn || isDeleting}
          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 hover:text-rose-300 rounded-xl cursor-pointer transition-all"
          title="Delete Account"
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
