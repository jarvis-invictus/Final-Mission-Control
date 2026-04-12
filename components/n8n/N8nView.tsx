"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Workflow, ExternalLink, Loader2, Clock, Zap, Filter,
  CheckCircle, Settings, Users, BarChart3, Link2, Rocket,
  Youtube, Download, RefreshCw, Bot, FileText, TrendingUp, X,
} from "lucide-react";
import { clsx } from "clsx";

interface Template {
  id: string;
  name: string;
  title?: string;
  description: string;
  creator?: string;
  youtubeUrl?: string;
  templateUrl?: string;
  category: string;
  niche: string;
  complexity: string;
  isDeployed?: boolean;
  source?: string;
  // Old format compat
  nodes?: string[];
  estimatedSetupMin?: number;
  tags?: string[];
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  "lead-gen":   { icon: Zap,         color: "text-emerald-400", label: "Lead Gen" },
  "onboarding": { icon: Users,       color: "text-blue-400",    label: "Onboarding" },
  "follow-up":  { icon: Clock,       color: "text-amber-400",   label: "Follow-Up" },
  "reporting":  { icon: BarChart3,   color: "text-violet-400",  label: "Reporting" },
  "internal":   { icon: Settings,    color: "text-zinc-400",    label: "Internal" },
  "ai-agent":   { icon: Bot,         color: "text-brand-400",   label: "AI Agent" },
  "content":    { icon: FileText,    color: "text-pink-400",    label: "Content" },
  "automation": { icon: TrendingUp,  color: "text-cyan-400",    label: "Automation" },
  "integration":{ icon: Link2,       color: "text-cyan-400",    label: "Integration" },
};

const COMPLEXITY_BADGE: Record<string, string> = {
  simple:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  advanced: "bg-red-500/10 text-red-400 border-red-500/20",
};

const ALL_CATEGORIES = ["all", "ai-agent", "lead-gen", "onboarding", "follow-up", "content", "automation", "reporting", "internal"];
const ALL_NICHES = ["all", "dental", "ca", "education", "lawyer"];

