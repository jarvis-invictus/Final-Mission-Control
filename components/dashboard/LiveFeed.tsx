"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Loader2, FileText, Phone, Users, Server, Monitor } from "lucide-react";
import { clsx } from "clsx";

interface FeedItem {
  type: "doc_new" | "doc_updated" | "prospect_stage" | "fleet_event" | "system";
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
  meta?: Record<string, string | number>;
}

const TYPE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  doc_new: { bg: "bg-brand-400/10", border: "border-l-brand-400", text: "text-brand-400" },
  doc_updated: { bg: "bg-accent-cyan/10", border: "border-l-accent-cyan", text: "text-accent-cyan" },
  prospect_stage: { bg: "bg-accent-purple/10", border: "border-l-accent-purple", text: "text-accent-purple" },
  fleet_event: { bg: "bg-green-500/10", border: "border-l-green-500", text: "text-green-400" },
  system: { bg: "bg-amber-500/10", border: "border-l-amber-500", text: "text-amber-400" },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/feed");
      const data = await res.json();
      setItems(data.feed || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchFeed, 60000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const filtered = filter === "all"
    ? items
    : items.filter(i => i.type === filter || (filter === "docs" && (i.type === "doc_new" || i.type === "doc_updated")));

  const filters = [
    { key: "all", label: "All" },
    { key: "docs", label: "Docs" },
    { key: "prospect_stage", label: "CRM" },
    { key: "fleet_event", label: "Fleet" },
  ];

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center text-zinc-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading feed...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={clsx(
              "px-2.5 py-1 text-xs rounded-lg transition-colors",
              filter === f.key
                ? "bg-brand-400/15 text-brand-400 font-semibold"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-surface-3"
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-zinc-600">
          {filtered.length} events
        </span>
      </div>

      {/* Feed */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm text-zinc-600">
            No events in the last 3 days
          </div>
        ) : (
          filtered.slice(0, 25).map((item, i) => {
            const style = TYPE_STYLES[item.type] || TYPE_STYLES.system;
            return (
              <div
                key={`${item.type}-${item.timestamp}-${i}`}
                className={clsx(
                  "flex items-start gap-3 px-3 py-2.5 rounded-lg border-l-2 transition-colors hover:bg-surface-3/50",
                  style.border
                )}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{item.icon || "📋"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate">{item.title}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{item.description}</p>
                </div>
                <span className="text-[10px] text-zinc-600 whitespace-nowrap flex-shrink-0">
                  {timeAgo(item.timestamp)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
