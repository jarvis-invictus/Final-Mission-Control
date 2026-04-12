"use client";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface FulfillmentTask {
  name: string;
  status: "pending" | "in-progress" | "done" | "blocked";
  assignedTo: string;
  dueDate: string;
  notes?: string;
}

interface FulfillmentRecord {
  id: string;
  clientName: string;
  businessName: string;
  niche: string;
  tier: "starter" | "growth" | "scale";
  stage: string;
  contactEmail: string;
  contactPhone: string;
  tasks: FulfillmentTask[];
  payments: { amount: number; status: string; type: string }[];
  startDate: string;
  targetLiveDate: string;
  actualLiveDate?: string;
  assignedTo: string;
  notes: string;
}

const NICHE_COLORS: Record<string, string> = {
  dental: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "ca/tax": "bg-amber-500/20 text-amber-300 border-amber-500/30",
  education: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  lawyers: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  other: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
};

const TIER_COLORS: Record<string, string> = {
  starter: "bg-zinc-500/20 text-zinc-300",
  growth: "bg-brand-500/20 text-brand-300",
  scale: "bg-amber-400/20 text-amber-300",
};

const STAGE_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  building: "Building",
  review: "Review",
  revisions: "Revisions",
  golive: "Going Live",
  live: "Live ✓",
  paused: "Paused",
};

function daysLeft(targetDate: string): number {
  const today = new Date();
  const target = new Date(targetDate);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function progressPercent(tasks: FulfillmentTask[]): number {
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.status === "done").length;
  return Math.round((done / tasks.length) * 100);
}

