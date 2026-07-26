import React, { useState, useEffect } from "react";
import {
  X,
  UserCheck,
  Smartphone,
  Key,
  ShieldCheck,
  Layers,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";
import { AccountSummary } from "../types";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void | Promise<void>;
  editingAccountId: string | null;
  nickname: string;
  setNickname: (val: string) => void;
  role: "master" | "slave";
  setRole: (val: "master" | "slave") => void;
  mobileNumber: string;
  setMobileNumber: (val: string) => void;
  ucc: string;
  setUcc: (val: string) => void;
  mpin: string;
  setMpin: (val: string) => void;
  consumerKey: string;
  setConsumerKey: (val: string) => void;
  totpSecret: string;
  setTotpSecret: (val: string) => void;
  multiplier: number;
  setMultiplier: (val: number) => void;
  savingAccount: boolean;
  masterExists: boolean;
}

export function AccountModal({
  isOpen,
  onClose,
  onSave,
  editingAccountId,
  nickname,
  setNickname,
  role,
  setRole,
  mobileNumber,
  setMobileNumber,
  ucc,
  setUcc,
  mpin,
  setMpin,
  consumerKey,
  setConsumerKey,
  totpSecret,
  setTotpSecret,
  multiplier,
  setMultiplier,
  savingAccount,
  masterExists,
}: AccountModalProps) {
  const [showMpin, setShowMpin] = useState(false);
  const [showConsumerKey, setShowConsumerKey] = useState(false);
  const [showTotpSecret, setShowTotpSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [isOpen, editingAccountId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("Account Nickname is required");
      return;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    if (!ucc.trim()) {
      setError("Kotak Client Code (UCC) is required");
      return;
    }
    if (!editingAccountId && !mpin.trim()) {
      setError("MPIN is required for new accounts");
      return;
    }
    if (role === "master" && masterExists && !editingAccountId) {
      setError("A Master Account already exists. Please edit existing master or set role to Slave.");
      return;
    }
    setError(null);
    onSave(e);
  };

  const isEdit = !!editingAccountId;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-5 relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                role === "master"
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                  : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
              }`}
            >
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {isEdit ? "Edit Kotak Neo Account" : "Add Kotak Neo Account"}
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                    role === "master"
                      ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                      : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                  }`}
                >
                  {role} Account
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your Kotak Securities Neo API credentials & 2FA auto-authentication.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={savingAccount}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono uppercase tracking-wider">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("master")}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  role === "master"
                    ? "bg-teal-500/15 border-teal-500/50 text-teal-300 shadow-sm shadow-teal-500/10"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>MASTER ACCOUNT</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("slave")}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  role === "slave"
                    ? "bg-sky-500/15 border-sky-500/50 text-sky-300 shadow-sm shadow-sky-500/10"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>SLAVE ACCOUNT</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Nickname */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Account Nickname <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Primary Account or Slave 1"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 font-mono focus:outline-none transition-all"
                required
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Registered Mobile No <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 font-mono focus:outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* UCC / Client Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kotak Client Code (UCC) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={ucc}
                onChange={(e) => setUcc(e.target.value.toUpperCase())}
                placeholder="e.g. KOTAK123"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 font-mono font-bold uppercase focus:outline-none transition-all"
                required
              />
            </div>

            {/* MPIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kotak 6-Digit MPIN {isEdit && <span className="text-slate-500 font-normal">(Leave blank to keep unchanged)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type={showMpin ? "text" : "password"}
                  value={mpin}
                  onChange={(e) => setMpin(e.target.value)}
                  placeholder={isEdit ? "•••••• (Unchanged)" : "6-Digit MPIN"}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-600 font-mono focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowMpin(!showMpin)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Consumer Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Kotak Neo App Consumer Key {isEdit && <span className="text-slate-500 font-normal">(Leave blank to keep unchanged)</span>}
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type={showConsumerKey ? "text" : "password"}
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                placeholder={isEdit ? "•••••••••••• (Unchanged)" : "Neo Trade API Consumer Key"}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-600 font-mono focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConsumerKey(!showConsumerKey)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showConsumerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* TOTP Secret (Auto 2FA) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>2FA TOTP Secret Key (Auto-Login)</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                Recommended
              </span>
            </div>
            <div className="relative">
              <input
                type={showTotpSecret ? "text" : "password"}
                value={totpSecret}
                onChange={(e) => setTotpSecret(e.target.value.toUpperCase())}
                placeholder="Base32 TOTP Key (e.g. JBSWY3DPEHPK3PXP)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 pr-9 py-2 text-xs text-slate-100 placeholder-slate-600 font-mono focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowTotpSecret(!showTotpSecret)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showTotpSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
              <HelpCircle className="w-3 h-3 text-slate-500 shrink-0" />
              <span>Saves manual OTP prompts during morning market login & automated session renewals.</span>
            </p>
          </div>

          {/* Multiplier (for Slaves) */}
          {role === "slave" && (
            <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">
                  Position Multiplier (Quantity Sizing)
                </label>
                <span className="text-xs font-bold text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {multiplier}x
                </span>
              </div>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="50.0"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-400">
                Master order quantity will be multiplied by <strong className="text-sky-300">{multiplier}x</strong> when copied to this slave account.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={savingAccount}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAccount}
              className={`px-5 py-2 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                role === "master"
                  ? "bg-teal-400 hover:bg-teal-300"
                  : "bg-sky-400 hover:bg-sky-300"
              }`}
            >
              {savingAccount ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserCheck className="w-3.5 h-3.5" />
              )}
              <span>{savingAccount ? "Saving Account..." : isEdit ? "Update Account" : "Save Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
