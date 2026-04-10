"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Zap, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError("Access denied. Invalid clearance code.");
        setPassword("");
      }
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      {/* Background grid effect */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Radial glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-400/5 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-brand-400 flex items-center justify-center mb-5 shadow-lg shadow-brand-400/20">
            <Zap className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Invictus AI
          </h1>
          <p className="text-sm text-zinc-500 mt-1 uppercase tracking-widest">
            Mission Control
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-1 border border-white/5 rounded-2xl p-8">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-zinc-500" />
            <p className="text-sm text-zinc-400">
              Enter clearance code to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="Clearance code"
                autoFocus
                className="w-full px-4 py-3 bg-surface-2 border border-white/5 rounded-xl text-white placeholder-zinc-600 text-sm outline-none focus:border-brand-400/50 focus:ring-1 focus:ring-brand-400/20 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-danger/10 border border-danger/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-400 hover:bg-brand-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-black font-semibold text-sm font-medium transition-all"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  Enter Mission Control
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}
