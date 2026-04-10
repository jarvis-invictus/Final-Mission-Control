"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Zap, Users, BarChart3, MessageSquare, Calendar, Phone, Mail,
  Loader2, RefreshCw, AlertCircle, ExternalLink, DollarSign,
  ArrowRight, Tag, Clock, ChevronRight, Filter, X, Star,
  Plus, Send, UserPlus, Edit3, Eye, Globe, Shield,
} from "lucide-react";
import { clsx } from "clsx";

/* ================================================================ */
/*  TYPES                                                            */
/* ================================================================ */

interface Contact {
  id: string; name: string; email: string; phone: string;
  tags: string[]; dateAdded: string; companyName: string; source: string;
}

interface Pipeline {
  id: string; name: string;
  stages: { id: string; name: string; position: number }[];
}

interface Opportunity {
  id: string; name: string; status: string; monetaryValue: number;
  pipelineId: string; pipelineStageId: string; dateAdded: string;
  contact?: { name?: string; email?: string };
  assignedTo?: string;
  lastStatusChangeAt?: string;
}

interface Conversation {
  id: string; contactName: string; contactId: string; type: string;
  lastMessageType: string; lastMessageBody: string; lastMessageDate: string;
  unreadCount: number;
}

interface GHLCalendar {
  id: string; name: string; description: string; slug: string; isActive: boolean;
}

interface GHLData {
  contacts: { total: number; items: Contact[] };
  pipelines: { total: number; items: Pipeline[] };
  opportunities: { total: number; items: Opportunity[] };
  conversations: { total: number; items: Conversation[] };
  calendars: { total: number; items: GHLCalendar[] };
}

/* ================================================================ */
/*  HELPERS                                                           */
/* ================================================================ */

