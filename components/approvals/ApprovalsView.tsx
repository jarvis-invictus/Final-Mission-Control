"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2, XCircle, Clock, Loader2, RefreshCw,
  Plus, X, ExternalLink, MessageSquare, Send,
  FileText, Mail, Settings, DollarSign, Target, Package,
  ThumbsUp, ThumbsDown, MessageCircle, Trash2, User,
  AlertTriangle, ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";

/* ================================================================ */
/*  TYPES                                                            */
/* ================================================================ */

type ApprovalStatus = "pending" | "approved" | "rejected" | "changes_requested";
type ApprovalType = "content" | "outreach" | "feature" | "budget" | "strategy" | "access" | "asset" | "other";

interface Approval {
  id: string; title: string; description: string; type: ApprovalType;
  submittedBy: string; submittedAt: string;
  status: ApprovalStatus; reviewedAt?: string; reviewNote?: string;
  priority: "high" | "medium" | "low"; linkedTo?: string;
  expectedROI?: string; businessImpact?: "critical" | "high" | "medium" | "low";
  estimatedCost?: string; timeToValue?: string;
  whatTheyNeed?: string; whyBlocked?: string;
}

/* ================================================================ */
/*  CONFIG                                                            */
/* ================================================================ */

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; icon: typeof Clock; color: string; bg: string; borderColor: string }> = {
  pending:           { label: "Awaiting Review", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", borderColor: "border-amber-400/30" },
  approved:          { label: "Approved", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", borderColor: "border-emerald-400/30" },
  rejected:          { label: "Rejected", icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", borderColor: "border-red-400/30" },
  changes_requested: { label: "Changes Requested", icon: MessageSquare, color: "text-brand-400", bg: "bg-brand-400/10", borderColor: "border-brand-400/30" },
};

const TYPE_CONFIG: Record<ApprovalType, { icon: typeof FileText; label: string; color: string }> = {
  content:  { icon: FileText, label: "Content", color: "text-brand-400" },
  outreach: { icon: Mail, label: "Outreach", color: "text-emerald-400" },
  feature:  { icon: Settings, label: "Feature", color: "text-amber-400" },
  budget:   { icon: DollarSign, label: "Budget", color: "text-red-400" },
  strategy: { icon: Target, label: "Strategy", color: "text-brand-400" },
  access:   { icon: Settings, label: "Access", color: "text-cyan-400" },
  asset:    { icon: Package, label: "Asset", color: "text-violet-400" },
  other:    { icon: Package, label: "Other", color: "text-zinc-400" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof AlertTriangle }> = {
  high:   { label: "High Priority", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", icon: AlertTriangle },
  medium: { label: "Medium", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", icon: Clock },
  low:    { label: "Low", color: "text-zinc-500", bg: "bg-zinc-500/10 border-zinc-500/20", icon: ArrowRight },
};

const AGENTS: Record<string, { emoji: string; color: string }> = {
  Elon: { emoji: "🎖️", color: "bg-brand-400/10 text-brand-400" },
  Jordan: { emoji: "📞", color: "bg-emerald-400/10 text-emerald-400" },
  Gary: { emoji: "📣", color: "bg-amber-400/10 text-amber-400" },
  Linus: { emoji: "⚙️", color: "bg-zinc-400/10 text-zinc-400" },
  Jarvis: { emoji: "🏛️", color: "bg-brand-400/10 text-brand-400" },
  Friend: { emoji: "👋", color: "bg-emerald-400/10 text-emerald-400" },
};

/* ================================================================ */
/*  HELPERS                                                           */
/* ================================================================ */

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function relTime(iso: string): string {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ================================================================ */
/*  COMPONENT                                                         */
/* ================================================================ */

export default function ApprovalsView() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [form, setForm] = useState({ title: "", description: "", type: "feature" as ApprovalType, submittedBy: "Elon", priority: "medium" as "high" | "medium" | "low", expectedROI: "", businessImpact: "medium" as "critical" | "high" | "medium" | "low", estimatedCost: "", whatTheyNeed: "", whyBlocked: "" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/approvals");
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return approvals;
    return approvals.filter(a => a.status === filter);
  }, [approvals, filter]);

  const stats = useMemo(() => ({
    pending: approvals.filter(a => a.status === "pending").length,
    approved: approvals.filter(a => a.status === "approved").length,
    rejected: approvals.filter(a => a.status === "rejected").length,
    changes: approvals.filter(a => a.status === "changes_requested").length,
  }), [approvals]);

  const handleAction = async (id: string, action: "approve" | "reject" | "changes_requested") => {
    setActionLoading(id);
    try {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, reviewNote }),
      });
      setReviewingId(null);
      setReviewNote("");
      await load();
    } catch {} finally { setActionLoading(null); }
  };

  const handleCreate = async () => {
    if (!form.title) return;
    setActionLoading("create");
    try {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...form }),
      });
      setShowCreate(false);
      setForm({ title: "", description: "", type: "feature", submittedBy: "Elon", priority: "medium", expectedROI: "", businessImpact: "medium", estimatedCost: "", whatTheyNeed: "", whyBlocked: "" });
      await load();
    } catch {} finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      await load();
    } catch {} finally { setActionLoading(null); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Approvals</h1>
            <p className="text-sm text-zinc-500">Review and approve agent submissions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-400 text-black rounded-xl text-sm font-semibold hover:bg-brand-300 transition-colors shadow-lg shadow-brand-400/20">
            <Plus className="w-4 h-4" /> Submit New
          </button>
          <button onClick={load} className="p-2.5 hover:bg-surface-3 rounded-xl border border-surface-5">
            <RefreshCw className={clsx("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { key: "pending" as const, label: "Pending", count: stats.pending, icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
          { key: "approved" as const, label: "Approved", count: stats.approved, icon: ThumbsUp, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
          { key: "rejected" as const, label: "Rejected", count: stats.rejected, icon: ThumbsDown, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
          { key: "changes_requested" as const, label: "Changes", count: stats.changes, icon: MessageCircle, color: "text-brand-400", bg: "bg-brand-400/10", border: "border-brand-400/20" },
        ]).map(s => (
          <button key={s.key} onClick={() => setFilter(filter === s.key ? "all" : s.key)}
            className={clsx("p-4 rounded-xl border transition-all text-left",
              filter === s.key ? `${s.bg} ${s.border}` : "bg-surface-2 border-surface-5 hover:border-white/10"
            )}>
            <div className="flex items-center justify-between mb-2">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
                <s.icon className={clsx("w-5 h-5", s.color)} />
              </div>
              <span className={clsx("text-2xl font-bold", s.count > 0 ? "text-white" : "text-zinc-600")}>{s.count}</span>
            </div>
            <span className="text-sm text-zinc-500">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap border-b border-surface-5 pb-3">
        {[
          { key: "all" as const, label: "All Items", count: approvals.length },
          { key: "pending" as const, label: "⏳ Pending", count: stats.pending },
          { key: "approved" as const, label: "✅ Approved", count: stats.approved },
          { key: "rejected" as const, label: "❌ Rejected", count: stats.rejected },
          { key: "changes_requested" as const, label: "💬 Changes", count: stats.changes },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={clsx("px-4 py-2 rounded-xl text-sm font-medium transition-colors",
              filter === tab.key ? "bg-brand-400/15 text-brand-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-surface-3"
            )}>
            {tab.label} <span className="text-zinc-600 ml-1">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Approval List */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
          <p className="text-lg text-zinc-500 font-medium">No approvals here</p>
          <p className="text-sm text-zinc-600 mt-1">All clear! Nothing needs your attention.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(approval => {
            const statusCfg = STATUS_CONFIG[approval.status];
            const typeCfg = TYPE_CONFIG[approval.type];
            const priorityCfg = PRIORITY_CONFIG[approval.priority];
            const StatusIcon = statusCfg.icon;
            const TypeIcon = typeCfg.icon;
            const PriorityIcon = priorityCfg.icon;
            const agentCfg = AGENTS[approval.submittedBy];
            const isReviewing = reviewingId === approval.id;
            const isPending = approval.status === "pending";

            return (
              <div key={approval.id}
                className={clsx("bg-surface-2 rounded-2xl border overflow-hidden transition-all",
                  isPending ? statusCfg.borderColor : "border-surface-5",
                  isPending && "hover:shadow-lg hover:shadow-amber-400/5"
                )}>
                {/* Status Bar */}
                <div className={clsx("px-6 py-2 flex items-center gap-2 text-xs font-medium border-b border-white/5", statusCfg.bg)}>
                  <StatusIcon className={clsx("w-4 h-4", statusCfg.color)} />
                  <span className={statusCfg.color}>{statusCfg.label}</span>
                  <span className="text-zinc-600 ml-auto">{relTime(approval.submittedAt)}</span>
                </div>

                {/* Main Content */}
                <div className="p-6">
                  <div className="flex items-start gap-5">
                    {/* Type Icon */}
                    <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-surface-3 border border-white/5")}>
                      <TypeIcon className={clsx("w-7 h-7", typeCfg.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-1">{approval.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed mb-4">{approval.description}</p>

                      {/* ROI & Impact info */}
                      {(approval.whatTheyNeed || approval.expectedROI || approval.businessImpact) && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4 p-3 bg-surface-2 rounded-lg border border-white/5">
                          {approval.whatTheyNeed && (
                            <div><p className="text-[10px] text-zinc-600 uppercase">Need</p><p className="text-xs text-zinc-300">{approval.whatTheyNeed}</p></div>
                          )}
                          {approval.whyBlocked && (
                            <div><p className="text-[10px] text-zinc-600 uppercase">Blocked By</p><p className="text-xs text-red-400">{approval.whyBlocked}</p></div>
                          )}
                          {approval.expectedROI && (
                            <div><p className="text-[10px] text-zinc-600 uppercase">Expected ROI</p><p className="text-xs text-emerald-400">{approval.expectedROI}</p></div>
                          )}
                          {approval.estimatedCost && (
                            <div><p className="text-[10px] text-zinc-600 uppercase">Cost</p><p className="text-xs text-amber-400">{approval.estimatedCost}</p></div>
                          )}
                          {approval.businessImpact && (
                            <div><p className="text-[10px] text-zinc-600 uppercase">Impact</p><p className={clsx("text-xs", approval.businessImpact === "critical" ? "text-red-400" : approval.businessImpact === "high" ? "text-amber-400" : "text-zinc-400")}>{approval.businessImpact}</p></div>
                          )}
                        </div>
                      )}

                      {/* Meta Tags */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Type */}
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-3 rounded-lg text-xs text-zinc-400 border border-white/5">
                          <TypeIcon className={clsx("w-3.5 h-3.5", typeCfg.color)} />
                          {typeCfg.label}
                        </span>

                        {/* Priority */}
                        <span className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border", priorityCfg.bg)}>
                          <PriorityIcon className={clsx("w-3.5 h-3.5", priorityCfg.color)} />
                          <span className={priorityCfg.color}>{priorityCfg.label}</span>
                        </span>

                        {/* Agent */}
                        <span className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-white/5", agentCfg?.color || "bg-surface-3 text-zinc-400")}>
                          <User className="w-3.5 h-3.5" />
                          {agentCfg?.emoji} {approval.submittedBy}
                        </span>

                        {/* Date */}
                        <span className="text-xs text-zinc-600">{formatDate(approval.submittedAt)}</span>

                        {/* Link */}
                        {approval.linkedTo && (
                          <a href={approval.linkedTo} className="flex items-center gap-1 text-xs text-brand-400 hover:underline">
                            <ExternalLink className="w-3.5 h-3.5" /> View Source
                          </a>
                        )}
                      </div>

                      {/* Review Note */}
                      {approval.reviewNote && (
                        <div className="mt-4 p-4 bg-surface-3 rounded-xl border border-white/5">
                          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                            <MessageSquare className="w-3.5 h-3.5" /> Review Note
                            {approval.reviewedAt && <span className="text-zinc-600">· {formatDate(approval.reviewedAt)}</span>}
                          </div>
                          <p className="text-sm text-zinc-300">{approval.reviewNote}</p>
                        </div>
                      )}
                    </div>

                    {/* Delete */}
                    <button onClick={() => handleDelete(approval.id)} disabled={actionLoading === approval.id}
                      className="p-2 rounded-lg hover:bg-surface-3 text-zinc-700 hover:text-zinc-400 transition-colors flex-shrink-0" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Action Buttons — for pending items */}
                  {isPending && (
                    <div className="mt-5 pt-5 border-t border-white/5 flex items-center gap-3">
                      <button onClick={() => handleAction(approval.id, "approve")} disabled={actionLoading === approval.id}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-medium hover:bg-emerald-500/20 transition-colors">
                        <ThumbsUp className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => { setReviewingId(isReviewing ? null : approval.id); setReviewNote(""); }}
                        className={clsx("flex items-center gap-2 px-5 py-2.5 border rounded-xl text-sm font-medium transition-colors",
                          isReviewing ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "bg-surface-3 text-zinc-400 border-white/5 hover:text-brand-400 hover:border-brand-400/20"
                        )}>
                        <MessageCircle className="w-4 h-4" /> Request Changes
                      </button>
                      <button onClick={() => handleAction(approval.id, "reject")} disabled={actionLoading === approval.id}
                        className="flex items-center gap-2 px-5 py-2.5 bg-surface-3 text-zinc-500 border border-white/5 rounded-xl text-sm font-medium hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-colors">
                        <ThumbsDown className="w-4 h-4" /> Reject
                      </button>
                      {actionLoading === approval.id && <Loader2 className="w-4 h-4 animate-spin text-zinc-500 ml-2" />}
                    </div>
                  )}

                  {/* Review Note Input */}
                  {isReviewing && (
                    <div className="mt-4 flex gap-3">
                      <input value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                        placeholder="Describe what changes are needed..."
                        className="flex-1 px-4 py-3 bg-surface-3 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30"
                        onKeyDown={e => e.key === "Enter" && reviewNote && handleAction(approval.id, "changes_requested")} />
                      <button onClick={() => reviewNote && handleAction(approval.id, "changes_requested")} disabled={!reviewNote}
                        className="px-5 py-3 bg-brand-400/10 text-brand-400 border border-brand-400/20 rounded-xl text-sm font-medium hover:bg-brand-400/20 disabled:opacity-40 transition-colors flex items-center gap-2">
                        <Send className="w-4 h-4" /> Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-surface-1 border border-surface-5 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-400/10 flex items-center justify-center">
                  <Send className="w-5 h-5 text-brand-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Submit for Approval</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-surface-3 rounded-xl"><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block font-medium">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="What needs approval?"
                  className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-2 block font-medium">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Provide details about what you need approved..."
                  rows={4}
                  className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-medium">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as ApprovalType }))}
                    className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30">
                    <option value="content">📝 Content</option>
                    <option value="outreach">📧 Outreach</option>
                    <option value="feature">⚙️ Feature</option>
                    <option value="budget">💰 Budget</option>
                    <option value="strategy">🎯 Strategy</option>
                    <option value="other">📌 Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-medium">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as "high" | "medium" | "low" }))}
                    className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30">
                    <option value="high">🔴 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">⚪ Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-medium">Submitted By</label>
                  <select value={form.submittedBy} onChange={e => setForm(f => ({ ...f, submittedBy: e.target.value }))}
                    className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30">
                    <option value="Elon">🎖️ Elon</option>
                    <option value="Jordan">📞 Jordan</option>
                    <option value="Gary">📣 Gary</option>
                    <option value="Linus">⚙️ Linus</option>
                    <option value="Jarvis">🏛️ Jarvis</option>
                    <option value="Friend">👋 Friend</option>
                  </select>
                </div>
              </div>

              {/* ROI & Business Impact Fields */}
              <div className="mt-4 p-4 bg-surface-2 rounded-xl border border-white/5">
                <p className="text-xs font-semibold text-brand-400 mb-3 uppercase tracking-wider">💰 ROI & Business Impact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">What They Need</label>
                    <input value={form.whatTheyNeed} onChange={e => setForm(f => ({ ...f, whatTheyNeed: e.target.value }))}
                      placeholder="API key, email access, budget..." className="w-full px-3 py-2 bg-surface-3 border border-surface-5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Why Blocked</label>
                    <input value={form.whyBlocked} onChange={e => setForm(f => ({ ...f, whyBlocked: e.target.value }))}
                      placeholder="Can't send emails without..." className="w-full px-3 py-2 bg-surface-3 border border-surface-5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Expected ROI</label>
                    <input value={form.expectedROI} onChange={e => setForm(f => ({ ...f, expectedROI: e.target.value }))}
                      placeholder="₹50K revenue/month..." className="w-full px-3 py-2 bg-surface-3 border border-surface-5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Estimated Cost</label>
                    <input value={form.estimatedCost} onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))}
                      placeholder="₹0 / ₹5K one-time..." className="w-full px-3 py-2 bg-surface-3 border border-surface-5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Business Impact</label>
                    <select value={form.businessImpact} onChange={e => setForm(f => ({ ...f, businessImpact: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-surface-3 border border-surface-5 rounded-lg text-sm text-zinc-200">
                      <option value="critical">🔴 Critical — Revenue blocked</option>
                      <option value="high">🟠 High — Significant impact</option>
                      <option value="medium">🟡 Medium — Helpful</option>
                      <option value="low">⚪ Low — Nice to have</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 border-t border-surface-5 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={!form.title || actionLoading === "create"}
                className="px-6 py-2.5 bg-brand-400 text-black text-sm font-semibold rounded-xl hover:bg-brand-300 disabled:opacity-40 transition-colors flex items-center gap-2 shadow-lg shadow-brand-400/20">
                {actionLoading === "create" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