function ClientCard({ record, onUpdate }: { record: FulfillmentRecord; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState(record.tasks);

  const progress = progressPercent(tasks);
  const days = daysLeft(record.targetLiveDate);
  const isOverdue = days < 0 && record.stage !== "live";
  const isAtRisk = days >= 0 && days <= 2 && record.stage !== "live";
  const statusColor = isOverdue ? "text-red-400" : isAtRisk ? "text-amber-400" : "text-emerald-400";
  const progressColor = isOverdue ? "bg-red-500" : isAtRisk ? "bg-amber-500" : "bg-brand-400";

  const toggleTask = async (idx: number) => {
    const updated = [...tasks];
    updated[idx] = {
      ...updated[idx],
      status: updated[idx].status === "done" ? "pending" : "done",
    };
    setTasks(updated);
    await fetch("/api/fulfillment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: record.id, tasks: updated }),
    });
    onUpdate();
  };

  const nicheKey = record.niche.toLowerCase().replace(/\//g, "/");
  const nicheColor = NICHE_COLORS[nicheKey] || NICHE_COLORS.other;
  const tierColor = TIER_COLORS[record.tier] || TIER_COLORS.starter;

  return (
    <div className="bg-surface-2 rounded-xl border border-white/5 overflow-hidden hover:border-brand-400/20 transition-all">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="font-semibold text-white text-base">{record.businessName || record.clientName}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{record.contactPhone} · {record.assignedTo}</div>
          </div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${nicheColor}`}>
              {record.niche}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tierColor}`}>
              {record.tier}
            </span>
          </div>
        </div>

        {/* Stage + days */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-400 bg-white/5 px-2 py-1 rounded-md">
            {STAGE_LABELS[record.stage] || record.stage}
          </span>
          <span className={`text-xs font-medium ${statusColor}`}>
            {record.stage === "live" ? "✓ Live" : isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-1">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>{tasks.filter(t => t.status === "done").length}/{tasks.length} tasks done</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-300 bg-white/[0.02] border-t border-white/5 transition-colors"
      >
        <span>{expanded ? "Hide tasks" : "Show tasks"}</span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {/* Task list */}
      {expanded && (
        <div className="px-5 pb-4 pt-3 border-t border-white/5 space-y-1.5 max-h-72 overflow-y-auto">
          {tasks.map((task, idx) => (
            <button
              key={idx}
              onClick={() => toggleTask(idx)}
              className="w-full flex items-center gap-2.5 text-left group"
            >
              {task.status === "done" ? (
                <CheckCircle2 className="w-4 h-4 text-brand-400 flex-shrink-0" />
              ) : task.status === "blocked" ? (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              ) : task.status === "in-progress" ? (
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" />
              )}
              <span className={`text-xs ${task.status === "done" ? "line-through text-zinc-600" : "text-zinc-300"}`}>
                {task.name}
              </span>
              <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">{task.assignedTo}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddClientModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [form, setForm] = useState({
    clientName: "", businessName: "", niche: "dental", tier: "growth",
    contactEmail: "", contactPhone: "", assignedTo: "Jeff", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/fulfillment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onAdd();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-2 rounded-2xl border border-white/10 w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add New Client</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Client Name</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" required value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Business Name</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" required value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Niche</label>
              <select className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={form.niche} onChange={e => setForm({...form, niche: e.target.value})}>
                <option value="dental">Dental</option>
                <option value="ca/tax">CA/Tax</option>
                <option value="education">Education</option>
                <option value="lawyers">Lawyers</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Tier</label>
              <select className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={form.tier} onChange={e => setForm({...form, tier: e.target.value})}>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="scale">Scale</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Phone</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={form.contactPhone} onChange={e => setForm({...form, contactPhone: e.target.value})} />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Email</label>
              <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Assigned To</label>
            <select className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})}>
              <option>Jeff</option><option>Jordan</option><option>Linus</option><option>Gary</option><option>Steve</option><option>Warren</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Notes</label>
            <textarea className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-brand-400 text-black text-sm font-semibold hover:bg-brand-300 transition-colors disabled:opacity-50">
              {saving ? "Saving…" : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FulfillmentTracker() {
  const [records, setRecords] = useState<FulfillmentRecord[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState("all");
  const [nicheFilter, setNicheFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/fulfillment").then(r => r.json()).catch(() => ({ records: [], stats: null }));
    setRecords(r.records || []);
    setStats(r.stats || null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r => {
    if (filter !== "all" && r.stage !== filter) return false;
    if (nicheFilter !== "all" && r.niche !== nicheFilter) return false;
    return true;
  });

  const totalRevenue = stats?.totalRevenue || 0;
  const pending = stats?.pendingPayments || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">📋 Fulfillment Tracker</h1>
            <p className="text-sm text-zinc-500 mt-1">Track every client from onboarding to live</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="p-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-brand-400 text-black text-sm font-semibold rounded-xl hover:bg-brand-300 transition-colors">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Clients", value: records.filter(r => r.stage !== "live").length, sub: "in delivery" },
          { label: "Live This Month", value: records.filter(r => r.stage === "live").length, sub: "delivered" },
          { label: "Revenue Collected", value: `₹${(totalRevenue/1000).toFixed(0)}K`, sub: "confirmed payments" },
          { label: "Pending Payments", value: `₹${(pending/1000).toFixed(0)}K`, sub: "awaiting collection" },
        ].map((s, i) => (
          <div key={i} className="bg-surface-2 rounded-xl p-4 border border-white/5">
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-zinc-400 mt-1">{s.label}</div>
            <div className="text-[10px] text-zinc-600">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all","onboarding","building","review","revisions","golive","live"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-brand-400 text-black" : "bg-white/5 text-zinc-400 hover:text-white"}`}>
            {f === "all" ? "All" : STAGE_LABELS[f] || f}
          </button>
        ))}
        <div className="ml-2 border-l border-white/10 pl-2 flex gap-2">
          {["all","dental","ca/tax","education","lawyers"].map(n => (
            <button key={n} onClick={() => setNicheFilter(n)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${nicheFilter === n ? "bg-white/10 text-white" : "bg-white/5 text-zinc-500 hover:text-white"}`}>
              {n === "all" ? "All Niches" : n}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-surface-2 rounded-xl h-48 animate-pulse border border-white/5" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-zinc-400 font-medium">No clients in fulfillment yet</div>
          <div className="text-zinc-600 text-sm mt-1">Add your first client to start tracking delivery</div>
          <button onClick={() => setShowAdd(true)} className="mt-4 px-5 py-2.5 bg-brand-400 text-black text-sm font-semibold rounded-xl hover:bg-brand-300 transition-colors">
            + Add First Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => <ClientCard key={r.id} record={r} onUpdate={load} />)}
        </div>
      )}

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onAdd={load} />}
    </div>
  );
}
