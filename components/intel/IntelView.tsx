"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Loader2, RefreshCw, Zap, ExternalLink, ChevronDown, ChevronUp,
  Cpu, Package, Rocket, Globe, Star, ArrowRight, X, Flag, Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

type Tab = "ai-market" | "tools" | "search";

interface IntelItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  importance: string;
  dateAdded: string;
}

const IMPORTANCE_COLORS: Record<string, string> = {
  hot: "bg-red-500/10 text-red-400 border-red-500/20",
  notable: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  useful: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  reference: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const IMPORTANCE_LABEL: Record<string, string> = {
  hot: "🔥 Top",
  notable: "⭐ Notable",
  useful: "✅ Useful",
  reference: "📌 Ref",
};

const TAB_CONFIG = [
  { id: "ai-market" as Tab, label: "AI Market", icon: Cpu, desc: "Indian & Global AI Intelligence" },
  { id: "tools" as Tab, label: "Tools & Platforms", icon: Package, desc: "Discover useful tools, platforms, startups" },
  { id: "search" as Tab, label: "Search & Discover", icon: Search, desc: "Research anything in depth" },
];

/* ────────── Intel Card ────────── */
function IntelCard({ item, onDeepDive }: { item: IntelItem; onDeepDive: (title: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasUrl = item.source && (item.source.startsWith("http") || item.source.startsWith("www"));

  return (
    <div className="bg-surface-2 rounded-xl border border-white/5 hover:border-brand-400/10 transition-all">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium",
                IMPORTANCE_COLORS[item.importance] || IMPORTANCE_COLORS.reference
              )}>
                {IMPORTANCE_LABEL[item.importance] || item.importance}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-white leading-snug">{item.title}</h3>
            {!expanded && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.summary}</p>}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-1" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.summary}</p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {hasUrl ? (
                <a href={item.source.startsWith("http") ? item.source : "https://" + item.source}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-brand-400 hover:underline font-medium">
                  <ExternalLink className="w-3.5 h-3.5" /> Go to Resource →
                </a>
              ) : item.source ? (
                <span className="text-xs text-zinc-500">📎 {item.source}</span>
              ) : null}
              <span className="text-[10px] text-zinc-600">
                {new Date(item.dateAdded).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDeepDive(item.title); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/20 hover:bg-violet-500/20 text-xs font-medium transition-all">
              <Zap className="w-3.5 h-3.5" /> Deep Dive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────── Section Header ────────── */
function SectionHeader({ icon: Icon, title, subtitle, color }: { icon: any; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-[10px] text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

/* ────────── Main ────────── */
export default function IntelView() {
  const [tab, setTab] = useState<Tab>("ai-market");
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [deepDive, setDeepDive] = useState<{ title: string; content: string } | null>(null);
  const [deepDiving, setDeepDiving] = useState(false);
  const [toolsItems, setToolsItems] = useState<IntelItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/intel");
      const d = await r.json();
      setItems(d.items || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateFeed = async (category: string) => {
    setGenerating(category);
    try {
      const r = await fetch("/api/intel/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-feed", topic: category }),
      });
      const d = await r.json();
      if (d.items) {
        if (category === "tools" || category === "startups") {
          setToolsItems(prev => [...d.items, ...prev]);
        } else {
          // Add to main intel
          for (const item of d.items) {
            await fetch("/api/intel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create", ...item }),
            });
          }
          await load();
        }
      }
    } catch {} finally { setGenerating(null); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const r = await fetch("/api/intel/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: searchQuery }),
      });
      setSearchResult(await r.json());
    } catch {} finally { setSearching(false); }
  };

  const handleDeepDive = async (title: string) => {
    setDeepDiving(true);
    setDeepDive({ title, content: "" });
    try {
      const r = await fetch("/api/intel/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deep-dive", query: title }),
      });
      const d = await r.json();
      setDeepDive({ title, content: d.analysis || "No analysis available." });
    } catch {
      setDeepDive({ title, content: "Failed to generate analysis. Try again." });
    } finally { setDeepDiving(false); }
  };

  const indianItems = items.filter(i => i.category === "indian");
  const globalItems = items.filter(i => i.category === "global");

  // Sort: hot first, then notable, then useful
  const sortByImportance = (a: IntelItem, b: IntelItem) => {
    const order: Record<string, number> = { hot: 0, notable: 1, useful: 2, reference: 3 };
    return (order[a.importance] ?? 3) - (order[b.importance] ?? 3);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TAB_CONFIG.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
              tab === t.id
                ? "bg-brand-400/10 text-brand-400 border-brand-400/20 shadow-[0_0_15px_rgba(212,168,83,0.05)]"
                : "bg-surface-2 text-zinc-400 border-white/5 hover:text-white hover:border-white/10"
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Deep Dive Modal */}
      {deepDive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setDeepDive(null)}>
          <div className="bg-surface-1 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2 text-xs text-violet-400 mb-1">
                  <Zap className="w-3.5 h-3.5" /> Deep Dive Analysis
                </div>
                <h2 className="text-lg font-bold text-white">{deepDive.title}</h2>
              </div>
              <button onClick={() => setDeepDive(null)} className="p-2 hover:bg-white/5 rounded-xl">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {deepDiving ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                  <span className="text-zinc-400 text-sm">Gemini is researching in depth...</span>
                  <span className="text-zinc-600 text-xs">This takes 10-20 seconds</span>
                </div>
              ) : (
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{deepDive.content}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ TAB: AI MARKET ═══════ */}
      {tab === "ai-market" && (
        <div className="space-y-6">
          {/* Action buttons */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-400" />
              <h2 className="text-lg font-bold text-white">AI Market Intel</h2>
              <span className="text-xs text-zinc-600">· {items.length} items</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => generateFeed("ai-market-indian")} disabled={!!generating}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 hover:bg-orange-500/20 text-xs font-medium transition-all disabled:opacity-40">
                {generating === "ai-market-indian" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                🇮🇳 Refresh Indian
              </button>
              <button onClick={() => generateFeed("ai-market-global")} disabled={!!generating}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 text-xs font-medium transition-all disabled:opacity-40">
                {generating === "ai-market-global" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                🌍 Refresh Global
              </button>
              <button onClick={load} className="p-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all">
                <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
          ) : (
            <>
              {/* 🇮🇳 Indian Market */}
              <div>
                <SectionHeader icon={Flag} title="🇮🇳 Indian Market" subtitle={`${indianItems.length} items · AI developments in India`} color="bg-orange-500/15 text-orange-400" />
                {indianItems.length === 0 ? (
                  <div className="text-center py-8 bg-surface-2 rounded-xl border border-white/5">
                    <p className="text-zinc-600 text-sm">No Indian market intel yet</p>
                    <button onClick={() => generateFeed("ai-market-indian")} className="text-xs text-brand-400 hover:underline mt-2">Generate with AI</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...indianItems].sort(sortByImportance).map(item => (
                      <IntelCard key={item.id} item={item} onDeepDive={handleDeepDive} />
                    ))}
                  </div>
                )}
              </div>

              {/* 🌍 Global Market */}
              <div>
                <SectionHeader icon={Globe} title="🌍 Global Market" subtitle={`${globalItems.length} items · Worldwide AI landscape`} color="bg-blue-500/15 text-blue-400" />
                {globalItems.length === 0 ? (
                  <div className="text-center py-8 bg-surface-2 rounded-xl border border-white/5">
                    <p className="text-zinc-600 text-sm">No global market intel yet</p>
                    <button onClick={() => generateFeed("ai-market-global")} className="text-xs text-brand-400 hover:underline mt-2">Generate with AI</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...globalItems].sort(sortByImportance).map(item => (
                      <IntelCard key={item.id} item={item} onDeepDive={handleDeepDive} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════ TAB: TOOLS & PLATFORMS ═══════ */}
      {tab === "tools" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Tools & Platforms</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={() => generateFeed("tools")} disabled={!!generating}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-xs font-medium transition-all disabled:opacity-40">
                {generating === "tools" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Discover Tools
              </button>
              <button onClick={() => generateFeed("startups")} disabled={!!generating}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20 text-xs font-medium transition-all disabled:opacity-40">
                {generating === "startups" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                Find Startups
              </button>
            </div>
          </div>

          {toolsItems.length === 0 ? (
            <div className="text-center py-16 bg-surface-2 rounded-xl border border-white/5">
              <Package className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 font-medium">Discover Tools, Platforms & Startups</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">
                Click "Discover Tools" to find self-hosted alternatives, open-source gems, AI platforms, and useful software.
                Click "Find Startups" to scout relevant companies.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {toolsItems.map(item => <IntelCard key={item.id} item={item} onDeepDive={handleDeepDive} />)}
            </div>
          )}
        </div>
      )}

      {/* ═══════ TAB: SEARCH & DISCOVER ═══════ */}
      {tab === "search" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Search & Discover</h2>
          </div>
          <p className="text-sm text-zinc-500">Type any topic — Gemini will research it in depth with real-time analysis.</p>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="e.g. best self-hosted CRM for agencies, latest AI model benchmarks, Postal SMTP tips..."
                className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
            </div>
            <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
              className="px-6 py-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Search
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex gap-2 flex-wrap">
            {[
              "AI website builders landscape 2026",
              "Self-hosted email marketing tools",
              "Indian SMB SaaS market size",
              "n8n vs Make.com comparison",
              "Best CRM for digital agencies",
              "AI chatbot platforms pricing",
              "Coolify vs Railway vs Render",
              "Open source alternatives to Vercel",
            ].map(q => (
              <button key={q} onClick={() => { setSearchQuery(q); }}
                className="text-[11px] px-3 py-1.5 bg-white/5 text-zinc-500 rounded-lg hover:text-zinc-200 hover:bg-white/10 transition-colors">
                {q}
              </button>
            ))}
          </div>

          {/* Search Results */}
          {searching && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-zinc-400 text-sm">Gemini is researching "{searchQuery}"...</span>
            </div>
          )}

          {searchResult && !searching && (
            <div className="bg-surface-2 rounded-xl border border-white/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-semibold text-white">Results: {searchResult.query}</h3>
                <span className="text-[10px] text-zinc-600 ml-auto">
                  {new Date(searchResult.timestamp).toLocaleTimeString("en-IN")}
                </span>
              </div>
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{searchResult.aiAnalysis}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
