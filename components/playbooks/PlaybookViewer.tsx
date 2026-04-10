"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen, Search, X, Loader2, FileText, Clock,
  ChevronRight, RefreshCw, Plus, Zap,
} from "lucide-react";
import { clsx } from "clsx";
import DocReader from "@/components/docs/DocReader";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DocItem {
  slug: string;
  filename: string;
  title: string;
  category: string;
  size: number;
  modified: string;
  preview: string;
}

type Department = "Sales" | "Marketing" | "Engineering" | "Delivery" | "Strategy";

interface StaticPlaybook {
  id: string;
  title: string;
  department: Department;
  description: string;
  readTime: string;
  emoji: string;
  isDental?: boolean;
}

interface MergedPlaybook {
  id: string;
  title: string;
  department: Department;
  description: string;
  readTime: string;
  emoji: string;
  isDental: boolean;
  slug?: string;          // if backed by a real doc
  isStatic: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEPT_STYLES: Record<Department, { badge: string; accent: string; glow: string }> = {
  Sales:       { badge: "bg-brand-400/15 text-brand-400 border-brand-400/20",       accent: "border-l-brand-400",    glow: "hover:shadow-brand-400/10" },
  Marketing:   { badge: "bg-zinc-600/15 text-zinc-300 border-zinc-600/20", accent: "border-l-zinc-500",  glow: "hover:shadow-zinc-500/10" },
  Engineering: { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", accent: "border-l-emerald-500", glow: "hover:shadow-emerald-500/10" },
  Delivery:    { badge: "bg-zinc-700/15 text-zinc-400 border-zinc-700/20",       accent: "border-l-zinc-600",    glow: "hover:shadow-zinc-600/10" },
  Strategy:    { badge: "bg-brand-400/10 text-brand-300 border-brand-400/15", accent: "border-l-brand-300",  glow: "hover:shadow-brand-300/10" },
};

const ALL_DEPARTMENTS: Department[] = ["Sales", "Marketing", "Engineering", "Delivery", "Strategy"];

const STATIC_PLAYBOOKS: StaticPlaybook[] = [
  { id: "s-cold-email",       title: "Cold Email Outreach",      department: "Sales",       description: "Jordan's 3-touch email sequence for dental clinics",                readTime: "8 min",  emoji: "📧", isDental: true },
  { id: "s-linkedin-cal",     title: "LinkedIn Content Calendar", department: "Marketing",   description: "Gary's weekly posting plan with engagement tactics",                readTime: "5 min",  emoji: "📅" },
  { id: "s-client-onboard",   title: "Client Onboarding Flow",   department: "Delivery",    description: "Jeff's 7-step process from signing to handover",                    readTime: "10 min", emoji: "🤝" },
  { id: "s-dental-pitch",     title: "Dental Clinic Pitch",      department: "Sales",       description: "Dental-specific sales approach with objection handling",             readTime: "6 min",  emoji: "🦷", isDental: true },
  { id: "s-site-build",       title: "Site Build Runbook",       department: "Engineering", description: "Linus's template fork → configure → deploy workflow",               readTime: "12 min", emoji: "🏗️" },
  { id: "s-domain-warmup",    title: "Domain Warmup Guide",      department: "Engineering", description: "21-day email warmup protocol for new domains",                      readTime: "4 min",  emoji: "🔥" },
  { id: "s-pricing-packaging", title: "Pricing & Packaging",     department: "Strategy",    description: "Standard ₹8K vs Premium ₹14K breakdown and selling points",        readTime: "3 min",  emoji: "💰" },
];

const FILTER_TABS = ["All", ...ALL_DEPARTMENTS] as const;
type FilterTab = (typeof FILTER_TABS)[number];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function guessDeptFromDoc(doc: DocItem): Department {
  const f = doc.filename.toLowerCase();
  if (/^(jordan-|outreach-|prospect-|cold-|pitch-)/.test(f)) return "Sales";
  if (/^(gary-|content-|seo-|linkedin-)/.test(f))            return "Marketing";
  if (/^(linus-|site-|build-|deploy-|domain-)/.test(f))      return "Engineering";
  if (/^(jeff-|onboard-|delivery-|sop-)/.test(f))            return "Delivery";
  if (/^(warren-|strategy-|pricing-|blueprint-)/.test(f))    return "Strategy";
  return "Strategy"; // fallback
}

function isDentalDoc(doc: DocItem): boolean {
  const text = `${doc.filename} ${doc.title} ${doc.preview}`.toLowerCase();
  return text.includes("dental") || text.includes("clinic");
}

function emojiForDept(dept: Department): string {
  const map: Record<Department, string> = { Sales: "🎯", Marketing: "📣", Engineering: "⚙️", Delivery: "📦", Strategy: "♟️" };
  return map[dept];
}

/* ------------------------------------------------------------------ */
/*  Create Modal                                                       */
/* ------------------------------------------------------------------ */

function CreatePlaybookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dept, setDept] = useState<Department>("Sales");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required"); return; }
    setSaving(true);
    setErr("");
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const res = await fetch(`/api/docs/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: `# ${title}\n\n> Department: ${dept}\n\n${body}` }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onCreated();
      onClose();
    } catch {
      setErr("Failed to save playbook. Check API connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-2 border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-400" /> Create Playbook
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-3 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Client Follow-up Sequence"
              className="w-full bg-surface-0 border border-white/5 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-brand-400/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Department</label>
            <select
              value={dept}
              onChange={(e) => setDept(e.target.value as Department)}
              className="w-full bg-surface-0 border border-white/5 rounded-lg px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-brand-400/50 transition-colors"
            >
              {ALL_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">Content</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your playbook content here (Markdown supported)..."
              rows={8}
              className="w-full bg-surface-0 border border-white/5 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-brand-400/50 transition-colors resize-none"
            />
          </div>

          {err && <p className="text-xs text-red-400">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-400 hover:bg-brand-300 text-black font-semibold rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Playbook Card                                                      */
/* ------------------------------------------------------------------ */

function PlaybookCard({ pb, onClick }: { pb: MergedPlaybook; onClick: () => void }) {
  const style = DEPT_STYLES[pb.department];
  return (
    <button
      onClick={onClick}
      className={clsx(
        "bg-surface-2 rounded-xl p-4 border-l-4 border border-white/5 hover:border-white/10",
        "transition-all duration-200 cursor-pointer group text-left w-full",
        "hover:shadow-lg hover:bg-surface-3",
        style.accent,
        style.glow,
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{pb.emoji}</span>
          <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors line-clamp-1">
            {pb.title}
          </h3>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 mt-0.5" />
      </div>
      <p className="text-xs text-zinc-500 mb-3 line-clamp-2 leading-relaxed">{pb.description}</p>
      <div className="flex items-center justify-between">
        <span className={clsx("text-[10px] font-semibold px-2 py-0.5 rounded-full border", style.badge)}>
          {pb.department}
        </span>
        <span className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {pb.readTime}
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function PlaybookViewer() {
  const [allDocs, setAllDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/docs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      setAllDocs(data.docs || []);
    } catch {
      setError("Failed to load playbooks from docs API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  /* Merge static + API playbooks */
  const playbooks = useMemo<MergedPlaybook[]>(() => {
    const merged: MergedPlaybook[] = STATIC_PLAYBOOKS.map((sp) => ({
      ...sp,
      isDental: sp.isDental ?? false,
      isStatic: true,
    }));

    // Add API docs that aren't duplicates of static ones
    const staticTitlesLower = new Set(STATIC_PLAYBOOKS.map((s) => s.title.toLowerCase()));
    for (const doc of allDocs) {
      if (staticTitlesLower.has(doc.title.toLowerCase())) continue;
      const dept = guessDeptFromDoc(doc);
      merged.push({
        id: `api-${doc.slug}`,
        title: doc.title,
        department: dept,
        description: doc.preview || "Loaded from docs",
        readTime: `${Math.max(1, Math.ceil(doc.size / 1200))} min`,
        emoji: emojiForDept(dept),
        isDental: isDentalDoc(doc),
        slug: doc.slug,
        isStatic: false,
      });
    }
    return merged;
  }, [allDocs]);

  /* Filtering */
  const filtered = useMemo(() => {
    let list = playbooks;
    if (activeTab !== "All") {
      list = list.filter((p) => p.department === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q)
      );
    }
    return list;
  }, [playbooks, activeTab, searchQuery]);

  const dentalPlaybooks = useMemo(() => filtered.filter((p) => p.isDental), [filtered]);
  const nonDentalPlaybooks = useMemo(
    () => (dentalPlaybooks.length > 0 && activeTab === "All" ? filtered.filter((p) => !p.isDental) : filtered),
    [filtered, dentalPlaybooks.length, activeTab]
  );

  const uniqueDepts = useMemo(() => new Set(playbooks.map((p) => p.department)).size, [playbooks]);

  async function openDoc(slug: string) {
    setSelectedDoc(slug);
    setDocLoading(true);
    try {
      const res = await fetch(`/api/docs/${slug}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocContent(data.content);
    } catch {
      setDocContent("# Error\n\nFailed to load document.");
    } finally {
      setDocLoading(false);
    }
  }

  function handleCardClick(pb: MergedPlaybook) {
    if (pb.slug) {
      openDoc(pb.slug);
    }
    // Static-only playbooks don't have content to open (yet)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-400/15 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Playbooks</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {loading ? "Loading..." : `${playbooks.length} Playbooks • ${uniqueDepts} Departments`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-400 hover:bg-brand-500 rounded-lg text-sm text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Playbook
          </button>
          <button
            onClick={loadDocs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors border border-white/5 disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-2 rounded-xl text-zinc-500 border border-white/5 focus-within:border-brand-400/50 transition-colors max-w-xl">
        <Search className="w-5 h-5 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search playbooks by title, description, or department..."
          className="bg-transparent outline-none text-zinc-300 placeholder-zinc-600 w-full text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Department Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => {
          const count = tab === "All" ? playbooks.length : playbooks.filter((p) => p.department === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-brand-400/20 text-brand-400 border border-brand-400/30"
                  : "bg-surface-2 text-zinc-500 hover:text-zinc-300 border border-white/5 hover:border-white/10"
              )}
            >
              {tab}
              <span className={clsx("ml-1.5", activeTab === tab ? "text-brand-300" : "text-zinc-600")}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
          <p>{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      )}

      {/* Dental Playbooks Section */}
      {!loading && dentalPlaybooks.length > 0 && activeTab === "All" && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🦷</span>
            <h2 className="text-base font-semibold text-zinc-200">Dental Playbooks</h2>
            <span className="text-xs text-zinc-600 ml-1">{dentalPlaybooks.length}</span>
            <div className="flex-1 h-px bg-white/5 ml-3" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
            {dentalPlaybooks.map((pb) => (
              <PlaybookCard key={pb.id} pb={pb} onClick={() => handleCardClick(pb)} />
            ))}
          </div>
        </div>
      )}

      {/* All / Filtered Playbooks */}
      {!loading && nonDentalPlaybooks.length > 0 && (
        <div>
          {dentalPlaybooks.length > 0 && activeTab === "All" && (
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-brand-400" />
              <h2 className="text-base font-semibold text-zinc-200">All Playbooks</h2>
              <span className="text-xs text-zinc-600 ml-1">{nonDentalPlaybooks.length}</span>
              <div className="flex-1 h-px bg-white/5 ml-3" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {nonDentalPlaybooks.map((pb) => (
              <PlaybookCard key={pb.id} pb={pb} onClick={() => handleCardClick(pb)} />
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">
            {searchQuery ? `No playbooks matching "${searchQuery}"` : "No playbooks in this category"}
          </p>
          <p className="text-xs text-zinc-600 mt-2">Try adjusting your search or filter.</p>
        </div>
      )}

      {/* Reader Panel */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedDoc(null)} />
          <div className="relative ml-auto w-full max-w-3xl bg-surface-1 border-l border-white/5 overflow-y-auto shadow-2xl">
            <div className="sticky top-0 z-10 bg-surface-1/95 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <FileText className="w-4 h-4" />
                <span className="font-mono text-xs">{selectedDoc}.md</span>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-2 hover:bg-surface-3 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="px-6 py-6">
              {docLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                </div>
              ) : (
                <DocReader content={docContent} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreatePlaybookModal
          onClose={() => setShowCreate(false)}
          onCreated={() => loadDocs()}
        />
      )}
    </div>
  );
}
