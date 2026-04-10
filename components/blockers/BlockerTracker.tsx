"use client";

import { useState, useMemo, useCallback } from "react";
import {
  AlertTriangle, AlertCircle, Clock, Circle, Plus,
  X, CheckCircle2, User, ArrowRight, Search,
  ChevronRight, Trash2, Edit3, Send, Loader2,
} from "lucide-react";
import { clsx } from "clsx";

const ASSIGNABLE_AGENTS = [
  { id: "elon", name: "Elon", emoji: "🎖️" },
  { id: "jarvis", name: "Jarvis", emoji: "🏛️" },
  { id: "linus", name: "Linus", emoji: "⚙️" },
  { id: "jordan", name: "Jordan", emoji: "📞" },
  { id: "gary", name: "Gary", emoji: "📣" },
  { id: "friend", name: "Friend", emoji: "👋" },
];

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type Status = "BLOCKED" | "NOT STARTED" | "IN PROGRESS" | "RESOLVED";

interface Blocker {
  id: number;
  title: string;
  severity: Severity;
  description: string;
  impact: string;
  owner: string;
  status: Status;
  statusNote?: string;
  impactScore: number;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const initialBlockers: Blocker[] = [
  {
    id: 1, title: "Gmail App Password", severity: "CRITICAL",
    description: "Gmail App Password for jordan@invictus-ai.in needed to enable SMTP.",
    impact: "Was blocking all email outreach.", owner: "Sahil",
    status: "RESOLVED", statusNote: "Sahil created it", impactScore: 10,
    createdAt: "2026-04-01T10:00:00Z",
  },
  {
    id: 2, title: "Zoho IMAP Access", severity: "HIGH",
    description: "Zoho org email IMAP/SMTP credentials needed for contact@invictus-ai.in.",
    impact: "Can't send from org domain — affects trust.", owner: "Sahil",
    status: "BLOCKED", statusNote: "Needs Zoho admin access", impactScore: 8,
    createdAt: "2026-03-29T08:00:00Z",
  },
  {
    id: 3, title: "Domain Warmup", severity: "HIGH",
    description: "invictus-ai.in domain not warmed. Cold sends will land in spam.",
    impact: "First outreach campaign deliverability at risk.", owner: "Jordan",
    status: "NOT STARTED", impactScore: 8,
    createdAt: "2026-04-02T10:00:00Z",
  },
  {
    id: 4, title: "Niche Selection Pending", severity: "CRITICAL",
    description: "Sahil hasn't confirmed which 2-3 niches to focus on.",
    impact: "All vertical-building work is stalled.", owner: "Sahil",
    status: "BLOCKED", statusNote: "Waiting on Sahil's decision", impactScore: 10,
    createdAt: "2026-04-07T10:45:00Z",
  },
  {
    id: 5, title: "Pricing Not Defined", severity: "CRITICAL",
    description: "No pricing tiers defined yet. Can't create proposals.",
    impact: "Sales can't close — no numbers to quote.", owner: "Sahil",
    status: "BLOCKED", statusNote: "Part of niche decision", impactScore: 9,
    createdAt: "2026-04-07T10:45:00Z",
  },
  {
    id: 6, title: "CRM Real-time Updates", severity: "MEDIUM",
    description: "CRM pipeline doesn't auto-refresh. Manual refresh needed.",
    impact: "Stale data in dashboard.", owner: "Linus",
    status: "IN PROGRESS", statusNote: "WS endpoint being built", impactScore: 6,
    createdAt: "2026-04-06T16:00:00Z",
  },
  {
    id: 7, title: "Client Onboarding Flow", severity: "HIGH",
    description: "No structured onboarding flow for new clients.",
    impact: "First client will have poor experience.", owner: "Jeff",
    status: "NOT STARTED", impactScore: 7,
    createdAt: "2026-04-07T12:00:00Z",
  },
];

/* ------------------------------------------------------------------ */
/*  CONFIG                                                             */
/* ------------------------------------------------------------------ */

const COLUMNS: { status: Status; label: string; icon: typeof Circle; color: string; dotColor: string }[] = [
  { status: "BLOCKED",      label: "Blocked",      icon: AlertCircle,  color: "text-red-400",    dotColor: "bg-red-400" },
  { status: "NOT STARTED",  label: "Not Started",  icon: Circle,       color: "text-zinc-400",   dotColor: "bg-zinc-500" },
  { status: "IN PROGRESS",  label: "In Progress",  icon: Clock,        color: "text-brand-400",  dotColor: "bg-brand-400" },
  { status: "RESOLVED",     label: "Resolved",     icon: CheckCircle2, color: "text-emerald-400", dotColor: "bg-emerald-400" },
];

const severityBadge: Record<Severity, string> = {
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/25",
  HIGH:     "bg-amber-500/15 text-amber-400 border-amber-500/25",
  MEDIUM:   "bg-zinc-600/15 text-zinc-300 border-zinc-600/25",
  LOW:      "bg-zinc-700/15 text-zinc-500 border-zinc-700/25",
};

function daysAgo(iso: string): string {
  const d = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
  return d === 0 ? "Today" : d === 1 ? "1 day" : `${d} days`;
}

/* ------------------------------------------------------------------ */
/*  ADD FORM                                                           */
/* ------------------------------------------------------------------ */

function AddBlockerForm({ onAdd, onCancel }: { onAdd: (b: Blocker) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [owner, setOwner] = useState("");
  const [severity, setSeverity] = useState<Severity>("HIGH");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: Date.now(),
      title: title.trim(),
      description: desc.trim(),
      impact: "",
      owner: owner.trim() || "Unassigned",
      severity,
      status: "NOT STARTED",
      impactScore: severity === "CRITICAL" ? 9 : severity === "HIGH" ? 7 : severity === "MEDIUM" ? 5 : 3,
      createdAt: new Date().toISOString(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-2 rounded-xl border border-surface-5 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">New Blocker</h3>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-surface-3 rounded">
          <X className="w-4 h-4 text-zinc-500" />
        </button>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Blocker title *"
        className="w-full px-3 py-2 bg-surface-3 border border-white/5 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-400/50" />
      <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" rows={2}
        className="w-full px-3 py-2 bg-surface-3 border border-white/5 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-400/50 resize-none" />
      <div className="flex gap-2">
        <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Owner"
          className="flex-1 px-3 py-2 bg-surface-3 border border-white/5 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-brand-400/50" />
        <select value={severity} onChange={e => setSeverity(e.target.value as Severity)}
          className="px-3 py-2 bg-surface-3 border border-white/5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/50">
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>
      <button type="submit" className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors">
        Add Blocker
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  KANBAN CARD                                                        */
/* ------------------------------------------------------------------ */

function BlockerCard({ blocker, onMove, onDelete }: {
  blocker: Blocker;
  onMove: (id: number, newStatus: Status) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<string | null>(null);
  const colIdx = COLUMNS.findIndex(c => c.status === blocker.status);
  const nextCol = colIdx < COLUMNS.length - 1 ? COLUMNS[colIdx + 1] : null;
  const prevCol = colIdx > 0 ? COLUMNS[colIdx - 1] : null;

  async function assignToAgent(agentId: string) {
    setAssigning(true);
    setAssignResult(null);
    try {
      const res = await fetch("/api/blockers/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          title: blocker.title,
          description: blocker.description,
          severity: blocker.severity,
          assignedBy: "Sahil (Mission Control)",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAssignResult(`✅ Sent to ${data.agent}`);
        onMove(blocker.id, "IN PROGRESS");
      } else {
        setAssignResult(`❌ ${data.message || data.error}`);
      }
    } catch (e) {
      setAssignResult("❌ Failed to send");
    } finally {
      setAssigning(false);
      setTimeout(() => { setAssignResult(null); setShowAssign(false); }, 3000);
    }
  }

  return (
    <div className={clsx(
      "bg-surface-3 rounded-lg border border-white/5 p-3 hover:border-white/10 transition-all group",
      blocker.severity === "CRITICAL" && "border-l-2 border-l-red-500",
      blocker.severity === "HIGH" && "border-l-2 border-l-amber-500",
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <button onClick={() => setExpanded(!expanded)} className="text-left flex-1 min-w-0">
          <h4 className="text-sm font-medium text-zinc-200 leading-snug">{blocker.title}</h4>
        </button>
        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0", severityBadge[blocker.severity])}>
          {blocker.severity}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px] text-zinc-500 mb-2">
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{blocker.owner}</span>
        <span>{daysAgo(blocker.createdAt)}</span>
      </div>

      {blocker.statusNote && (
        <p className="text-xs text-zinc-500 italic mb-2">"{blocker.statusNote}"</p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
          {blocker.description && <p className="text-xs text-zinc-400">{blocker.description}</p>}
          {blocker.impact && <p className="text-xs text-zinc-500">Impact: {blocker.impact}</p>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 flex-wrap">
        {prevCol && (
          <button
            onClick={() => onMove(blocker.id, prevCol.status)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-surface-4 hover:bg-surface-5 text-zinc-400 hover:text-zinc-200 transition-colors"
            title={`Move to ${prevCol.label}`}
          >
            ← {prevCol.label}
          </button>
        )}
        {nextCol && (
          <button
            onClick={() => onMove(blocker.id, nextCol.status)}
            className={clsx(
              "flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors font-medium",
              nextCol.status === "RESOLVED"
                ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                : "bg-brand-500/15 text-brand-400 hover:bg-brand-500/25"
            )}
            title={`Move to ${nextCol.label}`}
          >
            {nextCol.label} →
          </button>
        )}
        {blocker.status !== "RESOLVED" && (
          <button
            onClick={() => setShowAssign(!showAssign)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 transition-colors font-medium"
            title="Assign to agent"
          >
            <Send className="w-2.5 h-2.5" />
            Assign
          </button>
        )}
        <button
          onClick={() => onDelete(blocker.id)}
          className="ml-auto p-1 text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Agent Assignment Picker */}
      {showAssign && (
        <div className="mt-2 p-2 bg-surface-4 rounded-lg border border-white/5">
          {assignResult ? (
            <p className="text-xs text-center py-1">{assignResult}</p>
          ) : assigning ? (
            <div className="flex items-center gap-2 justify-center py-1 text-xs text-zinc-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Sending...
            </div>
          ) : (
            <>
              <p className="text-[10px] text-zinc-500 mb-1.5">Send to agent:</p>
              <div className="flex flex-wrap gap-1">
                {ASSIGNABLE_AGENTS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => assignToAgent(a.id)}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-surface-3 hover:bg-brand-500/15 hover:text-brand-400 text-zinc-400 transition-colors"
                  >
                    <span>{a.emoji}</span> {a.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN — KANBAN BOARD                                                */
/* ------------------------------------------------------------------ */

export default function BlockerTracker() {
  const [blockers, setBlockers] = useState<Blocker[]>(initialBlockers);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const moveBlocker = useCallback((id: number, newStatus: Status) => {
    setBlockers(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
  }, []);

  const deleteBlocker = useCallback((id: number) => {
    setBlockers(prev => prev.filter(b => b.id !== id));
  }, []);

  const addBlocker = useCallback((b: Blocker) => {
    setBlockers(prev => [b, ...prev]);
    setShowAdd(false);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return blockers;
    const q = search.toLowerCase();
    return blockers.filter(b => `${b.title} ${b.description} ${b.owner}`.toLowerCase().includes(q));
  }, [blockers, search]);

  const stats = useMemo(() => ({
    total: blockers.length,
    blocked: blockers.filter(b => b.status === "BLOCKED").length,
    resolved: blockers.filter(b => b.status === "RESOLVED").length,
    critical: blockers.filter(b => b.severity === "CRITICAL" && b.status !== "RESOLVED").length,
  }), [blockers]);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-brand-400" />
            Blockers
          </h1>
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
            <span>{stats.total} total</span>
            <span className="text-red-400">{stats.blocked} blocked</span>
            <span className="text-emerald-400">{stats.resolved} resolved</span>
            {stats.critical > 0 && <span className="text-red-400 font-medium">⚠ {stats.critical} critical</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search blockers..."
              className="pl-8 pr-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30 w-48"
            />
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Blocker
          </button>
        </div>
      </div>

      {showAdd && <AddBlockerForm onAdd={addBlocker} onCancel={() => setShowAdd(false)} />}

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-0">
        {COLUMNS.map(col => {
          const ColIcon = col.icon;
          const cards = filtered
            .filter(b => b.status === col.status)
            .sort((a, b) => {
              const sevOrder: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
              return sevOrder[a.severity] - sevOrder[b.severity];
            });

          return (
            <div key={col.status} className="flex flex-col bg-surface-1 rounded-xl border border-surface-5 overflow-hidden">
              {/* Column Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-5 bg-surface-2/50">
                <div className={clsx("w-2 h-2 rounded-full", col.dotColor)} />
                <span className={clsx("text-sm font-medium", col.color)}>{col.label}</span>
                <span className="ml-auto text-xs text-zinc-600 bg-surface-3 px-2 py-0.5 rounded-full">{cards.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {cards.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-zinc-600">
                    <ColIcon className="w-5 h-5 mb-2" />
                    <span className="text-xs">No blockers</span>
                  </div>
                ) : (
                  cards.map(b => (
                    <BlockerCard key={b.id} blocker={b} onMove={moveBlocker} onDelete={deleteBlocker} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
