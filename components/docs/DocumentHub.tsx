"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText, Search, FolderOpen, ChevronRight, ChevronDown,
  Clock, Loader2, AlertCircle, Inbox, ArrowLeft, RefreshCw,
  Menu, X,
} from "lucide-react";
import { clsx } from "clsx";
import DocReader from "./DocReader";

/* ================================================================ */
/*  TYPES                                                            */
/* ================================================================ */

interface DocItem {
  slug: string;
  filename: string;
  title: string;
  category: string;
  agent: string;
  size: number;
  modified: string;
  preview: string;
  wordCount: number;
}

/* ================================================================ */
/*  CONSTANTS                                                        */
/* ================================================================ */

const AGENT_META: Record<string, { emoji: string; label: string }> = {
  shared: { emoji: "📁", label: "Shared Docs" },
  elon: { emoji: "🎖️", label: "Elon" },
  jarvis: { emoji: "🤖", label: "Jarvis" },
  linus: { emoji: "⚙️", label: "Linus" },
  jordan: { emoji: "📞", label: "Jordan" },
  gary: { emoji: "📣", label: "Gary" },
  friend: { emoji: "👋", label: "Friend" },
};

/* ================================================================ */
/*  HELPERS                                                          */
/* ================================================================ */

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ================================================================ */
/*  COMPONENT                                                        */
/* ================================================================ */

export default function DocumentHub() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>("");
  const [docLoading, setDocLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/docs");
      const data = await res.json();
      setDocs(data.docs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load docs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // Group docs by agent
  const agentGroups = useMemo(() => {
    const groups: Record<string, DocItem[]> = {};
    for (const doc of docs) {
      const key = doc.agent || "shared";
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    }
    // Sort each group by modified desc
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    }
    return groups;
  }, [docs]);

  // Agents that have docs (ordered)
  const agentKeys = useMemo(() => {
    const order = ["shared", "elon", "jarvis", "linus", "jordan", "gary", "friend"];
    return order.filter(k => agentGroups[k]?.length > 0);
  }, [agentGroups]);

  // Filtered docs
  const filteredDocs = useMemo(() => {
    let result = selectedAgent === "all" ? docs : (agentGroups[selectedAgent] || []);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        `${d.filename} ${d.title} ${d.preview}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [docs, agentGroups, selectedAgent, search]);

  // Load doc content
  const openDoc = useCallback(async (slug: string) => {
    setSelectedDoc(slug);
    setDocLoading(true);
    try {
      const res = await fetch(`/api/docs/${slug}`);
      const data = await res.json();
      setDocContent(data.content || "No content available");
    } catch {
      setDocContent("Failed to load document content");
    } finally {
      setDocLoading(false);
    }
  }, []);

  // Doc reader view
  if (selectedDoc) {
    const doc = docs.find(d => d.slug === selectedDoc);
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedDoc(null)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-brand-400 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to documents
        </button>
        <div className="bg-surface-2 rounded-xl border border-surface-5 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl">{AGENT_META[doc?.agent || "shared"]?.emoji || "📄"}</span>
            <div>
              <h1 className="text-xl font-bold text-white">{doc?.title || selectedDoc}</h1>
              <p className="text-xs text-zinc-500 mt-1">
                {doc?.filename} · {formatSize(doc?.size || 0)} · {doc?.wordCount || 0} words · {formatDate(doc?.modified || "")}
              </p>
            </div>
          </div>
          {docLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <DocReader content={docContent} title={doc?.title} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar Toggle (mobile) */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-20 p-2 bg-surface-2 rounded-lg border border-surface-5"
      >
        {sidebarOpen ? <X className="w-4 h-4 text-zinc-400" /> : <Menu className="w-4 h-4 text-zinc-400" />}
      </button>

      {/* Left Sidebar — Folder Tree */}
      <div className={clsx(
        "w-64 border-r border-surface-5 bg-surface-1 flex-shrink-0 overflow-y-auto",
        "transition-all duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "fixed lg:relative z-10 h-full"
      )}>
        <div className="p-4">
          <h2 className="text-sm font-bold text-zinc-300 mb-4 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-brand-400" />
            Documents
          </h2>

          {/* All docs */}
          <button
            onClick={() => setSelectedAgent("all")}
            className={clsx(
              "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
              selectedAgent === "all"
                ? "bg-brand-400/10 text-brand-400 border border-brand-400/20"
                : "text-zinc-400 hover:text-zinc-300 hover:bg-surface-3"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Documents</span>
            <span className="ml-auto text-xs text-zinc-600">{docs.length}</span>
          </button>

          <div className="h-px bg-surface-5 my-3" />

          {/* Agent folders */}
          {agentKeys.map(key => {
            const meta = AGENT_META[key] || { emoji: "📂", label: key };
            const count = agentGroups[key]?.length || 0;
            return (
              <button
                key={key}
                onClick={() => setSelectedAgent(key)}
                className={clsx(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1",
                  selectedAgent === key
                    ? "bg-brand-400/10 text-brand-400 border border-brand-400/20"
                    : "text-zinc-400 hover:text-zinc-300 hover:bg-surface-3"
                )}
              >
                <span className="text-base">{meta.emoji}</span>
                <span>{meta.label}</span>
                <span className="ml-auto text-xs text-zinc-600">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Panel — Doc List */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-brand-400" />
              {selectedAgent === "all" ? "All Documents" : (AGENT_META[selectedAgent]?.label || selectedAgent)}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">{filteredDocs.length} documents</p>
          </div>
          <button onClick={fetchDocs} className="p-2 hover:bg-surface-3 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center gap-2 py-12 justify-center text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading documents...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-12 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Inbox className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-500">No documents found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredDocs.map(doc => (
              <button
                key={`${doc.agent}-${doc.slug}`}
                onClick={() => openDoc(doc.slug)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-surface-2 hover:bg-surface-3 border border-surface-5 hover:border-brand-400/20 rounded-lg transition-all text-left group"
              >
                <FileText className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 flex-shrink-0 transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">{doc.title}</span>
                    {selectedAgent === "all" && doc.agent !== "shared" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-zinc-500 border border-surface-5 flex-shrink-0">
                        {AGENT_META[doc.agent]?.emoji} {AGENT_META[doc.agent]?.label || doc.agent}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 truncate mt-0.5">{doc.preview}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-600 flex-shrink-0">
                  <span>{formatSize(doc.size)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(doc.modified)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
