"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, FileText, Bot, Globe, Folder,
  ArrowRight, CornerDownLeft, ArrowUp, ArrowDown,
  Loader2
} from "lucide-react";
import { clsx } from "clsx";

interface SearchResult {
  type: "page" | "doc" | "agent" | "file";
  title: string;
  description: string;
  href: string;
  icon?: string;
  category?: string;
  score: number;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  page: { icon: Globe, label: "Page", color: "text-brand-400" },
  doc: { icon: FileText, label: "Document", color: "text-accent-cyan" },
  agent: { icon: Bot, label: "Agent", color: "text-accent-purple" },
  file: { icon: Folder, label: "File", color: "text-accent-orange" },
};

export default function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ⌘K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  // Search with debounce
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setActiveIndex(0);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Keyboard navigation
  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
      scrollToActive(activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
      scrollToActive(activeIndex - 1);
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex]);
    }
  }

  function scrollToActive(idx: number) {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-search-item]");
    items[idx]?.scrollIntoView({ block: "nearest" });
  }

  function navigate(result: SearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  if (!open) return null;

  // Group results by type
  const grouped: Record<string, SearchResult[]> = {};
  for (const r of results) {
    const key = r.type;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  let globalIdx = -1;

  return (
    <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative flex justify-center pt-[15vh]" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-[640px] mx-4 bg-surface-1 border border-surface-5 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-5 h-14 border-b border-surface-5">
            <Search className="w-5 h-5 text-brand-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search pages, docs, agents, files..."
              className="flex-1 bg-transparent text-white text-[15px] placeholder:text-zinc-600 outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {loading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-7 h-7 rounded-md bg-surface-3 hover:bg-surface-4 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
            {query.length < 2 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-zinc-600 text-sm">Type at least 2 characters to search</p>
                <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-zinc-700">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-3 rounded text-zinc-500 border border-surface-5">↑↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-3 rounded text-zinc-500 border border-surface-5">↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-surface-3 rounded text-zinc-500 border border-surface-5">esc</kbd>
                    Close
                  </span>
                </div>
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="px-5 py-8 text-center">
                <p className="text-zinc-500 text-sm">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-zinc-700 text-xs mt-1">Try different keywords</p>
              </div>
            ) : (
              Object.entries(grouped).map(([type, items]) => {
                const config = TYPE_CONFIG[type] || TYPE_CONFIG.page;
                return (
                  <div key={type}>
                    <div className="px-5 py-2">
                      <span className={clsx("text-[10px] font-semibold uppercase tracking-wider", config.color)}>
                        {config.label}s
                      </span>
                    </div>
                    {items.map((result) => {
                      globalIdx++;
                      const idx = globalIdx;
                      const isActive = idx === activeIndex;
                      const Icon = config.icon;

                      return (
                        <button
                          key={`${result.type}-${result.href}-${idx}`}
                          data-search-item
                          onClick={() => navigate(result)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={clsx(
                            "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                            isActive
                              ? "bg-brand-400/10"
                              : "hover:bg-surface-2"
                          )}
                        >
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            isActive ? "bg-brand-400/20" : "bg-surface-3"
                          )}>
                            <Icon className={clsx("w-4 h-4", isActive ? "text-brand-400" : "text-zinc-500")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx(
                              "text-sm font-medium truncate",
                              isActive ? "text-white" : "text-zinc-300"
                            )}>
                              {result.title}
                            </p>
                            <p className="text-[11px] text-zinc-600 truncate">
                              {result.category && (
                                <span className="text-zinc-500 mr-1.5">{result.category} ·</span>
                              )}
                              {result.description}
                            </p>
                          </div>
                          {isActive && (
                            <ArrowRight className="w-4 h-4 text-brand-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-2.5 border-t border-surface-5 bg-surface-0/50">
            <div className="flex items-center gap-3 text-[11px] text-zinc-700">
              <span className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                <ArrowDown className="w-3 h-3" />
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" />
                Open
              </span>
            </div>
            <div className="text-[10px] text-zinc-700">
              {results.length > 0 && `${results.length} result${results.length !== 1 ? "s" : ""}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
