"use client";

import { useState, useEffect } from "react";
import {
  Radio, Flame, Zap, Bookmark, ExternalLink, Plus, X, Loader2, Filter, Trash2,
} from "lucide-react";
import { clsx } from "clsx";

interface IntelItem {
  id: string; title: string; summary: string; source: string;
  category: string; importance: string; dateAdded: string;
}

const CATEGORIES = [
  { key: "all", label: "All", icon: Radio },
  { key: "ai-news", label: "AI News", icon: Zap },
  { key: "industry-trends", label: "Trends", icon: Flame },
  { key: "competitor-watch", label: "Competitors", icon: Filter },
  { key: "opportunities", label: "Opportunities", icon: Bookmark },
];

const IMPORTANCE_BADGE: Record<string, { emoji: string; color: string }> = {
  hot: { emoji: "🔥", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  notable: { emoji: "⚡", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  reference: { emoji: "📌", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
};

export default function IntelView() {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", summary: "", source: "", category: "ai-news", importance: "notable" });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/intel");
      const data = await res.json();
      setItems(data.items || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.title) return;
    setAdding(true);
    await fetch("/api/intel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", ...form }) });
    setForm({ title: "", summary: "", source: "", category: "ai-news", importance: "notable" });
    setShowAdd(false);
    await load();
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/intel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    await load();
  };

  const filtered = filter === "all" ? items : items.filter(i => i.category === filter);
  const dailyBrief = items.filter(i => i.importance === "hot").sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()).slice(0, 5);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center">
            <Radio className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">📡 Intel</h1>
            <p className="text-sm text-zinc-500">{items.length} items tracked</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-400/10 text-brand-400 rounded-xl border border-brand-400/20 hover:bg-brand-400/20 text-sm font-medium transition-all">
          <Plus className="w-4 h-4" /> Add Intel
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass rounded-xl p-5 space-y-3 animate-fadeInUp">
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
            placeholder="Title" className="w-full px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
          <textarea value={form.summary} onChange={e => setForm(f => ({...f, summary: e.target.value}))}
            placeholder="Summary" rows={2} className="w-full px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30 resize-none" />
          <div className="flex gap-3">
            <input value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))}
              placeholder="Source URL" className="flex-1 px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
            <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
              className="px-3 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200">
              <option value="ai-news">AI News</option>
              <option value="industry-trends">Trends</option>
              <option value="competitor-watch">Competitors</option>
              <option value="opportunities">Opportunities</option>
            </select>
            <select value={form.importance} onChange={e => setForm(f => ({...f, importance: e.target.value}))}
              className="px-3 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200">
              <option value="hot">🔥 Hot</option>
              <option value="notable">⚡ Notable</option>
              <option value="reference">📌 Reference</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title || adding}
              className="px-5 py-2 bg-brand-400 text-black text-sm font-semibold rounded-xl disabled:opacity-40">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
            </button>
          </div>
        </div>
      )}

      {/* Daily Brief */}
      {dailyBrief.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h2 className="text-sm font-semibold text-brand-400 mb-3 flex items-center gap-2">🔥 Daily Brief — Top Priority</h2>
          <div className="space-y-2">
            {dailyBrief.map(item => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                <span className="text-lg">🔥</span>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-white/5 w-fit">
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => setFilter(c.key)}
            className={clsx("flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
              filter === c.key ? "bg-brand-400/20 text-brand-400" : "text-zinc-500 hover:text-white"
            )}>
            <c.icon className="w-3 h-3" /> {c.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item, i) => {
            const badge = IMPORTANCE_BADGE[item.importance] || IMPORTANCE_BADGE.reference;
            return (
              <div key={item.id} className="glass rounded-xl p-4 group animate-fadeInUp" style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx("px-2 py-0.5 text-[10px] font-semibold rounded-full border", badge.color)}>
                        {badge.emoji} {item.importance}
                      </span>
                      <span className="text-[10px] text-zinc-600 capitalize">{item.category.replace("-", " ")}</span>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-600">{new Date(item.dateAdded).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                    </div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.summary && <p className="text-xs text-zinc-400 mt-1">{item.summary}</p>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.source && (
                      <a href={item.source} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 hover:bg-white/5 rounded-lg"><ExternalLink className="w-3.5 h-3.5 text-zinc-500" /></a>
                    )}
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5 text-zinc-600 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
