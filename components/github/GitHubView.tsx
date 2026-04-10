"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Github, GitCommit, Star, GitFork, Lock, Unlock, Clock,
  ExternalLink, Loader2, RefreshCw, AlertCircle, Code2, FolderGit2,
} from "lucide-react";
import { clsx } from "clsx";

interface Repo {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string;
  isPrivate: boolean;
  url: string;
  defaultBranch: string;
  size: number;
}

interface Commit {
  repo: string;
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-brand-400",
  JavaScript: "bg-amber-400",
  Python: "bg-emerald-400",
  HTML: "bg-red-400",
  CSS: "bg-violet-400",
  Shell: "bg-zinc-400",
};

export default function GitHubView() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [totalRepos, setTotalRepos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/github");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRepos(data.repos || []);
      setCommits(data.recentCommits || []);
      setTotalRepos(data.totalRepos || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 120000); // Refresh every 2 min
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center">
            <Github className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">GitHub</h1>
            <p className="text-sm text-zinc-500">jarvis-invictus · {totalRepos} repositories</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://github.com/jarvis-invictus" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-white/5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Open GitHub
          </a>
          <button onClick={load} className="p-2 hover:bg-surface-3 rounded-lg"><RefreshCw className="w-4 h-4 text-zinc-400" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-zinc-400">{error}</p>
          <button onClick={load} className="text-xs text-brand-400 hover:underline">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* Repos */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-brand-400" /> Repositories
            </h2>
            <div className="space-y-2">
              {repos.map(repo => (
                <a key={repo.name} href={repo.url} target="_blank" rel="noopener noreferrer"
                  className="block p-4 bg-surface-2 rounded-xl border border-surface-5 hover:border-brand-400/20 transition-all group">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-zinc-200 group-hover:text-brand-400 transition-colors">{repo.name}</span>
                        {repo.isPrivate ? <Lock className="w-3 h-3 text-zinc-600" /> : <Unlock className="w-3 h-3 text-zinc-600" />}
                      </div>
                      {repo.description && <p className="text-xs text-zinc-500 line-clamp-1">{repo.description}</p>}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-brand-400 flex-shrink-0 mt-1 transition-colors" />
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-zinc-500">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <span className={clsx("w-2 h-2 rounded-full", LANG_COLORS[repo.language] || "bg-zinc-500")} />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stars}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks}</span>
                    <span>{formatSize(repo.size)}</span>
                    <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" />{relativeTime(repo.pushedAt)}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Recent Commits */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-brand-400" /> Recent Commits
            </h2>
            <div className="space-y-1">
              {commits.map((c, i) => (
                <a key={`${c.sha}-${i}`} href={c.url} target="_blank" rel="noopener noreferrer"
                  className="block p-3 bg-surface-2 rounded-lg border border-surface-5 hover:border-brand-400/20 transition-all group">
                  <div className="flex items-start gap-2">
                    <code className="text-[10px] font-mono text-brand-400 bg-brand-400/10 px-1.5 py-0.5 rounded flex-shrink-0">{c.sha}</code>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 group-hover:text-white truncate transition-colors">{c.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-600">
                        <span>{c.repo}</span>
                        <span>·</span>
                        <span>{c.author}</span>
                        <span>·</span>
                        <span>{relativeTime(c.date)}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
