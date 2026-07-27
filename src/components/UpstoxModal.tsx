import React, { useState, useEffect } from "react";
import {
  X,
  Zap,
  Key,
  Lock,
  Eye,
  EyeOff,
  Link,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface UpstoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UpstoxModal({ isOpen, onClose, onSuccess }: UpstoxModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/upstox/config");
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey || "");
        setApiSecret(data.apiSecret || "");
        setRedirectUri(data.redirectUri || `${window.location.origin}/api/upstox/callback`);
        setAccessToken(data.accessToken || "");
        setHasToken(!!data.hasToken);
        setIsConfigured(!!data.isConfigured);
      }
    } catch (_) {}
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/upstox/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          redirectUri: redirectUri.trim(),
          accessToken: accessToken.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setHasToken(!!updated.hasToken);
        setIsConfigured(!!updated.isConfigured);
        setStatusMsg({ text: "Upstox configuration saved & .env updated successfully!", type: "success" });
        if (onSuccess) onSuccess();
      } else {
        setStatusMsg({ text: "Failed to save configuration", type: "error" });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Failed to save configuration", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleOAuthLogin = () => {
    if (!apiKey.trim()) {
      alert("Please enter and save your Upstox API Key (Client ID) first.");
      return;
    }
    window.location.href = "/api/upstox/login";
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 w-full max-w-lg space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                Upstox Historical Engine
              </h2>
              <p className="text-xs text-slate-400">
                Configure credentials & 1-click OAuth login for authentic charts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator Pill */}
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasToken ? "bg-emerald-400 animate-pulse" : isConfigured ? "bg-amber-400" : "bg-rose-400"
              }`}
            />
            <span className="text-xs font-mono font-bold text-slate-200">
              {hasToken
                ? "✓ Upstox Token Active"
                : isConfigured
                ? "⚡ Credentials Saved (Login Required)"
                : "✗ Unconfigured"}
            </span>
          </div>
          <a
            href="https://developer.upstox.com"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
          >
            <span>Developer Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-mono font-bold flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-950/80 text-rose-300 border border-rose-500/30"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Upstox API Key (Client ID)</span>
            </label>
            <input
              type="text"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. 586f...-4432-..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Upstox API Secret</span>
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                required
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="e.g. 98ab..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500 pr-9"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-amber-400" />
              <span>Upstox Redirect URI</span>
            </label>
            <input
              type="text"
              required
              value={redirectUri}
              onChange={(e) => setRedirectUri(e.target.value)}
              placeholder="e.g. https://neo-copier.duckdns.org/api/upstox/callback"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Daily Access Token (Optional Manual Paste)</span>
            </label>
            <input
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Paste Bearer eyJhbGciOi... token if available"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{saving ? "Saving..." : "Save Credentials"}</span>
            </button>

            <button
              type="button"
              onClick={handleOAuthLogin}
              className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-extrabold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>1-Click Upstox Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
