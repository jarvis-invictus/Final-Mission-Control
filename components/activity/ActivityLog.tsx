"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity, Clock, FileText, Users, Zap, Settings, Loader2, AlertCircle,
  Inbox, RefreshCw, MessageSquare, Search, ChevronDown, ChevronRight,
  ExternalLink, Eye,
} from "lucide-react";
import { clsx } from "clsx";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type FeedType = "doc_new" | "doc_updated" | "prospect_stage" | "fleet_event" | "system" | "conversation";

interface FeedItem {
  type: FeedType;
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  agent?: string;
  meta?: Record<string, unknown>;
}

interface FeedResponse {
  feed: FeedItem[];
  total: number;
  agentSummary?: Record<string, number>;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  CONFIG                                                             */
/* ------------------------------------------------------------------ */

const TYPE_FILTERS = [
  { key: "all",            label: "All",           icon: Activity },
  { key: "doc",            label: "Docs",          icon: FileText },
  { key: "conversation",   label: "Conversations", icon: MessageSquare },
  { key: "prospect_stage", label: "CRM",           icon: Users },
  { key: "fleet_event",    label: "Fleet",         icon: Zap },
  { key: "system",         label: "System",        icon: Settings },
] as const;

const AGENTS = [
  { key: "all",    label: "All Agents", emoji: "👥" },
  { key: "elon",   label: "Elon",       emoji: "🎖️" },
  { key: "jarvis", label: "Jarvis",     emoji: "🏛️" },
  { key: "linus",  label: "Linus",      emoji: "⚙️" },
  { key: "jordan", label: "Jordan",     emoji: "📞" },
  { key: "gary",   label: "Gary",       emoji: "📣" },
  { key: "friend", label: "Friend",     emoji: "👋" },
  { key: "shared", label: "Shared",     emoji: "📁" },
];

type TypeFilter = typeof TYPE_FILTERS[number]["key"];

function matchesType(item: FeedItem, filter: TypeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "doc") return item.type === "doc_new" || item.type === "doc_updated";
  return item.type === filter;
}

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function typeLabel(type: FeedType): string {
  switch (type) {
    case "doc_new": return "New Doc";
    case "doc_updated": return "Updated";
    case "prospect_stage": return "CRM";
    case "fleet_event": return "Fleet";
    case "system": return "System";
    case "conversation": return "Chat";
  }
}

function typeBadgeStyle(type: FeedType): string {
  switch (type) {
    case "doc_new": return "bg-brand-500/15 text-brand-400";
    case "doc_updated": return "bg-zinc-600/15 text-zinc-400";
    case "prospect_stage": return "bg-emerald-500/15 text-emerald-400";
    case "fleet_event": return "bg-amber-500/15 text-amber-400";
    case "system": return "bg-zinc-700/15 text-zinc-500";
    case "conversation": return "bg-brand-400/15 text-brand-300";
  }
}

