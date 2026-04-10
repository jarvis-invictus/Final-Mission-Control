"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Globe, Search, ExternalLink, Loader2, RefreshCw, Star, Eye,
  ChevronRight, Filter, X, Layout, Grid3X3, List,
} from "lucide-react";
import { clsx } from "clsx";

/* ================================================================ */
/*  TYPES                                                            */
/* ================================================================ */

interface DemoVariant { filename: string; url: string; label: string; }

interface DemoNiche {
  id: string; name: string; emoji: string; category: string;
  tier: string; region: string[]; seasonality: string;
  variants: DemoVariant[]; totalVariants: number;
}

interface DemoStats {
  totalNiches: number; totalVariants: number;
  featured: number; ready: number; draft: number; archive: number;
  categories: { name: string; emoji: string; count: number }[];
}

/* ================================================================ */
/*  CONFIG                                                            */
/* ================================================================ */

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  featured: { label: "⭐ Featured", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  ready:    { label: "✅ Ready", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  draft:    { label: "📝 Draft", color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20" },
  archive:  { label: "📦 Archive", color: "text-zinc-600", bg: "bg-zinc-700/10 border-zinc-700/20" },
};

/* ================================================================ */
/*  MAIN COMPONENT                                                     */
/* ================================================================ */

export default function DemoGallery() {
  const [niches, setNiches] = useState<DemoNiche[]>([]);
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("visible"); // "all" | "visible" | "featured" | "ready" | "draft"
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/demos");
      const data = await res.json();
      setNiches(data.niches || []);
      setStats(data.stats || null);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let items = niches;

    // Tier filter — "visible" hides archive
    if (tierFilter === "visible") items = items.filter(n => n.tier !== "archive");
    else if (tierFilter !== "all") items = items.filter(n => n.tier === tierFilter);

    // Category filter
    if (categoryFilter !== "all") items = items.filter(n => n.category === categoryFilter);

    // Search
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.id.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.region.some(r => r.toLowerCase().includes(q))
      );
    }

    return items;
  }, [niches, search, categoryFilter, tierFilter]);

  // Group by category for display
  const groupedByCategory = useMemo(() => {
    const map: Record<string, DemoNiche[]> = {};
    for (const n of filtered) {
      if (!map[n.category]) map[n.category] = [];
      map[n.category].push(n);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const activeNiche = useMemo(() => {
    if (!selectedNiche) return null;
    return niches.find(n => n.id === selectedNiche);
  }, [niches, selectedNiche]);

  return (
    <div className="p-6 space-y-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Demo Gallery</h1>
            <p className="text-sm text-zinc-500">
              {stats ? `${stats.featured} featured · ${stats.ready} ready · ${stats.totalVariants} variants` : "Loading..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search niches, categories, regions..."
              className="pl-8 pr-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30 w-64" />
          </div>
          <div className="flex border border-surface-5 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={clsx("p-2", viewMode === "grid" ? "bg-brand-400/10 text-brand-400" : "text-zinc-500 hover:text-zinc-300")}>
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode("list")} className={clsx("p-2", viewMode === "list" ? "bg-brand-400/10 text-brand-400" : "text-zinc-500 hover:text-zinc-300")}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <a href="https://demo.invictus-ai.in" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 border border-white/5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Open All
          </a>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-4 flex-wrap items-start">
        {/* Tier Filter */}
        <div className="flex gap-1">
          {[
            { key: "visible", label: "Curated", count: niches.filter(n => n.tier !== "archive").length },
            { key: "featured", label: "⭐ Featured", count: stats?.featured || 0 },
            { key: "ready", label: "✅ Ready", count: stats?.ready || 0 },
            { key: "draft", label: "📝 Draft", count: stats?.draft || 0 },
            { key: "all", label: "All", count: niches.length },
          ].map(f => (
            <button key={f.key} onClick={() => setTierFilter(f.key)}
              className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                tierFilter === f.key ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "bg-surface-2 text-zinc-500 border-white/5 hover:text-zinc-300"
              )}>
              {f.label} <span className="text-zinc-600 ml-0.5">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setCategoryFilter("all")}
            className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              categoryFilter === "all" ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "bg-surface-2 text-zinc-500 border-white/5 hover:text-zinc-300"
            )}>All Categories</button>
          {(stats?.categories || []).map(cat => (
            <button key={cat.name} onClick={() => setCategoryFilter(cat.name)}
              className={clsx("px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                categoryFilter === cat.name ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "bg-surface-2 text-zinc-500 border-white/5 hover:text-zinc-300"
              )}>
              {cat.emoji} {cat.name} <span className="text-zinc-600 ml-0.5">{cat.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="text-xs text-zinc-600">
        Showing {filtered.length} niche{filtered.length !== 1 ? "s" : ""} · {filtered.reduce((s, n) => s + n.totalVariants, 0)} variants
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : (
        <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
          {/* Niche List/Grid */}
          <div className={clsx("overflow-y-auto", previewUrl ? "w-96 flex-shrink-0" : "flex-1")}>
            {groupedByCategory.map(([category, catNiches]) => (
              <div key={category} className="mb-6">
                <h2 className="text-sm font-semibold text-zinc-400 mb-2 flex items-center gap-2">
                  <span>{stats?.categories.find(c => c.name === category)?.emoji}</span>
                  {category}
                  <span className="text-zinc-600 text-xs font-normal">({catNiches.length})</span>
                </h2>
                <div className={clsx(
                  viewMode === "grid"
                    ? previewUrl ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2"
                    : "space-y-1"
                )}>
                  {catNiches.map(niche => {
                    const tier = TIER_CONFIG[niche.tier] || TIER_CONFIG.archive;
                    const isSelected = selectedNiche === niche.id;

                    if (viewMode === "list") {
                      return (
                        <button key={niche.id}
                          onClick={() => {
                            setSelectedNiche(isSelected ? null : niche.id);
                            if (!isSelected && niche.variants[0]) setPreviewUrl(niche.variants[0].url);
                          }}
                          className={clsx("w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all",
                            isSelected ? "bg-brand-400/10 border-brand-400/30" : "bg-surface-2 border-surface-5 hover:border-brand-400/20"
                          )}>
                          <span className="text-lg">{niche.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-zinc-200">{niche.name}</span>
                            <span className="text-[10px] text-zinc-600 ml-2">{niche.totalVariants} variants</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {niche.region.slice(0, 2).map(r => (
                              <span key={r} className="text-[10px] px-1.5 py-0.5 bg-surface-3 text-zinc-500 rounded">{r}</span>
                            ))}
                            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border", tier.bg, tier.color)}>{tier.label}</span>
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button key={niche.id}
                        onClick={() => {
                          setSelectedNiche(isSelected ? null : niche.id);
                          if (!isSelected && niche.variants[0]) setPreviewUrl(niche.variants[0].url);
                        }}
                        className={clsx("text-left p-4 rounded-xl border transition-all",
                          isSelected ? "bg-brand-400/10 border-brand-400/30" : "bg-surface-2 border-surface-5 hover:border-brand-400/20"
                        )}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{niche.emoji}</span>
                            <h3 className="text-sm font-semibold text-zinc-200">{niche.name}</h3>
                          </div>
                          <span className={clsx("text-[9px] px-1.5 py-0.5 rounded border", tier.bg, tier.color)}>{niche.tier === "featured" ? "⭐" : niche.tier === "ready" ? "✅" : "📝"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                          <span>{niche.totalVariants} variant{niche.totalVariants !== 1 ? "s" : ""}</span>
                          {niche.region.slice(0, 2).map(r => (
                            <span key={r} className="px-1.5 py-0.5 bg-surface-3 rounded text-zinc-500">{r}</span>
                          ))}
                        </div>

                        {/* Expanded Variants */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-white/5 space-y-1" onClick={e => e.stopPropagation()}>
                            {niche.variants.map(v => (
                              <button key={v.filename}
                                onClick={() => setPreviewUrl(v.url)}
                                className={clsx("w-full text-left flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors",
                                  previewUrl === v.url ? "bg-brand-400/10 text-brand-400" : "text-zinc-400 hover:bg-surface-3 hover:text-zinc-200"
                                )}>
                                <span className="truncate">{v.label}</span>
                                <ExternalLink className="w-3 h-3 opacity-50 flex-shrink-0" />
                              </button>
                            ))}
                            <a href={niche.variants[0]?.url} target="_blank" rel="noopener noreferrer"
                              className="block text-center text-[10px] text-brand-400 hover:underline mt-2">
                              Open in new tab ↗
                            </a>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Preview Panel */}
          {previewUrl && (
            <div className="flex-1 bg-surface-2 rounded-xl border border-surface-5 overflow-hidden flex flex-col min-w-0">
              <div className="flex items-center justify-between px-4 py-2 border-b border-surface-5 bg-surface-3/50">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
                  </div>
                  <span className="text-[11px] text-zinc-500 truncate">{previewUrl}</span>
                </div>
                <div className="flex items-center gap-1">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                    className="p-1 hover:bg-surface-4 rounded text-zinc-400 hover:text-white">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => { setPreviewUrl(null); setSelectedNiche(null); }}
                    className="p-1 hover:bg-surface-4 rounded text-zinc-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <iframe src={previewUrl} className="flex-1 w-full bg-white" title="Demo Preview" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
