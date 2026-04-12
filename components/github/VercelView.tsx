"use client";

import { useState, useEffect } from "react";
import {
  Triangle, ExternalLink, Loader2, RefreshCw, Clock, ChevronLeft,
  CheckCircle, XCircle, AlertCircle, Rocket, GitCommit,
} from "lucide-react";
import { clsx } from "clsx";

interface Project {
  id: string; name: string; framework: string | null; updatedAt: number; createdAt: number;
  latestDeployment: { url: string; state: string; createdAt: number } | null;
  targets: string[]; link: any;
}

interface Deployment {
  id: string; name: string; url: string; state: string; createdAt: number; target: string;
  meta: { githubCommitSha: string | null; githubCommitMessage: string | null; githubRepo: string | null };
  source: string;
}

const STATE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  READY: { icon: CheckCircle, color: "text-emerald-400", label: "Ready" },
  ERROR: { icon: XCircle, color: "text-red-400", label: "Error" },
  BUILDING: { icon: Loader2, color: "text-amber-400", label: "Building" },
  QUEUED: { icon: Clock, color: "text-zinc-400", label: "Queued" },
  CANCELED: { icon: XCircle, color: "text-zinc-500", label: "Canceled" },
};

export default function VercelView() {
  const [accounts, setAccounts] = useState<{ key: string; label: string }[]>([]);
  const [account, setAccount] = useState("jarvis");
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projectDeployments, setProjectDeployments] = useState<Deployment[]>([]);
  const [projectLoading, setProjectLoading] = useState(false);

  const load = async (acct: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vercel?account=${acct}`);
      const data = await res.json();
      setAccounts(data.accounts || []);
      setProjects(data.projects || []);
      setDeployments(data.recentDeployments || []);
    } catch {} finally { setLoading(false); }
  };

  const loadProject = async (projectId: string) => {
    setProjectLoading(true);
    try {
      const res = await fetch(`/api/vercel?account=${account}&section=project&project=${projectId}`);
      const data = await res.json();
      setProjectDeployments(data.deployments || []);
    } catch {} finally { setProjectLoading(false); }
  };

  useEffect(() => { load(account); }, [account]);

  const handleProjectClick = (p: Project) => {
    setSelectedProject(p.id);
    loadProject(p.id);
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  /* ---- PROJECT DETAIL VIEW ---- */
  if (selectedProject) {
    const proj = projects.find(p => p.id === selectedProject);
    return (
      <div className="space-y-6 animate-fadeInUp">
        <button onClick={() => { setSelectedProject(null); setProjectDeployments([]); }}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Projects
        </button>

        {proj && (
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Triangle className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">{proj.name}</h2>
              {proj.framework && <span className="text-xs text-zinc-500 bg-surface-3 px-2 py-0.5 rounded">{proj.framework}</span>}
            </div>
            {proj.latestDeployment && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <a href={`https://${proj.latestDeployment.url}`} target="_blank" className="text-brand-400 hover:underline">{proj.latestDeployment.url}</a>
                <span>·</span>
                <span>{proj.latestDeployment.state}</span>
              </div>
            )}
          </div>
        )}

        <h3 className="text-sm font-semibold text-zinc-400">Deployments</h3>
        {projectLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
        ) : (
          <div className="space-y-2">
            {projectDeployments.map((d, i) => {
              const sc = STATE_CONFIG[d.state] || STATE_CONFIG.QUEUED;
              const Icon = sc.icon;
              return (
                <div key={d.id} className="glass rounded-xl p-4 animate-fadeInUp" style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}>
                  <div className="flex items-center gap-3">
                    <Icon className={clsx("w-4 h-4 flex-shrink-0", sc.color, d.state === "BUILDING" && "animate-spin")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a href={`https://${d.url}`} target="_blank" className="text-sm text-zinc-200 hover:text-brand-400 truncate">{d.url}</a>
                        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded", sc.color.replace("text-", "bg-").replace("400", "500/10"))}>{sc.label}</span>
                        {d.target && <span className="text-[10px] text-zinc-600">{d.target}</span>}
                      </div>
                      {d.meta.githubCommitMessage && (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500">
                          <GitCommit className="w-3 h-3" />
                          <span className="font-mono text-zinc-600">{d.meta.githubCommitSha}</span>
                          <span className="truncate">{d.meta.githubCommitMessage}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-600">{timeAgo(d.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ---- OVERVIEW ---- */
  return (
    <div className="space-y-6">
      {/* Account switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Triangle className="w-5 h-5 text-white" />
          <h2 className="text-lg font-bold text-white">Vercel</h2>
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-white/5">
            {accounts.map(a => (
              <button key={a.key} onClick={() => setAccount(a.key)}
                className={clsx("px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                  account === a.key ? "bg-brand-400/20 text-brand-400" : "text-zinc-500 hover:text-white"
                )}>{a.label}</button>
            ))}
          </div>
        </div>
        <button onClick={() => load(account)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <RefreshCw className={clsx("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-zinc-500">Projects</p>
              <p className="text-2xl font-bold text-white">{projects.length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-zinc-500">Recent Deploys</p>
              <p className="text-2xl font-bold text-brand-400">{deployments.length}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-zinc-500">Errors</p>
              <p className="text-2xl font-bold text-red-400">{deployments.filter(d => d.state === "ERROR").length}</p>
            </div>
          </div>

          {/* Projects */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Projects ({projects.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {projects.map((p, i) => {
                const st = p.latestDeployment?.state || "UNKNOWN";
                const sc = STATE_CONFIG[st] || STATE_CONFIG.QUEUED;
                return (
                  <button key={p.id} onClick={() => handleProjectClick(p)}
                    className="glass rounded-xl p-4 text-left hover:bg-white/[0.02] transition-all animate-fadeInUp"
                    style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Rocket className="w-4 h-4 text-brand-400" />
                      <span className="text-sm font-semibold text-white">{p.name}</span>
                      {p.framework && <span className="text-[10px] text-zinc-600 bg-surface-3 px-1.5 py-0.5 rounded">{p.framework}</span>}
                    </div>
                    {p.latestDeployment && (
                      <div className="flex items-center gap-2 text-[11px]">
                        <sc.icon className={clsx("w-3 h-3", sc.color)} />
                        <span className={sc.color}>{sc.label}</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-zinc-500 truncate">{p.latestDeployment.url}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent deployments */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 mb-3">Recent Deployments</h3>
            <div className="space-y-2">
              {deployments.map((d, i) => {
                const sc = STATE_CONFIG[d.state] || STATE_CONFIG.QUEUED;
                const Icon = sc.icon;
                return (
                  <div key={d.id} className="glass rounded-xl p-3 animate-fadeInUp" style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}>
                    <div className="flex items-center gap-3">
                      <Icon className={clsx("w-4 h-4 flex-shrink-0", sc.color, d.state === "BUILDING" && "animate-spin")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-white">{d.name}</span>
                          <span className={clsx("text-[10px] px-1.5 py-0.5 rounded", sc.color.replace("text-", "bg-").replace("400", "500/10"))}>{sc.label}</span>
                          {d.target && <span className="text-[10px] text-zinc-600">{d.target}</span>}
                        </div>
                        {d.meta.githubCommitMessage && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                            <span className="font-mono text-zinc-600">{d.meta.githubCommitSha}</span> {d.meta.githubCommitMessage}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-600">{timeAgo(d.createdAt)}</span>
                        <a href={`https://${d.url}`} target="_blank" className="p-1 hover:bg-white/5 rounded">
                          <ExternalLink className="w-3 h-3 text-zinc-500" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
