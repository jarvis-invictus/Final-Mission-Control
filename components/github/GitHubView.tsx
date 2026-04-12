"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Github, GitCommit, Star, GitFork, Lock, Unlock, Clock,
  ExternalLink, Loader2, RefreshCw, AlertCircle, Code2, FolderGit2,
  ChevronLeft, FileText, GitBranch, ArrowRightLeft, Eye,
} from "lucide-react";
import { clsx } from "clsx";

/* ============================================
   TYPES
   ============================================ */
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
  topics?: string[];
}

interface Commit {
  repo: string;
  sha: string;
  fullSha?: string;
  message: string;
  fullMessage?: string;
  author: string;
  authorAvatar?: string;
  date: string;
  url: string;
}

interface RepoDetail {
  repo: Repo & { fullName: string; createdAt: string };
  commits: Commit[];
  branches: { name: string; protected: boolean }[];
  readme: string;
}

/* ============================================
   HELPERS
   ============================================ */
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
  TypeScript: "bg-brand-400", JavaScript: "bg-amber-400", Python: "bg-emerald-400",
  HTML: "bg-red-400", CSS: "bg-violet-400", Shell: "bg-zinc-400",
};

/* ============================================
   MAIN COMPONENT
   ============================================ */
export default function GitHubView() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [currentAccount, setCurrentAccount] = useState("jarvis-invictus");
  const [totalRepos, setTotalRepos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Detail view state */
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoDetail, setRepoDetail] = useState<RepoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* Load overview */
  const loadOverview = useCallback(async (account?: string) => {
    const acct = account || currentAccount;
    try {
      setError("");
      setLoading(true);
      const res = await fetch(`/api/github?account=${acct}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRepos(data.repos || []);
      setCommits(data.recentCommits || []);
      setTotalRepos(data.totalRepos || 0);
      setAccounts(data.accounts || [acct]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [currentAccount]);

  /* Load repo detail */
  const loadRepoDetail = async (repoName: string) => {
    setSelectedRepo(repoName);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/github?account=${currentAccount}&section=repo&repo=${repoName}`);
      const data = await res.json();
      setRepoDetail(data);
    } catch {
      setRepoDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  /* Switch account */
  const switchAccount = (acct: string) => {
    setCurrentAccount(acct);
    setSelectedRepo(null);
    setRepoDetail(null);
    loadOverview(acct);
  };

  useEffect(() => { loadOverview(); }, [loadOverview]);

  /* ============ REPO DETAIL VIEW ============ */
  if (selectedRepo) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button onClick={() => { setSelectedRepo(null); setRepoDetail(null); }}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to repositories
        </button>

        {detailLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          </div>
        ) : repoDetail?.repo ? (
          <>
            {/* Repo header */}
            <div className="glass rounded-2xl p-6 animate-fadeInUp">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FolderGit2 className="w-6 h-6 text-brand-400" />
                    <h1 className="text-2xl font-bold text-white">{repoDetail.repo.name}</h1>
                    {repoDetail.repo.isPrivate
                      ? <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">Private</span>
                      : <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">Public</span>
                    }
                  </div>
                  {repoDetail.repo.description && (
                    <p className="text-sm text-zinc-400 mb-3">{repoDetail.repo.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    {repoDetail.repo.language && (
                      <span className="flex items-center gap-1.5">
                        <span className={clsx("w-2.5 h-2.5 rounded-full", LANG_COLORS[repoDetail.repo.language] || "bg-zinc-500")} />
                        {repoDetail.repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{repoDetail.repo.stars}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" />{repoDetail.repo.forks}</span>
                    <span className="flex items-center gap-1"><GitBranch className="w-3.5 h-3.5" />{repoDetail.branches?.length || 0} branches</span>
                    <span>{formatSize(repoDetail.repo.size)}</span>
                    <span>Created {new Date(repoDetail.repo.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  {repoDetail.repo.topics && repoDetail.repo.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {repoDetail.repo.topics.map(t => (
                        <span key={t} className="px-2 py-0.5 text-[10px] bg-brand-400/10 text-brand-400 rounded-full border border-brand-400/20">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <a href={repoDetail.repo.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Open on GitHub
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
              {/* Commits */}
              <div className="animate-fadeInUp" style={{ animationDelay: "0.1s", opacity: 0 }}>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <GitCommit className="w-5 h-5 text-brand-400" /> Recent Commits ({repoDetail.commits?.length || 0})
                </h2>
                <div className="space-y-2">
                  {(repoDetail.commits || []).map((c, i) => (
                    <a key={`${c.sha}-${i}`} href={c.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3.5 glass rounded-xl hover:border-brand-400/20 transition-all group">
                      <code className="text-[10px] font-mono text-brand-400 bg-brand-400/10 px-2 py-1 rounded flex-shrink-0 mt-0.5">{c.sha}</code>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200 group-hover:text-white transition-colors">{c.message}</p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-zinc-600">
                          <span className="text-zinc-400">{c.author}</span>
                          <span>·</span>
                          <span>{relativeTime(c.date)}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                  {(!repoDetail.commits || repoDetail.commits.length === 0) && (
                    <p className="text-sm text-zinc-500 py-4 text-center">No commits found</p>
                  )}
                </div>
              </div>

              {/* README */}
              <div className="animate-fadeInUp" style={{ animationDelay: "0.2s", opacity: 0 }}>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-400" /> README
                </h2>
                <div className="glass rounded-xl p-5">
                  {repoDetail.readme ? (
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] overflow-y-auto">
                      {repoDetail.readme}
                    </pre>
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-8">No README found</p>
                  )}
                </div>

                {/* Branches */}
                {repoDetail.branches && repoDetail.branches.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                      <GitBranch className="w-4 h-4 text-brand-400" /> Branches
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {repoDetail.branches.map(b => (
                        <span key={b.name} className={clsx(
                          "px-2.5 py-1 text-[11px] rounded-lg border",
                          b.protected ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-surface-3 text-zinc-400 border-white/5"
                        )}>
                          {b.name} {b.protected && "🔒"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16 text-zinc-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-red-400" />
            <p>Failed to load repository details</p>
          </div>
        )}
      </div>
    );
  }

  /* ============ OVERVIEW VIEW ============ */
  return (
    <div className="space-y-6">
      {/* Header with account switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center">
            <Github className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">GitHub</h1>
            <p className="text-sm text-zinc-500">{currentAccount} · {totalRepos} repositories</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Account Switcher */}
          {accounts.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-surface-2 border border-white/5 rounded-lg">
              <ArrowRightLeft className="w-3 h-3 text-zinc-500 mr-1" />
              {accounts.map(acct => (
                <button key={acct} onClick={() => switchAccount(acct)}
                  className={clsx(
                    "px-2.5 py-1 text-[11px] rounded-md transition-all",
                    acct === currentAccount
                      ? "bg-brand-400/20 text-brand-400 font-semibold"
                      : "text-zinc-500 hover:text-white hover:bg-white/5"
                  )}>
                  {acct}
                </button>
              ))}
            </div>
          )}
          <a href={`https://github.com/${currentAccount}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-white/5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Open GitHub
          </a>
          <button onClick={() => loadOverview()} className="p-2 hover:bg-surface-3 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-zinc-400">{error}</p>
          <button onClick={() => loadOverview()} className="text-xs text-brand-400 hover:underline">Retry</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* Repos — clickable cards */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-brand-400" /> Repositories
            </h2>
            <div className="space-y-2">
              {repos.map((repo, i) => (
                <button key={repo.name} onClick={() => loadRepoDetail(repo.name)}
                  className={clsx(
                    "w-full text-left p-4 glass rounded-xl hover:border-brand-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.05)] transition-all group animate-fadeInUp",
                  )}
                  style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-zinc-200 group-hover:text-brand-400 transition-colors">{repo.name}</span>
                        {repo.isPrivate ? <Lock className="w-3 h-3 text-zinc-600" /> : <Unlock className="w-3 h-3 text-zinc-600" />}
                      </div>
                      {repo.description && <p className="text-xs text-zinc-500 line-clamp-1">{repo.description}</p>}
                    </div>
                    <Eye className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 flex-shrink-0 mt-1 transition-colors" />
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
                </button>
              ))}
            </div>
          </div>

          {/* Recent Commits sidebar */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-brand-400" /> Recent Commits
            </h2>
            <div className="space-y-1.5">
              {commits.map((c, i) => (
                <a key={`${c.sha}-${i}`} href={c.url} target="_blank" rel="noopener noreferrer"
                  className="block p-3 glass rounded-lg hover:border-brand-400/20 transition-all group">
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