/** Build a link to the source of an activity item */
function getSourceLink(item: FeedItem): { href: string; label: string } | null {
  const title = item.title || "";
  const desc = item.description || "";
  const agent = item.agent || "";
  const meta = item.meta || {};

  // Document events → doc viewer
  if (item.type === "doc_new" || item.type === "doc_updated") {
    // Try to extract filename from title like "MEMORY.md" or "agent updated docs/foo.md"
    const fileMatch = title.match(/(\S+\.md)/i) || desc.match(/(\S+\.md)/i);
    if (fileMatch && agent) {
      const filename = fileMatch[1].replace(/^.*\//, "");
      return { href: `/docs?slug=${agent}__${filename.replace(".md", "")}`, label: `Open ${filename}` };
    }
    if (agent) {
      return { href: `/docs?agent=${agent}`, label: `View ${agent}'s docs` };
    }
    return { href: "/docs", label: "View Documents" };
  }

  // CRM events → CRM page
  if (item.type === "prospect_stage") {
    return { href: "/crm", label: "View CRM Pipeline" };
  }

  // Fleet events → agents page
  if (item.type === "fleet_event") {
    if (agent) return { href: `/agents?agent=${agent}`, label: `View ${agent}` };
    return { href: "/agents", label: "View Fleet" };
  }

  // Conversations → GHL
  if (item.type === "conversation") {
    return { href: "/ghl", label: "View in GHL" };
  }

  return null;
}

/** Summarize an activity item for expanded view */
function getSummary(item: FeedItem): string {
  const type = item.type;
  const title = item.title || "";
  const desc = item.description || "";
  const agent = item.agent || "system";

  if (type === "doc_new") {
    return `${agent} created a new document: "${title}". ${desc}`.trim();
  }
  if (type === "doc_updated") {
    return `${agent} updated "${title}". ${desc}`.trim();
  }
  if (type === "prospect_stage") {
    return `CRM pipeline change: ${title}. ${desc}`.trim();
  }
  if (type === "fleet_event") {
    return `Fleet event from ${agent}: ${title}. ${desc}`.trim();
  }
  if (type === "conversation") {
    return `Conversation activity: ${title}. ${desc}`.trim();
  }
  return `${title}. ${desc}`.trim();
}

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

export default function ActivityLog() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [agentSummary, setAgentSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: FeedResponse = await res.json();
      setFeed(data.feed ?? []);
      setTotal(data.total ?? 0);
      setAgentSummary(data.agentSummary ?? {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = useMemo(() => {
    let items = feed;
    if (typeFilter !== "all") items = items.filter(i => matchesType(i, typeFilter));
    if (agentFilter !== "all") items = items.filter(i => (i.agent || "shared") === agentFilter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => `${i.title} ${i.description}`.toLowerCase().includes(q));
    }
    return items;
  }, [feed, typeFilter, agentFilter, search]);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">Activity Feed</h1>
            <p className="text-xs text-zinc-500">{total} events across {Object.keys(agentSummary).length} sources</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 bg-surface-2 border border-surface-5 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30 w-40" />
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface-2 border border-white/5 text-zinc-400 hover:text-zinc-200 transition-all disabled:opacity-40">
            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
          </button>
        </div>
      </div>

      {/* Agent Filter Bar */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {AGENTS.map(a => {
          const count = a.key === "all" ? feed.length : (agentSummary[a.key] || 0);
          if (a.key !== "all" && count === 0) return null;
          return (
            <button key={a.key} onClick={() => setAgentFilter(a.key)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                agentFilter === a.key
                  ? "bg-brand-400/15 text-brand-400 border-brand-400/30"
                  : "bg-surface-2 text-zinc-400 border-white/5 hover:text-zinc-200 hover:border-white/10"
              )}>
              <span className="text-sm">{a.emoji}</span>
              {a.label}
              <span className="text-[10px] text-zinc-600">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Type Filter Tabs */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {TYPE_FILTERS.map(tab => (
          <button key={tab.key} onClick={() => setTypeFilter(tab.key)}
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
              typeFilter === tab.key
                ? "bg-surface-3 text-zinc-200 border-white/10"
                : "bg-surface-2 text-zinc-500 border-white/5 hover:text-zinc-300"
            )}>
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600 self-center">{filtered.length} items</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <span className="text-sm">Loading feed…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-zinc-400">{error}</p>
          <button onClick={load} className="text-xs text-brand-400 hover:underline">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Inbox className="w-8 h-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">No activity matches these filters</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-white/5" />
          <div className="space-y-1">
            {filtered.map((item, idx) => {
              const isExpanded = expandedIdx === idx;
              const sourceLink = getSourceLink(item);
              const summary = getSummary(item);

              return (
                <div key={idx} className="flex gap-3 items-start group">
                  <div className="relative z-10 w-9 h-9 rounded-lg bg-surface-2 border border-white/10 flex items-center justify-center flex-shrink-0 text-base group-hover:border-brand-400/30 transition-colors">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="w-full text-left bg-surface-2 border border-white/5 rounded-xl px-4 py-3 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-medium text-white truncate">{item.title}</span>
                            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-full border border-white/5 font-medium", typeBadgeStyle(item.type))}>
                              {typeLabel(item.type)}
                            </span>
                            {item.agent && item.agent !== "shared" && item.agent !== "system" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-3 text-zinc-500 border border-white/5">
                                {AGENTS.find(a => a.key === item.agent)?.emoji} {AGENTS.find(a => a.key === item.agent)?.label || item.agent}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <span className="flex items-center gap-1 text-[11px] text-zinc-600">
                            <Clock className="w-3 h-3" />
                            {relativeTime(item.timestamp)}
                          </span>
                          {isExpanded
                            ? <ChevronDown className="w-3.5 h-3.5 text-brand-400" />
                            : <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                          }
                        </div>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="mt-1 bg-surface-3 border border-white/5 rounded-xl px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* Summary */}
                        <div>
                          <p className="text-xs text-zinc-500 mb-1 font-medium">Summary</p>
                          <p className="text-sm text-zinc-300 leading-relaxed">{summary}</p>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                          <div>
                            <span className="text-zinc-600">Type: </span>
                            <span className="text-zinc-400">{typeLabel(item.type)}</span>
                          </div>
                          {item.agent && (
                            <div>
                              <span className="text-zinc-600">Agent: </span>
                              <span className="text-zinc-400">{item.agent}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-zinc-600">Time: </span>
                            <span className="text-zinc-400">
                              {new Date(item.timestamp).toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata", day: "numeric", month: "short",
                                hour: "2-digit", minute: "2-digit", hour12: true,
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Source Link */}
                        {sourceLink && (
                          <a href={sourceLink.href}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-400/10 text-brand-400 rounded-lg text-xs font-medium hover:bg-brand-400/20 transition-colors border border-brand-400/20">
                            <Eye className="w-3.5 h-3.5" />
                            {sourceLink.label}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <p className="text-center text-xs text-zinc-600 mt-6">
          Showing {filtered.length} of {total} events · Click any item for details
        </p>
      )}
    </div>
  );
}