function relTime(iso: string): string {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function currency(v: number): string {
  if (!v) return "₹0";
  return `₹${v.toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

/* ================================================================ */
/*  STAT CARD                                                         */
/* ================================================================ */

function StatCard({ label, value, icon: Icon, sub, onClick }: {
  label: string; value: string | number; icon: typeof Users; sub?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className="bg-surface-2 rounded-xl p-5 border border-surface-5 hover:border-brand-400/20 transition-all text-left w-full group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-brand-400" />
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-brand-400 transition-colors" />
      </div>
      <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-sm text-zinc-500">{label}</div>
      {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
    </button>
  );
}

/* ================================================================ */
/*  DETAIL PANEL (slide-over)                                         */
/* ================================================================ */

function DetailPanel({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-surface-1 border-l border-surface-5 overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface-1/95 backdrop-blur-md px-6 py-4 border-b border-surface-5 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-3 rounded-lg">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-white/5">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={clsx("text-sm text-zinc-200 text-right max-w-[60%] break-all", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

/* ================================================================ */
/*  MAIN COMPONENT                                                     */
/* ================================================================ */

type Tab = "overview" | "contacts" | "pipeline" | "conversations" | "calendars";

export default function GHLDashboard() {
  const [data, setData] = useState<GHLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [lastSync, setLastSync] = useState<string>("");

  // Detail panels
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<GHLCalendar | null>(null);

  // Create forms
  const [showCreateContact, setShowCreateContact] = useState(false);
  const [showCreateOpp, setShowCreateOpp] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", email: "", phone: "", companyName: "", tags: "" });
  const [oppForm, setOppForm] = useState({ name: "", pipelineId: "", pipelineStageId: "", monetaryValue: "", contactId: "" });

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch("/api/ghl?section=overview");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setData(d);
      setLastSync(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      if (d.pipelines?.items?.length > 0 && !selectedPipeline) {
        setSelectedPipeline(d.pipelines.items[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [selectedPipeline]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleCreateContact = async () => {
    if (!contactForm.firstName) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createContact",
          ...contactForm,
          tags: contactForm.tags ? contactForm.tags.split(",").map(t => t.trim()) : [],
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setShowCreateContact(false);
        setContactForm({ firstName: "", lastName: "", email: "", phone: "", companyName: "", tags: "" });
        load();
      }
    } catch {} finally { setCreateLoading(false); }
  };

  const handleCreateOpp = async () => {
    if (!oppForm.name || !oppForm.pipelineId) return;
    setCreateLoading(true);
    try {
      const res = await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createOpportunity",
          ...oppForm,
          monetaryValue: Number(oppForm.monetaryValue) || 0,
        }),
      });
      const data = await res.json();
      if (!data.error) {
        setShowCreateOpp(false);
        setOppForm({ name: "", pipelineId: "", pipelineStageId: "", monetaryValue: "", contactId: "" });
        load();
      }
    } catch {} finally { setCreateLoading(false); }
  };

  const totalValue = useMemo(() => {
    if (!data) return 0;
    return data.opportunities.items.reduce((sum, o) => sum + (o.monetaryValue || 0), 0);
  }, [data]);

  const activePipeline = useMemo(() => {
    if (!data || !selectedPipeline) return null;
    return data.pipelines.items.find(p => p.id === selectedPipeline);
  }, [data, selectedPipeline]);

  const stageOpps = useMemo(() => {
    if (!data || !selectedPipeline) return {};
    const map: Record<string, Opportunity[]> = {};
    for (const o of data.opportunities.items) {
      if (o.pipelineId === selectedPipeline) {
        const key = o.pipelineStageId || "unknown";
        if (!map[key]) map[key] = [];
        map[key].push(o);
      }
    }
    return map;
  }, [data, selectedPipeline]);

  const TABS = [
    { key: "overview" as Tab, label: "Overview", icon: BarChart3 },
    { key: "contacts" as Tab, label: "Contacts", icon: Users },
    { key: "pipeline" as Tab, label: "Pipeline", icon: ArrowRight },
    { key: "conversations" as Tab, label: "Conversations", icon: MessageSquare },
    { key: "calendars" as Tab, label: "Calendars", icon: Calendar },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Go High Level</h1>
            <p className="text-sm text-zinc-500">
              Live CRM · 30s sync
              {lastSync && <span className="text-zinc-600"> · {lastSync}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://app.gohighlevel.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-2 border border-white/5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Open GHL
          </a>
          <button onClick={load} className="p-2 hover:bg-surface-3 rounded-lg">
            <RefreshCw className={clsx("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={clsx("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
              activeTab === t.key ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "bg-surface-2 text-zinc-400 border-white/5 hover:text-zinc-200"
            )}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
            {data && (
              <span className="text-[10px] text-zinc-600 ml-0.5">
                {t.key === "contacts" ? data.contacts.total :
                 t.key === "pipeline" ? data.opportunities.total :
                 t.key === "conversations" ? data.conversations.total :
                 t.key === "calendars" ? data.calendars.total : ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-zinc-400">{error}</p>
          <button onClick={load} className="text-xs text-brand-400 hover:underline">Retry</button>
        </div>
      ) : data && (
        <>
          {/* ======================= OVERVIEW ======================= */}
          {activeTab === "overview" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Contacts" value={data.contacts.total} icon={Users} sub="Total in CRM" onClick={() => setActiveTab("contacts")} />
                <StatCard label="Opportunities" value={data.opportunities.total} icon={BarChart3} sub={`${currency(totalValue)} pipeline`} onClick={() => setActiveTab("pipeline")} />
                <StatCard label="Pipelines" value={data.pipelines.total} icon={ArrowRight} sub={data.pipelines.items.map(p => p.name).join(", ")} onClick={() => setActiveTab("pipeline")} />
                <StatCard label="Conversations" value={data.conversations.total} icon={MessageSquare} onClick={() => setActiveTab("conversations")} />
                <StatCard label="Calendars" value={data.calendars.total} icon={Calendar}
                  sub={data.calendars.items.map(c => c.name).join(", ").slice(0, 50)}
                  onClick={() => setActiveTab("calendars")} />
              </div>

              {/* Pipeline Kanban */}
              {activePipeline && (
                <div className="bg-surface-2 rounded-xl border border-surface-5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Pipeline: {activePipeline.name}</h2>
                    <div className="flex gap-1">
                      {data.pipelines.items.map(p => (
                        <button key={p.id} onClick={() => setSelectedPipeline(p.id)}
                          className={clsx("px-2 py-1 text-[10px] rounded-lg border transition-colors",
                            p.id === selectedPipeline ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "bg-surface-3 text-zinc-500 border-white/5"
                          )}>{p.name}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {activePipeline.stages.sort((a, b) => a.position - b.position).map(stage => {
                      const opps = stageOpps[stage.id] || [];
                      const value = opps.reduce((s, o) => s + (o.monetaryValue || 0), 0);
                      return (
                        <div key={stage.id} className="flex-shrink-0 w-48 bg-surface-3 rounded-lg border border-white/5 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-zinc-300 truncate">{stage.name}</span>
                            <span className="text-[10px] bg-surface-4 px-1.5 py-0.5 rounded-full text-zinc-500">{opps.length}</span>
                          </div>
                          {value > 0 && <div className="text-xs text-brand-400 mb-2">{currency(value)}</div>}
                          <div className="space-y-1">
                            {opps.slice(0, 3).map(o => (
                              <button key={o.id} onClick={() => setSelectedOpp(o)}
                                className="w-full text-left p-2 bg-surface-2 rounded border border-white/5 text-[11px] hover:border-brand-400/20 transition-colors">
                                <div className="text-zinc-300 truncate">{o.name}</div>
                                {o.monetaryValue > 0 && <div className="text-zinc-500">{currency(o.monetaryValue)}</div>}
                              </button>
                            ))}
                            {opps.length > 3 && <div className="text-[10px] text-zinc-600 text-center">+{opps.length - 3} more</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Conversations */}
              <div className="bg-surface-2 rounded-xl border border-surface-5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Recent Conversations</h2>
                  <button onClick={() => setActiveTab("conversations")}
                    className="text-xs text-brand-400 hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1">
                  {data.conversations.items.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => setSelectedConvo(c)}
                      className="w-full text-left flex items-center gap-3 p-3 bg-surface-3 rounded-lg hover:bg-surface-4 hover:border-brand-400/10 transition-colors border border-transparent">
                      <div className="w-8 h-8 rounded-full bg-brand-400/10 flex items-center justify-center flex-shrink-0">
                        {c.type === "TYPE_PHONE" ? <Phone className="w-3.5 h-3.5 text-brand-400" /> :
                         c.type === "TYPE_EMAIL" ? <Mail className="w-3.5 h-3.5 text-brand-400" /> :
                         <MessageSquare className="w-3.5 h-3.5 text-brand-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">{c.contactName || "Unknown"}</div>
                        {c.lastMessageBody && <div className="text-xs text-zinc-500 truncate">{c.lastMessageBody}</div>}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-600 flex-shrink-0">
                        <span className="px-1.5 py-0.5 bg-surface-2 rounded text-[10px]">{c.lastMessageType?.replace("TYPE_", "")}</span>
                        {c.lastMessageDate && <span>{relTime(c.lastMessageDate)}</span>}
                        {c.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] flex items-center justify-center font-bold">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ======================= CONTACTS ======================= */}
          {activeTab === "contacts" && (
            <div className="bg-surface-2 rounded-xl border border-surface-5 overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{data.contacts.total} Contacts</h2>
                <button onClick={() => setShowCreateContact(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-400/10 text-brand-400 border border-brand-400/20 rounded-lg text-xs font-medium hover:bg-brand-400/20 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Contact
                </button>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {data.contacts.items.map(c => (
                  <button key={c.id} onClick={() => setSelectedContact(c)}
                    className="w-full text-left flex items-center gap-4 px-5 py-3 hover:bg-surface-3 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-brand-400/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-brand-400">{(c.name || "?")[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200">{c.name || c.companyName || "Unknown"}</div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        {c.email && <span className="truncate">{c.email}</span>}
                        {c.phone && <span>{c.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {(c.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-brand-400/10 text-brand-400 rounded border border-brand-400/20">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-zinc-600">{c.dateAdded && relTime(c.dateAdded)}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ======================= PIPELINE ======================= */}
          {activeTab === "pipeline" && activePipeline && (
            <div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {data.pipelines.items.map(p => (
                  <button key={p.id} onClick={() => setSelectedPipeline(p.id)}
                    className={clsx("px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors",
                      p.id === selectedPipeline ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "bg-surface-2 text-zinc-400 border-white/5"
                    )}>{p.name} ({p.stages.length} stages)</button>
                ))}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {activePipeline.stages.sort((a, b) => a.position - b.position).map(stage => {
                  const opps = stageOpps[stage.id] || [];
                  const value = opps.reduce((s, o) => s + (o.monetaryValue || 0), 0);
                  return (
                    <div key={stage.id} className="flex-shrink-0 w-64 bg-surface-2 rounded-xl border border-surface-5 flex flex-col">
                      <div className="px-4 py-3 border-b border-surface-5 flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-300">{stage.name}</span>
                        <div className="flex items-center gap-2">
                          {value > 0 && <span className="text-[10px] text-brand-400 font-medium">{currency(value)}</span>}
                          <span className="text-xs bg-surface-3 px-2 py-0.5 rounded-full text-zinc-500">{opps.length}</span>
                        </div>
                      </div>
                      <div className="p-3 space-y-2 flex-1">
                        {opps.length === 0 ? (
                          <div className="text-xs text-zinc-600 text-center py-4">No deals</div>
                        ) : opps.map(o => (
                          <button key={o.id} onClick={() => setSelectedOpp(o)}
                            className="w-full text-left p-3 bg-surface-3 rounded-lg border border-white/5 hover:border-brand-400/20 transition-colors group">
                            <div className="text-sm text-zinc-200 font-medium truncate mb-1">{o.name}</div>
                            <div className="flex items-center justify-between text-xs">
                              {o.monetaryValue > 0 && (
                                <span className="flex items-center gap-1 text-brand-400 font-medium">
                                  <DollarSign className="w-3 h-3" />{currency(o.monetaryValue)}
                                </span>
                              )}
                              <span className={clsx("px-1.5 py-0.5 rounded text-[10px]",
                                o.status === "open" ? "bg-emerald-500/10 text-emerald-400" :
                                o.status === "won" ? "bg-brand-400/10 text-brand-400" :
                                o.status === "lost" ? "bg-red-500/10 text-red-400" :
                                "bg-zinc-600/10 text-zinc-400"
                              )}>{o.status}</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-brand-400 mt-1 ml-auto transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================= CONVERSATIONS ======================= */}
          {activeTab === "conversations" && (
            <div className="bg-surface-2 rounded-xl border border-surface-5 overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{data.conversations.total} Conversations</h2>
                <a href="https://app.gohighlevel.com/v2/location/AVBEYuMBQNnuxogWO6YQ/conversations" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-brand-400 transition-colors">
                  <Send className="w-3 h-3" /> Open in GHL
                </a>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {data.conversations.items.map(c => (
                  <button key={c.id} onClick={() => setSelectedConvo(c)}
                    className="w-full text-left flex items-center gap-4 px-5 py-3 hover:bg-surface-3 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-brand-400/10 flex items-center justify-center flex-shrink-0">
                      {c.type === "TYPE_PHONE" ? <Phone className="w-4 h-4 text-brand-400" /> :
                       c.type === "TYPE_EMAIL" ? <Mail className="w-4 h-4 text-brand-400" /> :
                       <MessageSquare className="w-4 h-4 text-brand-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200">{c.contactName || "Unknown"}</div>
                      {c.lastMessageBody && <p className="text-xs text-zinc-500 truncate mt-0.5">{c.lastMessageBody}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-zinc-600">{c.type?.replace("TYPE_", "")}</div>
                      {c.lastMessageDate && <div className="text-[10px] text-zinc-600">{relTime(c.lastMessageDate)}</div>}
                      {c.unreadCount > 0 && (
                        <span className="inline-flex w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] items-center justify-center font-bold mt-1">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ======================= CALENDARS ======================= */}
          {activeTab === "calendars" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.calendars.items.map(cal => (
                  <button key={cal.id} onClick={() => setSelectedCalendar(cal)}
                    className="text-left bg-surface-2 rounded-xl border border-surface-5 p-5 hover:border-brand-400/20 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-brand-400/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-brand-400" />
                      </div>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full",
                        cal.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-600/10 text-zinc-500"
                      )}>{cal.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-200 mb-1">{cal.name}</h3>
                    {cal.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{cal.description.replace(/<[^>]*>/g, "").slice(0, 100)}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {cal.slug && (
                        <a href={`https://link.invictus-ai.in/widget/booking/${cal.slug}`} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-[10px] text-brand-400 hover:underline">
                          <Globe className="w-3 h-3" /> Booking Link
                        </a>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-brand-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-xs text-zinc-600 text-center">
                {data.calendars.total} calendar{data.calendars.total !== 1 ? "s" : ""} configured ·
                <a href="https://app.gohighlevel.com/v2/location/AVBEYuMBQNnuxogWO6YQ/settings/calendars" target="_blank" rel="noopener noreferrer"
                  className="text-brand-400 hover:underline ml-1">Manage in GHL</a>
              </div>
            </div>
          )}

          {/* ======================= DETAIL PANELS ======================= */}

          {/* Contact Detail */}
          {selectedContact && (
            <DetailPanel title={selectedContact.name || "Contact"} onClose={() => setSelectedContact(null)}>
              <div className="space-y-1">
                <DetailRow label="Name" value={selectedContact.name} />
                <DetailRow label="Company" value={selectedContact.companyName} />
                <DetailRow label="Email" value={selectedContact.email} />
                <DetailRow label="Phone" value={selectedContact.phone} />
                <DetailRow label="Source" value={selectedContact.source} />
                <DetailRow label="Added" value={formatDate(selectedContact.dateAdded)} />
                <DetailRow label="ID" value={selectedContact.id} mono />
              </div>
              {selectedContact.tags?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedContact.tags.map(t => (
                      <span key={t} className="text-xs px-2 py-1 bg-brand-400/10 text-brand-400 rounded-lg border border-brand-400/20">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-6 flex gap-2">
                <a href={`https://app.gohighlevel.com/v2/location/AVBEYuMBQNnuxogWO6YQ/contacts/detail/${selectedContact.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-400/10 text-brand-400 text-xs font-medium hover:bg-brand-400/20 transition-colors border border-brand-400/20">
                  <ExternalLink className="w-3.5 h-3.5" /> View in GHL
                </a>
              </div>
            </DetailPanel>
          )}

          {/* Opportunity Detail */}
          {selectedOpp && (
            <DetailPanel title={selectedOpp.name || "Opportunity"} onClose={() => setSelectedOpp(null)}>
              <div className="space-y-1">
                <DetailRow label="Name" value={selectedOpp.name} />
                <DetailRow label="Value" value={selectedOpp.monetaryValue ? currency(selectedOpp.monetaryValue) : "—"} />
                <DetailRow label="Status" value={selectedOpp.status} />
                <DetailRow label="Pipeline" value={data.pipelines.items.find(p => p.id === selectedOpp.pipelineId)?.name || selectedOpp.pipelineId} />
                <DetailRow label="Stage" value={
                  data.pipelines.items.find(p => p.id === selectedOpp.pipelineId)
                    ?.stages.find(s => s.id === selectedOpp.pipelineStageId)?.name || "—"
                } />
                <DetailRow label="Contact" value={selectedOpp.contact?.name || "—"} />
                <DetailRow label="Added" value={formatDate(selectedOpp.dateAdded)} />
                <DetailRow label="Last Change" value={formatDate(selectedOpp.lastStatusChangeAt || "")} />
                <DetailRow label="ID" value={selectedOpp.id} mono />
              </div>
              <div className="mt-6 flex gap-2">
                <a href={`https://app.gohighlevel.com/v2/location/AVBEYuMBQNnuxogWO6YQ/opportunities/list`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-400/10 text-brand-400 text-xs font-medium hover:bg-brand-400/20 transition-colors border border-brand-400/20">
                  <ExternalLink className="w-3.5 h-3.5" /> View in GHL
                </a>
              </div>
            </DetailPanel>
          )}

          {/* Conversation Detail */}
          {selectedConvo && (
            <DetailPanel title={selectedConvo.contactName || "Conversation"} onClose={() => setSelectedConvo(null)}>
              <div className="space-y-1">
                <DetailRow label="Contact" value={selectedConvo.contactName} />
                <DetailRow label="Type" value={selectedConvo.type?.replace("TYPE_", "")} />
                <DetailRow label="Last Message Type" value={selectedConvo.lastMessageType?.replace("TYPE_", "")} />
                <DetailRow label="Last Updated" value={selectedConvo.lastMessageDate ? relTime(selectedConvo.lastMessageDate) : ""} />
                <DetailRow label="Unread" value={String(selectedConvo.unreadCount || 0)} />
                <DetailRow label="ID" value={selectedConvo.id} mono />
              </div>
              {selectedConvo.lastMessageBody && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-500 mb-2">Last Message</p>
                  <div className="p-3 bg-surface-3 rounded-lg border border-white/5 text-sm text-zinc-300">
                    {selectedConvo.lastMessageBody}
                  </div>
                </div>
              )}
              <div className="mt-6 flex gap-2">
                <a href={`https://app.gohighlevel.com/v2/location/AVBEYuMBQNnuxogWO6YQ/conversations/${selectedConvo.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-400/10 text-brand-400 text-xs font-medium hover:bg-brand-400/20 transition-colors border border-brand-400/20">
                  <MessageSquare className="w-3.5 h-3.5" /> Open Conversation in GHL
                </a>
              </div>
            </DetailPanel>
          )}

          {/* Calendar Detail */}
          {selectedCalendar && (
            <DetailPanel title={selectedCalendar.name || "Calendar"} onClose={() => setSelectedCalendar(null)}>
              <div className="space-y-1">
                <DetailRow label="Name" value={selectedCalendar.name} />
                <DetailRow label="Status" value={selectedCalendar.isActive ? "Active" : "Inactive"} />
                <DetailRow label="Slug" value={selectedCalendar.slug} />
                <DetailRow label="ID" value={selectedCalendar.id} mono />
              </div>
              {selectedCalendar.description && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-500 mb-2">Description</p>
                  <div className="p-3 bg-surface-3 rounded-lg border border-white/5 text-sm text-zinc-300">
                    {selectedCalendar.description.replace(/<[^>]*>/g, "")}
                  </div>
                </div>
              )}
              {selectedCalendar.slug && (
                <div className="mt-4">
                  <p className="text-xs text-zinc-500 mb-2">Booking Link</p>
                  <a href={`https://link.invictus-ai.in/widget/booking/${selectedCalendar.slug}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-surface-3 rounded-lg border border-white/5 text-sm text-brand-400 hover:text-white transition-colors">
                    <Globe className="w-4 h-4" />
                    link.invictus-ai.in/widget/booking/{selectedCalendar.slug}
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </a>
                </div>
              )}
              <div className="mt-6 flex gap-2">
                <a href={`https://app.gohighlevel.com/v2/location/AVBEYuMBQNnuxogWO6YQ/settings/calendars`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-400/10 text-brand-400 text-xs font-medium hover:bg-brand-400/20 transition-colors border border-brand-400/20">
                  <ExternalLink className="w-3.5 h-3.5" /> Manage in GHL
                </a>
              </div>
            </DetailPanel>
          )}
        </>
      )}

      {/* ======================= CREATE CONTACT MODAL ======================= */}
      {showCreateContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowCreateContact(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-surface-1 border border-surface-5 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-400/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Add Contact to GHL</h2>
              </div>
              <button onClick={() => setShowCreateContact(false)} className="p-2 hover:bg-surface-3 rounded-xl"><X className="w-5 h-5 text-zinc-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block font-medium">First Name *</label>
                  <input value={contactForm.firstName} onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))}
                    placeholder="John"
                    className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Last Name</label>
                  <input value={contactForm.lastName} onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))}
                    placeholder="Doe"
                    className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Email</label>
                  <input type="email" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@clinic.com"
                    className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Phone</label>
                  <input type="tel" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
                </div>
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Company</label>
                <input value={contactForm.companyName} onChange={e => setContactForm(f => ({ ...f, companyName: e.target.value }))}
                  placeholder="ABC Dental Clinic"
                  className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1.5 block font-medium">Tags (comma-separated)</label>
                <input value={contactForm.tags} onChange={e => setContactForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="dental, pune, lead"
                  className="w-full px-4 py-3 bg-surface-2 border border-surface-5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
              </div>
            </div>
            <div className="px-6 py-5 border-t border-surface-5 flex justify-end gap-3">
              <button onClick={() => setShowCreateContact(false)} className="px-5 py-2.5 text-sm text-zinc-400">Cancel</button>
              <button onClick={handleCreateContact} disabled={!contactForm.firstName || createLoading}
                className="px-6 py-2.5 bg-brand-400 text-black text-sm font-semibold rounded-xl hover:bg-brand-300 disabled:opacity-40 transition-colors flex items-center gap-2">
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create in GHL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