export default function N8nView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterNiche, setFilterNiche] = useState("all");
  const [n8nUrl, setN8nUrl] = useState("https://n8n.invictus-ai.in");
  const [n8nConnected, setN8nConnected] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [deployedIds, setDeployedIds] = useState<Set<string>>(new Set<string>());
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [workflowDetail, setWorkflowDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch("/api/n8n").then(r => r.json());
      setTemplates(d.templates || []);
      setN8nUrl(d.n8nUrl || "https://n8n.invictus-ai.in");
      setN8nConnected(d.n8nConnected || false);
      // Mark already deployed
      const deployed = new Set<string>(
        (d.templates || []).filter((t: Template) => t.isDeployed).map((t: Template) => t.id as string)
      );
      setDeployedIds(deployed as Set<string>);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = templates.filter(t => {
    const catMatch = filterCategory === "all" || t.category === filterCategory;
    const nicheMatch = filterNiche === "all" || t.niche === filterNiche || t.niche === "all";
    const searchMatch = !search || `${t.name} ${t.description} ${t.creator}`.toLowerCase().includes(search.toLowerCase());
    return catMatch && nicheMatch && searchMatch;
  });

  const handleSelect = async (template: Template) => {
    setSelectedTemplate(template);
    setWorkflowDetail(null);
    if (template.templateUrl) {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/n8n?section=detail&templateUrl=${encodeURIComponent(template.templateUrl)}`);
        const d = await res.json();
        if (!d.error) setWorkflowDetail(d);
      } catch {} finally { setDetailLoading(false); }
    }
  };

  const handleDeploy = async (template: Template) => {
    if (deployingId) return;
    setDeployingId(template.id);
    try {
      const res = await fetch("/api/n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deploy",
          templateId: template.id,
          templateName: template.name,
          templateUrl: template.templateUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDeployedIds(prev => new Set([...prev, template.id]));
        // Open the newly created workflow in n8n
        if (data.n8nUrl) window.open(data.n8nUrl, "_blank");
      } else {
        alert(data.error || "Deploy failed");
      }
    } catch {
      alert("Deploy failed — check n8n connection");
    }
    setDeployingId(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

      {/* Template Detail Panel */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm" onClick={() => setSelectedTemplate(null)}>
          <div className="w-full max-w-lg h-full bg-[#0a0a0f] border-l border-white/10 overflow-y-auto p-6 space-y-5 animate-slideInRight"
            onClick={e => e.stopPropagation()}>
            {/* Panel header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white leading-snug">{selectedTemplate.name}</h2>
                {selectedTemplate.creator && <p className="text-xs text-zinc-500 mt-1">by {selectedTemplate.creator}</p>}
              </div>
              <button onClick={() => setSelectedTemplate(null)} className="p-1.5 hover:bg-white/5 rounded-lg flex-shrink-0">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-zinc-400 leading-relaxed">{selectedTemplate.description}</p>

            {/* Workflow requirements (from parsed JSON) */}
            {detailLoading ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Parsing workflow…
              </div>
            ) : workflowDetail ? (
              <div className="space-y-4">
                <div className="glass rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">📊 Workflow Stats</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface-3 rounded-lg p-2.5">
                      <p className="text-zinc-500">Nodes</p>
                      <p className="text-white font-bold text-lg">{workflowDetail.nodeCount}</p>
                    </div>
                    <div className="bg-surface-3 rounded-lg p-2.5">
                      <p className="text-zinc-500">Triggers</p>
                      <p className="text-white font-bold text-lg">{workflowDetail.triggers?.length || 0}</p>
                    </div>
                  </div>
                </div>

                {workflowDetail.credentials?.length > 0 && (
                  <div className="glass rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">🔑 Required Credentials</p>
                    <div className="flex flex-wrap gap-2">
                      {workflowDetail.credentials.map((c: string) => (
                        <span key={c} className="px-2.5 py-1 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg font-mono">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {workflowDetail.integrations?.length > 0 && (
                  <div className="glass rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">🔌 Integrations Used</p>
                    <div className="flex flex-wrap gap-2">
                      {workflowDetail.integrations.map((i: string) => (
                        <span key={i} className="px-2.5 py-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg capitalize">
                          {i}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {workflowDetail.triggers?.length > 0 && (
                  <div className="glass rounded-xl p-4 space-y-2">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">⚡ Triggers</p>
                    <div className="flex flex-wrap gap-2">
                      {workflowDetail.triggers.map((t: string) => (
                        <span key={t} className="px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-mono text-[10px]">
                          {t.split(".").pop()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedTemplate.templateUrl ? (
              <p className="text-xs text-zinc-600">Could not parse workflow file.</p>
            ) : null}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {selectedTemplate.youtubeUrl && (
                <a href={selectedTemplate.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all">
                  <Youtube className="w-3.5 h-3.5" /> Watch Tutorial
                </a>
              )}
              <button onClick={() => handleDeploy(selectedTemplate)}
                disabled={deployedIds.has(selectedTemplate.id) || deployingId === selectedTemplate.id}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-brand-400 bg-brand-400/10 border border-brand-400/20 rounded-xl hover:bg-brand-400/20 transition-all ml-auto disabled:opacity-50">
                {deployedIds.has(selectedTemplate.id) ? <><CheckCircle className="w-3.5 h-3.5" /> Deployed</> :
                  deployingId === selectedTemplate.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deploying…</> :
                  <><Rocket className="w-3.5 h-3.5" /> Deploy to n8n</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">⚡ n8n Templates</h1>
            <p className="text-sm text-zinc-500">
              {templates.length} templates · {n8nConnected ? (
                <span className="text-emerald-400">n8n connected ✓</span>
              ) : (
                <span className="text-amber-400">connecting…</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <a href={n8nUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-brand-400/10 text-brand-400 rounded-xl border border-brand-400/20 hover:bg-brand-400/20 text-sm font-medium transition-all">
            <Rocket className="w-4 h-4" /> Open n8n <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search templates, creators, categories…"
          className="w-full bg-surface-2 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-400/30"
        />
        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-white/5 flex-wrap">
            {ALL_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={clsx("px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize",
                  filterCategory === cat ? "bg-brand-400/20 text-brand-400" : "text-zinc-500 hover:text-white"
                )}>
                {cat === "all" ? "All" : (CATEGORY_CONFIG[cat]?.label || cat)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-white/5">
            {ALL_NICHES.map(n => (
              <button key={n} onClick={() => setFilterNiche(n)}
                className={clsx("px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize",
                  filterNiche === n ? "bg-brand-400/20 text-brand-400" : "text-zinc-500 hover:text-white"
                )}>{n === "all" ? "All Niches" : n}</button>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-600">{filtered.length} of {templates.length} templates</p>
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
          <p className="text-sm text-zinc-500">Loading from spreadsheet…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Workflow className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No templates match this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t, i) => {
            const catCfg = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.automation;
            const CatIcon = catCfg.icon;
            const isDeployed = deployedIds.has(t.id) || t.isDeployed;
            const isDeploying = deployingId === t.id;
            return (
              <div key={t.id}
                onClick={() => handleSelect(t)}
                className="glass rounded-xl p-5 hover:bg-white/[0.03] transition-all group flex flex-col gap-3 animate-fadeInUp cursor-pointer"
                style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s`, opacity: 0 }}>
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <CatIcon className={clsx("w-4 h-4 mt-0.5 flex-shrink-0", catCfg.color)} />
                    <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{t.name}</h3>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <span className={clsx("px-1.5 py-0.5 text-[10px] font-semibold rounded-full border capitalize", COMPLEXITY_BADGE[t.complexity] || "")}>{t.complexity}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{t.description}</p>

                {/* Creator + Niche */}
                <div className="flex items-center gap-2 flex-wrap">
                  {t.creator && (
                    <span className="text-[10px] text-zinc-600 bg-surface-3 px-2 py-0.5 rounded-full">
                      👤 {t.creator.split("|")[0].trim()}
                    </span>
                  )}
                  {t.niche !== "all" && (
                    <span className="text-[10px] text-zinc-500 bg-surface-3 px-2 py-0.5 rounded-full capitalize">{t.niche}</span>
                  )}
                  <span className={clsx("text-[10px] px-2 py-0.5 rounded-full capitalize", catCfg.color, "bg-white/5")}>
                    {catCfg.label}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-auto">
                  {t.youtubeUrl && (
                    <a href={t.youtubeUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all">
                      <Youtube className="w-3 h-3" /> Watch
                    </a>
                  )}
                  {t.templateUrl && (
                    <a href={t.templateUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-zinc-400 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all">
                      <Download className="w-3 h-3" /> Template
                    </a>
                  )}
                  <button
                    onClick={() => handleDeploy(t)}
                    disabled={isDeployed || isDeploying || !n8nConnected}
                    className={clsx(
                      "flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg border transition-all ml-auto",
                      isDeployed ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 cursor-default" :
                      isDeploying ? "text-brand-400 bg-brand-400/10 border-brand-400/20 animate-pulse" :
                      "text-brand-400 bg-brand-400/10 border-brand-400/20 hover:bg-brand-400/20"
                    )}>
                    {isDeployed ? (
                      <><CheckCircle className="w-3 h-3" /> Deployed</>
                    ) : isDeploying ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Deploying…</>
                    ) : (
                      <><Rocket className="w-3 h-3" /> Deploy</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
