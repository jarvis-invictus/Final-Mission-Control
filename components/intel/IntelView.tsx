"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Loader2, RefreshCw, Zap, ExternalLink, ChevronDown, ChevronUp,
  Cpu, Package, Rocket, Globe, Star, ArrowRight, X,
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
  reference: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const TAB_CONFIG = [
  { id: "ai-market" as Tab, label: "AI Market", icon: Cpu, desc: "AI news, startups, funding" },
  { id: "tools" as Tab, label: "Tools & Platforms", icon: Package, desc: "Self-hosted, open source" },
  { id: "search" as Tab, label: "Search & Discover", icon: Search, desc: "Research anything" },
];

function IntelCard({ item, onDeepDive }: { item: IntelItem; onDeepDive: (title: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface-2 rounded-xl border border-white/5 hover:border-brand-400/10 transition-all">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border font-medium",
                IMPORTANCE_COLORS[item.importance] || IMPORTANCE_COLORS.reference
              )}>
                {item.importance === "hot" ? "🔥 HOT" : item.importance === "notable" ? "⭐ Notable" : "📌 Ref"}
              </span>
              <span className="text-[10px] text-zinc-600">{item.category}</span>
            </div>
            <h3 className="text-sm font-semibold text-white leading-snug">{item.title}</h3>
            {!expanded && (
              <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.summary}</p>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{item.summary}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {item.source && item.source.startsWith("http") ? (
                <a href={item.source} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-brand-400 hover:underline">
                  <ExternalLink className="w-3 h-3" /> Source
                </a>
              ) : (
                <span className="text-xs text-zinc-600">📎 {item.source}</span>
              )}
              <span className="text-[10px] text-zinc-600">{new Date(item.dateAdded).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </div>
            <button onClick={() => onDeepDive(item.title)}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
              <Zap className="w-3 h-3" /> Deep Dive
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IntelView() {
  const [tab, setTab] = useState<Tab>("ai-market");
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [deepDive, setDeepDive] = useState<{ title: string; content: string } | null>(null);
  const [deepDiving, setDeepDiving] = useState(false);
  const [toolsItems, setToolsItems] = useState<IntelItem[]>([]);

  // Load existing intel items
  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/intel");
      const d = await r.json();
      setItems(d.items || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  // Generate fresh AI intel
  const generateFeed = async (category: string) => {
    setGenerating(true);
    try {
      const r = await fetch("/api/intel/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-feed", topic: category }),
      });
      const d = await r.json();
      if (d.items) {
        if (category === "tools" || category === "startups") {
          setToolsItems(d.items);
        } else {
          // Save to main intel
          for (const item of d.items) {
            await fetch("/api/intel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create", ...item }),
            });
          }
          await loadItems();
        }
      }
    } catch {} finally { setGenerating(false); }
  };

  // Search
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
      const d = await r.json();
      setSearchResult(d);
    } catch {} finally { setSearching(false); }
  };

  // Deep dive
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
      setDeepDive({ title, content: "Failed to generate analysis." });
    } finally { setDeepDiving(false); }
  };

  const filteredItems = items.filter(i => {
    if (tab === "ai-market") return true; // Show all for now
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TAB_CONFIG.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border",
              tab === t.id
                ? "bg-brand-400/10 text-brand-400 border-brand-400/20"
                : "bg-surface-2 text-zinc-400 border-white/5 hover:text-white"
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="text-[10px] text-zinc-600 hidden sm:inline">· {t.desc}</span>
          </button>
        ))}
      </div>

      {/* Deep Dive Modal */}
      {deepDive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setDeepDive(null)}>
          <div className="bg-surface-1 rounded-2xl border border-white/10 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white">{deepDive.title}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">In-depth AI Analysis</p>
              </div>
              <button onClick={() => setDeepDive(null)} className="p-2 hover:bg-white/5 rounded-xl">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {deepDiving ? (
                <div className="flex items-center justify-center py-16 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                  <span className="text-zinc-400 text-sm">Researching in depth...</span>
                </div>
              ) : (
                <div className="prose prose-sm prose-invert max-w-none">
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{deepDive.content}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {tab === "ai-market" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-400" /> AI Market Intelligence
            </h2>
            <button onClick={() => generateFeed("ai-market")} disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20 hover:bg-violet-500/20 text-sm font-medium transition-all disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {generating ? "Generating..." : "AI Refresh"}
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Cpu className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No intel items yet</p>
              <button onClick={() => generateFeed("ai-market")} className="text-sm text-brand-400 hover:underline mt-2">Generate AI Market Feed</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => <IntelCard key={item.id} item={item} onDeepDive={handleDeepDive} />)}
            </div>
          )}
        </div>
      )}

      {tab === "tools" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" /> Tools & Platforms
            </h2>
            <div className="flex gap-2">
              <button onClick={() => generateFeed("tools")} disabled={generating}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-sm font-medium transition-all disabled:opacity-50">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Self-Hosted Tools
              </button>
              <button onClick={() => generateFeed("startups")} disabled={generating}
                className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 text-violet-400 rounded-xl border border-violet-500/20 text-sm font-medium transition-all disabled:opacity-50">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                Startups
              </button>
            </div>
          </div>

          {toolsItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Click a button above to discover tools & platforms</p>
              <p className="text-xs text-zinc-600 mt-1">AI will find self-hosted tools, open-source gems, and useful startups</p>
            </div>
          ) : (
            <div className="space-y-3">
              {toolsItems.map(item => <IntelCard key={item.id} item={item} onDeepDive={handleDeepDive} />)}
            </div>
          )}
        </div>
      )}

      {tab === "search" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-400" /> Search & Discover
          </h2>
          <p className="text-sm text-zinc-500">Ask anything — AI will research it in depth using real-time data.</p>

          {/* Search bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="e.g. best self-hosted CRM alternatives to HubSpot, latest AI model benchmarks..."
                className="w-full pl-10 pr-4 py-3 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
            </div>
            <button onClick={handleSearch} disabled={searching || !searchQuery.trim()}
              className="px-6 py-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 hover:bg-blue-500/20 text-sm font-medium transition-all disabled:opacity-50">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick search suggestions */}
          <div className="flex gap-2 flex-wrap">
            {[
              "Latest open source LLMs 2026",
              "Self-hosted email marketing alternatives",
              "AI website builder competitors India",
              "n8n vs Make vs Zapier comparison",
              "Best self-hosted CRM for agencies",
              "AI chatbot platforms for SMBs",
              "Postal SMTP deliverability tips",
              "Indian SaaS startups to watch",
            ].map(q => (
              <button key={q} onClick={() => { setSearchQuery(q); }}
                className="text-[10px] px-2.5 py-1 bg-white/5 text-zinc-500 rounded-lg hover:text-zinc-300 hover:bg-white/10 transition-colors">
                {q}
              </button>
            ))}
          </div>

          {/* Search Results */}
          {searching && (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              <span className="text-zinc-400 text-sm">Researching...</span>
            </div>
          )}

          {searchResult && !searching && (
            <div className="space-y-4">
              {/* AI Analysis */}
              <div className="bg-surface-2 rounded-xl border border-white/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-brand-400" />
                  <h3 className="text-sm font-semibold text-white">AI Analysis: {searchResult.query}</h3>
                </div>
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{searchResult.aiAnalysis}</div>
              </div>

              {/* Web Results */}
              {searchResult.webResults?.length > 0 && (
                <div className="bg-surface-2 rounded-xl border border-white/5 p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" /> Related Resources
                  </h3>
                  <div className="space-y-3">
                    {searchResult.webResults.map((r: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-[10px] text-zinc-600 font-mono mt-0.5">{i + 1}</span>
                        <div>
                          <p className="text-sm text-zinc-200">{r.title}</p>
                          {r.summary !== r.title && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{r.summary}</p>}
                          {r.source && (
                            <a href={r.source} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-brand-400 hover:underline">{r.source}</a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
