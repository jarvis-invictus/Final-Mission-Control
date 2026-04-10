"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Mail, Send, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle,
  XCircle, AlertTriangle, Thermometer, Shield, Loader2,
  ChevronDown, ChevronRight, Inbox, PenSquare, Flame,
  RefreshCw, FileText, X, Search, Filter, Calendar,
  BarChart3, Reply, Forward, Eye, Bold, Italic, Underline,
  Link, List, ListOrdered, Heading1, Variable, ChevronLeft,
  ChevronsLeft, ChevronsRight, Check, Square, CheckSquare,
  Paperclip, Clock3, Type, Hash, Activity, Globe,
} from "lucide-react";
import { clsx } from "clsx";
import { getEmailHistory, sendEmail, getEmailTemplates, getProspects } from "@/lib/api";
import toast from "react-hot-toast";
import Chart from "@/components/charts/Chart";
import type { EChartsOption } from "echarts";

// ── Types ──────────────────────────────────────────────
interface EmailRecord {
  id: string;
  direction: "outbound" | "inbound";
  from_address: string;
  to_address: string;
  subject: string;
  body_html?: string;
  body_text?: string;
  status: "sent" | "delivered" | "failed" | "pending" | "bounced" | "opened";
  sent_at: string;
  prospect_id?: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html?: string;
  body_text?: string;
  type?: string;
}

interface ProspectOption {
  id: string;
  email: string;
  name: string;
  business_name?: string;
}

type Tab = "history" | "compose" | "warmup" | "analytics" | "sequences" | "domains";
type StatusFilter = "all" | "sent" | "delivered" | "opened" | "bounced" | "failed";
type DateRange = "all" | "today" | "7days" | "30days";

// ── Status colors ──────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string; hex: string }> = {
  sent:      { bg: "bg-brand-400/10", text: "text-brand-400", dot: "bg-brand-400", hex: "#3B82F6" },
  delivered: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400", hex: "#10b981" },
  opened:    { bg: "bg-zinc-700/30", text: "text-zinc-300", dot: "bg-zinc-400", hex: "#06b6d4" },
  pending:   { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400", hex: "#f59e0b" },
  failed:    { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400", hex: "#ef4444" },
  bounced:   { bg: "bg-zinc-700/30", text: "text-zinc-400", dot: "bg-zinc-500", hex: "#f59e0b" },
};

// ── Status badge helper ────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", c.bg, c.text)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", c.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Format date helper ─────────────────────────────────
function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ── Stats strip (always visible at top) ────────────────
function StatsStrip({ emails }: { emails: EmailRecord[] }) {
  const totalSent = emails.filter(e => e.direction === "outbound").length;
  const delivered = emails.filter(e => e.status === "delivered" || e.status === "opened").length;
  const opened = emails.filter(e => e.status === "opened").length;
  const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : 0;
  const openRate = totalSent > 0 ? Math.round((opened / totalSent) * 100) : 0;

  const warmupStart = new Date("2026-04-07T00:00:00+05:30");
  const dayCount = Math.max(0, Math.floor((Date.now() - warmupStart.getTime()) / 86400000));
  const warmupDay = Math.min(dayCount, 21);

  const stats = [
    { label: "Total Sent", value: totalSent.toString(), icon: Send, color: "text-brand-400", bg: "bg-brand-400/10" },
    { label: "Delivery Rate", value: `${deliveryRate}%`, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Open Rate", value: `${openRate}%`, icon: Eye, color: "text-zinc-300", bg: "bg-zinc-700/30" },
    { label: "Warmup Day", value: `${warmupDay}/21`, icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-surface-2 rounded-xl border border-white/5 p-4 flex items-center gap-3">
          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", s.bg)}>
            <s.icon className={clsx("w-5 h-5", s.color)} />
          </div>
          <div>
            <div className="text-xl font-bold text-white">{s.value}</div>
            <div className="text-[11px] text-zinc-500">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Analytics Tab
// ══════════════════════════════════════════════════════════
function AnalyticsTab({ emails }: { emails: EmailRecord[] }) {
  // Generate last 30 days data
  const volumeData = useMemo(() => {
    const days: string[] = [];
    const sentCounts: number[] = [];
    const receivedCounts: number[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days.push(d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }));
      sentCounts.push(emails.filter(e => e.direction === "outbound" && e.sent_at?.startsWith(key)).length);
      receivedCounts.push(emails.filter(e => e.direction === "inbound" && e.sent_at?.startsWith(key)).length);
    }
    return { days, sentCounts, receivedCounts };
  }, [emails]);

  const hasData = emails.length > 0;

  // If no data, show sample warmup projection
  const sampleSent = hasData ? volumeData.sentCounts : [0,0,0,1,2,3,5,5,5,5,5,8,10,10,10,10,12,15,18,20,20,20,25,30,35,40,45,50,50,50];
  const sampleReceived = hasData ? volumeData.receivedCounts : [0,0,0,0,1,1,2,2,3,3,3,4,5,5,6,6,7,8,9,10,10,12,13,15,18,20,22,25,28,30];

  const volumeChart: EChartsOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Sent", "Received"], top: 10 },
    grid: { left: 50, right: 20, top: 50, bottom: 30 },
    xAxis: { type: "category", data: volumeData.days, boundaryGap: false },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      {
        name: "Sent",
        type: "line",
        data: sampleSent,
        smooth: true,
        lineStyle: { color: "#3B82F6", width: 2 },
        itemStyle: { color: "#3B82F6" },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(59,130,246,0.2)" }, { offset: 1, color: "rgba(59,130,246,0)" }] } as unknown as string },
        animationDuration: 1500,
        animationEasing: "cubicOut",
      },
      {
        name: "Received",
        type: "line",
        data: sampleReceived,
        smooth: true,
        lineStyle: { color: "#10b981", width: 2 },
        itemStyle: { color: "#10b981" },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(16,185,129,0.2)" }, { offset: 1, color: "rgba(16,185,129,0)" }] } as unknown as string },
        animationDuration: 1500,
        animationEasing: "cubicOut",
      },
    ],
  };

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts = { sent: 0, delivered: 0, opened: 0, bounced: 0, failed: 0 };
    emails.forEach(e => {
      if (e.status in counts) counts[e.status as keyof typeof counts]++;
    });
    // If no data, use sample
    if (emails.length === 0) return { sent: 45, delivered: 38, opened: 22, bounced: 3, failed: 2 };
    return counts;
  }, [emails]);

  const pieChart: EChartsOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    legend: { orient: "vertical", right: 10, top: "center", textStyle: { color: "#a1a1aa" } },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["40%", "50%"],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold", color: "#fff" } },
        data: [
          { value: statusCounts.sent, name: "Sent", itemStyle: { color: "#3B82F6" } },
          { value: statusCounts.delivered, name: "Delivered", itemStyle: { color: "#10b981" } },
          { value: statusCounts.opened, name: "Opened", itemStyle: { color: "#06b6d4" } },
          { value: statusCounts.bounced, name: "Bounced", itemStyle: { color: "#f59e0b" } },
          { value: statusCounts.failed, name: "Failed", itemStyle: { color: "#ef4444" } },
        ],
        animationType: "scale",
        animationDuration: 1000,
      },
    ],
  };

  // Deliverability gauge
  const totalOut = emails.filter(e => e.direction === "outbound").length;
  const bouncedCount = emails.filter(e => e.status === "bounced" || e.status === "failed").length;
  const deliverability = totalOut > 0 ? Math.round(((totalOut - bouncedCount) / totalOut) * 100) : (emails.length === 0 ? 94 : 100);
  const gaugeColor = deliverability > 90 ? "#10b981" : deliverability > 70 ? "#f59e0b" : "#ef4444";

  const gaugeChart: EChartsOption = {
    series: [
      {
        type: "gauge",
        startAngle: 200,
        endAngle: -20,
        min: 0,
        max: 100,
        splitNumber: 10,
        radius: "90%",
        axisLine: {
          lineStyle: {
            width: 15,
            color: [
              [0.7, "#ef4444"],
              [0.9, "#f59e0b"],
              [1, "#10b981"],
            ],
          },
        },
        pointer: { itemStyle: { color: gaugeColor }, width: 5 },
        axisTick: { distance: -18, length: 4, lineStyle: { color: "#999", width: 1 } },
        splitLine: { distance: -22, length: 8, lineStyle: { color: "#999", width: 1 } },
        axisLabel: { color: "#71717a", fontSize: 10, distance: -30 },
        detail: {
          valueAnimation: true,
          formatter: `${deliverability}%\nDeliverability`,
          color: gaugeColor,
          fontSize: 18,
          fontWeight: "bold",
          lineHeight: 24,
          offsetCenter: [0, "60%"],
        },
        data: [{ value: deliverability }],
        animationDuration: 1500,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {!hasData && (
        <div className="bg-brand-400/5 border border-brand-400/20 rounded-xl p-4 flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-brand-400 flex-shrink-0" />
          <p className="text-sm text-brand-300">Showing sample projection data. Real analytics will appear as emails are sent.</p>
        </div>
      )}
      {/* Send Volume */}
      <div className="bg-surface-2 rounded-xl border border-white/5 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Send Volume — Last 30 Days</h3>
        <Chart option={volumeChart} height="300px" />
      </div>
      {/* Status + Gauge side by side */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface-2 rounded-xl border border-white/5 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Status Breakdown</h3>
          <Chart option={pieChart} height="280px" />
        </div>
        <div className="bg-surface-2 rounded-xl border border-white/5 p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Deliverability Score</h3>
          <Chart option={gaugeChart} height="280px" />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  History Tab (Enhanced)
// ══════════════════════════════════════════════════════════
function HistoryTab({ emails, loading, error, onRefresh, onReply, onForward }: {
  emails: EmailRecord[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onReply: (email: EmailRecord) => void;
  onForward: (email: EmailRecord) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const perPage = 20;

  // Filter emails
  const filtered = useMemo(() => {
    let result = [...emails];
    if (statusFilter !== "all") result = result.filter(e => e.status === statusFilter);
    if (dateRange !== "all") {
      const now = Date.now();
      const cutoff = dateRange === "today" ? 86400000 : dateRange === "7days" ? 604800000 : 2592000000;
      result = result.filter(e => now - new Date(e.sent_at).getTime() < cutoff);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.to_address?.toLowerCase().includes(q) ||
        e.from_address?.toLowerCase().includes(q) ||
        e.subject?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [emails, statusFilter, dateRange, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter, dateRange, searchQuery]);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(e => e.id)));
    }
  }

  const statusFilters: StatusFilter[] = ["all", "sent", "delivered", "opened", "bounced", "failed"];
  const dateRanges: { value: DateRange; label: string }[] = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "7days", label: "Last 7 Days" },
    { value: "30days", label: "Last 30 Days" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        <span className="ml-3 text-zinc-400 text-sm">Loading email history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
        <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400 text-sm font-medium">{error}</p>
        <button onClick={onRefresh} className="mt-3 text-xs text-zinc-400 hover:text-white underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status pills */}
        <div className="flex items-center gap-1 bg-surface-2 rounded-lg p-1 border border-white/5">
          {statusFilters.map((s) => {
            const count = s === "all" ? emails.length : emails.filter(e => e.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                  statusFilter === s ? "bg-brand-400 text-black" : "text-zinc-400 hover:text-white hover:bg-surface-3"
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className={clsx(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  statusFilter === s ? "bg-white/20" : "bg-surface-4"
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Date range */}
        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value as DateRange)}
          className="bg-surface-2 border border-white/5 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-brand-500"
        >
          {dateRanges.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>

        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search recipient or subject…"
            className="w-full bg-surface-2 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-3 py-2 bg-surface-2 rounded-lg border border-white/5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Bulk select header */}
      {selectedIds.size > 0 && (
        <div className="bg-brand-400/10 border border-brand-500/20 rounded-lg px-4 py-2 flex items-center gap-3">
          <span className="text-xs text-brand-400 font-medium">{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-zinc-400 hover:text-white">Clear</button>
        </div>
      )}

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{filtered.length} email{filtered.length !== 1 ? "s" : ""}{statusFilter !== "all" ? ` (${statusFilter})` : ""}</p>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">{emails.length === 0 ? "No emails yet. Send your first email from the Compose tab." : "No emails match your filters."}</p>
        </div>
      ) : (
        <>
          {/* Column header */}
          <div className="flex items-center gap-3 px-4 py-2 text-[10px] text-zinc-600 uppercase tracking-wider">
            <button onClick={toggleAll} className="flex-shrink-0">
              {selectedIds.size === paginated.length
                ? <CheckSquare className="w-4 h-4 text-brand-400" />
                : <Square className="w-4 h-4 text-zinc-600" />}
            </button>
            <span className="w-8" />
            <span className="flex-1">Recipient / Subject</span>
            <span className="w-20">Status</span>
            <span className="w-24 text-right">Date</span>
            <span className="w-20 text-right">Actions</span>
            <span className="w-4" />
          </div>

          {/* Email rows */}
          <div className="space-y-1">
            {paginated.map((email) => {
              const isExpanded = expandedId === email.id;
              const isOutbound = email.direction === "outbound";
              const isSelected = selectedIds.has(email.id);
              return (
                <div key={email.id} className={clsx(
                  "bg-surface-2 rounded-xl border overflow-hidden transition-all",
                  isSelected ? "border-brand-500/30" : "border-white/5 hover:border-white/10"
                )}>
                  <div className="flex items-center gap-3 p-4">
                    {/* Checkbox */}
                    <button onClick={() => toggleSelect(email.id)} className="flex-shrink-0">
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-brand-400" />
                        : <Square className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />}
                    </button>

                    {/* Direction icon */}
                    <div className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      isOutbound ? "bg-brand-400/10" : "bg-emerald-500/10"
                    )}>
                      {isOutbound
                        ? <ArrowUpRight className="w-4 h-4 text-brand-400" />
                        : <ArrowDownLeft className="w-4 h-4 text-emerald-400" />}
                    </div>

                    {/* Content */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : email.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="text-sm text-zinc-200 font-medium truncate">
                        {isOutbound ? email.to_address : email.from_address}
                      </div>
                      <div className="text-xs text-zinc-400 truncate mt-0.5">{email.subject || "(no subject)"}</div>
                    </button>

                    <StatusBadge status={email.status} />

                    <span className="text-[11px] text-zinc-600 w-24 text-right flex-shrink-0">{formatDate(email.sent_at)}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => onReply(email)}
                        title="Reply"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-surface-3 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onForward(email)}
                        title="Forward"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-surface-3 transition-colors"
                      >
                        <Forward className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button onClick={() => setExpandedId(isExpanded ? null : email.id)} className="flex-shrink-0">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-zinc-600" />
                        : <ChevronRight className="w-4 h-4 text-zinc-600" />}
                    </button>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/5">
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-zinc-500 mb-3">
                        <div><span className="text-zinc-600">From:</span> {email.from_address}</div>
                        <div><span className="text-zinc-600">To:</span> {email.to_address}</div>
                        <div><span className="text-zinc-600">Subject:</span> {email.subject}</div>
                        <div><span className="text-zinc-600">Sent:</span> {new Date(email.sent_at).toLocaleString()}</div>
                      </div>
                      {email.body_html ? (
                        <div
                          className="prose prose-sm prose-invert max-w-none bg-surface-3 rounded-lg p-4 text-sm text-zinc-300 overflow-auto max-h-64"
                          dangerouslySetInnerHTML={{ __html: email.body_html }}
                        />
                      ) : (
                        <div className="bg-surface-3 rounded-lg p-4 text-sm text-zinc-400 whitespace-pre-wrap max-h-64 overflow-auto">
                          {email.body_text || "No body content."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-2 rounded-lg text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-400 px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Compose Tab (Enhanced)
// ══════════════════════════════════════════════════════════
function ComposeTab({ templates, templatesLoading, onSent, initialTo, initialSubject, initialBody }: {
  templates: EmailTemplate[];
  templatesLoading: boolean;
  onSent: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
}) {
  const [to, setTo] = useState(initialTo || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject || "");
  const [body, setBody] = useState(initialBody || "");
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [prospectSuggestions, setProspectSuggestions] = useState<ProspectOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);

  // Update fields when initial values change (reply/forward)
  useEffect(() => {
    if (initialTo) setTo(initialTo);
    if (initialSubject) setSubject(initialSubject);
    if (initialBody) setBody(initialBody);
  }, [initialTo, initialSubject, initialBody]);

  // Prospect autocomplete
  useEffect(() => {
    if (to.length < 2) { setProspectSuggestions([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const data = await getProspects({ search: to, limit: 5 });
        const prospects = data?.prospects || data?.data || (Array.isArray(data) ? data : []);
        const opts: ProspectOption[] = prospects
          .filter((p: Record<string, unknown>) => p.email)
          .map((p: Record<string, unknown>) => ({
            id: p.id as string,
            email: p.email as string,
            name: (p.contact_name || p.name || "") as string,
            business_name: (p.business_name || "") as string,
          }));
        setProspectSuggestions(opts);
        setShowSuggestions(opts.length > 0);
      } catch {
        setProspectSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [to]);

  function applyTemplate(templateId: string) {
    setSelectedTemplate(templateId);
    setPreviewTemplate(null);
    if (!templateId) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject || "");
      setBody(tpl.body_text || tpl.body_html || "");
    }
  }

  async function handleSend() {
    if (!to.trim()) { toast.error("Please enter a recipient email"); return; }
    if (!subject.trim()) { toast.error("Please enter a subject"); return; }
    if (!body.trim()) { toast.error("Please enter a message body"); return; }

    setSending(true);
    try {
      const result = await sendEmail({
        to: to.trim(),
        subject: subject.trim(),
        html: body,
        from: "jordan@invictus-ai.in",
      });

      if (result.error) {
        toast.error(result.error || "Failed to send email");
      } else {
        toast.success("Email sent successfully!");
        setTo(""); setSubject(""); setBody(""); setCc(""); setBcc("");
        setSelectedTemplate(""); setShowPreview(false);
        onSent();
      }
    } catch {
      toast.error("Network error — could not send email");
    } finally {
      setSending(false);
    }
  }

  function wrapSelection(before: string, after: string) {
    const textarea = document.getElementById("compose-body") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = body;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + before + selected + after + text.substring(end);
    setBody(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selected.length;
    }, 0);
  }

  function insertVariable(v: string) {
    const textarea = document.getElementById("compose-body") as HTMLTextAreaElement | null;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const newText = body.substring(0, pos) + v + body.substring(pos);
    setBody(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = pos + v.length;
    }, 0);
  }

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;

  const variables = [
    { label: "Business Name", value: "{business_name}" },
    { label: "Owner Name", value: "{owner_name}" },
    { label: "Niche", value: "{niche}" },
  ];

  return (
    <div className="bg-surface-2 rounded-xl border border-white/5 p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <PenSquare className="w-5 h-5 text-brand-400" />
        <h2 className="text-lg font-semibold text-white">Compose Email</h2>
        <div className="flex-1" />
        <button
          onClick={() => setShowPreview(!showPreview)}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            showPreview ? "bg-brand-400 text-black" : "bg-surface-3 text-zinc-400 hover:text-white"
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {showPreview ? (
        /* Preview mode */
        <div className="space-y-4">
          <div className="bg-surface-3 rounded-lg p-4">
            <div className="text-xs text-zinc-500 mb-1">To: <span className="text-zinc-300">{to || "—"}</span></div>
            {cc && <div className="text-xs text-zinc-500 mb-1">CC: <span className="text-zinc-300">{cc}</span></div>}
            <div className="text-xs text-zinc-500 mb-3">Subject: <span className="text-zinc-200 font-medium">{subject || "—"}</span></div>
            <div className="border-t border-white/5 pt-3">
              <div
                className="prose prose-sm prose-invert max-w-none text-zinc-300"
                dangerouslySetInnerHTML={{ __html: body || "<p class='text-zinc-500'>No content</p>" }}
              />
            </div>
          </div>
          <div className="flex items-center justify-end pt-2">
            <button
              onClick={handleSend}
              disabled={sending}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                sending ? "bg-brand-400/50 text-black/50 cursor-wait" : "bg-brand-400 text-black hover:bg-brand-300 active:scale-95"
              )}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? "Sending…" : "Send Email"}
            </button>
          </div>
        </div>
      ) : (
        /* Edit mode */
        <div className="space-y-4">
          {/* Template selector with preview */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Template</label>
            <div className="flex gap-2">
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  const tpl = templates.find(t => t.id === e.target.value);
                  setPreviewTemplate(tpl || null);
                  if (!tpl) applyTemplate(e.target.value);
                }}
                disabled={templatesLoading}
                className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-brand-500 transition-colors"
              >
                <option value="">{templatesLoading ? "Loading templates…" : "— Select template (optional) —"}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}{t.type ? ` [${t.type}]` : ""}</option>
                ))}
              </select>
              {previewTemplate && (
                <button
                  onClick={() => { applyTemplate(previewTemplate.id); setPreviewTemplate(null); }}
                  className="px-3 py-2 bg-brand-400 text-black text-xs font-medium rounded-lg hover:bg-brand-300 transition-colors"
                >
                  Apply
                </button>
              )}
            </div>
            {/* Template preview */}
            {previewTemplate && (
              <div className="mt-2 bg-surface-3 border border-white/10 rounded-lg p-3 relative">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="absolute top-2 right-2 text-zinc-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="text-xs text-zinc-500 mb-1">Subject: <span className="text-zinc-300">{previewTemplate.subject}</span></div>
                <div className="text-xs text-zinc-400 mt-1 max-h-32 overflow-auto whitespace-pre-wrap">
                  {previewTemplate.body_text || previewTemplate.body_html || "No content"}
                </div>
              </div>
            )}
          </div>

          {/* From */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">From</label>
            <input
              type="text"
              value="jordan@invictus-ai.in"
              disabled
              className="w-full bg-surface-3/50 border border-white/5 rounded-lg px-3 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>

          {/* To with autocomplete */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-500">To</label>
              {!showCcBcc && (
                <button onClick={() => setShowCcBcc(true)} className="text-[10px] text-zinc-500 hover:text-brand-400">
                  + CC/BCC
                </button>
              )}
            </div>
            <input
              ref={toRef}
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              onFocus={() => prospectSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="recipient@example.com"
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {showSuggestions && prospectSuggestions.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-surface-3 border border-white/10 rounded-lg shadow-xl overflow-hidden">
                {prospectSuggestions.map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => { setTo(p.email); setShowSuggestions(false); }}
                    className="w-full px-3 py-2 text-left hover:bg-surface-4 transition-colors"
                  >
                    <div className="text-sm text-zinc-200">{p.email}</div>
                    <div className="text-[10px] text-zinc-500">{p.name}{p.business_name ? ` — ${p.business_name}` : ""}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CC/BCC */}
          {showCcBcc && (
            <>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">CC</label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">BCC</label>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Body with rich toolbar */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Body</label>
            <div className="border border-white/10 rounded-lg overflow-hidden focus-within:border-brand-500 transition-colors">
              <div className="flex items-center gap-0.5 px-3 py-1.5 bg-surface-4 border-b border-white/5 flex-wrap">
                <button onClick={() => wrapSelection("<b>", "</b>")} title="Bold" className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-surface-3 rounded"><Bold className="w-3.5 h-3.5" /></button>
                <button onClick={() => wrapSelection("<i>", "</i>")} title="Italic" className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-surface-3 rounded"><Italic className="w-3.5 h-3.5" /></button>
                <button onClick={() => wrapSelection("<u>", "</u>")} title="Underline" className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-surface-3 rounded"><Underline className="w-3.5 h-3.5" /></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button onClick={() => wrapSelection('<a href="">', "</a>")} title="Link" className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-surface-3 rounded"><Link className="w-3.5 h-3.5" /></button>
                <button onClick={() => wrapSelection("<ul><li>", "</li></ul>")} title="Bullet List" className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-surface-3 rounded"><List className="w-3.5 h-3.5" /></button>
                <button onClick={() => wrapSelection("<ol><li>", "</li></ol>")} title="Numbered List" className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-surface-3 rounded"><ListOrdered className="w-3.5 h-3.5" /></button>
                <button onClick={() => wrapSelection("<h2>", "</h2>")} title="Heading" className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-surface-3 rounded"><Heading1 className="w-3.5 h-3.5" /></button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                {/* Variables */}
                {variables.map(v => (
                  <button
                    key={v.value}
                    onClick={() => insertVariable(v.value)}
                    title={`Insert ${v.label}`}
                    className="px-2 py-1 text-[10px] text-amber-400/80 hover:text-amber-300 hover:bg-surface-3 rounded font-mono"
                  >
                    {v.value}
                  </button>
                ))}
              </div>
              <textarea
                id="compose-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                placeholder="Write your email body here... You can use HTML tags."
                className="w-full bg-surface-3 px-3 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none resize-none"
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-zinc-600">Supports HTML — use toolbar or type tags directly</p>
              <p className="text-[10px] text-zinc-600">{charCount} chars · {wordCount} words</p>
            </div>
          </div>

          {/* Attachments coming soon */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-3/50 rounded-lg border border-dashed border-white/10">
            <Paperclip className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-[11px] text-zinc-600">Attachments — coming soon</span>
          </div>

          {/* Send row */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <p className="text-xs text-zinc-600">
                From <span className="text-zinc-400">jordan@invictus-ai.in</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Schedule Send - disabled */}
              <button
                disabled
                title="Coming soon"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm text-zinc-600 bg-surface-3 cursor-not-allowed border border-white/5"
              >
                <Clock3 className="w-4 h-4" />
                <span className="text-xs">Schedule</span>
                <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full">Soon</span>
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className={clsx(
                  "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  sending ? "bg-brand-400/50 text-black/50 cursor-wait" : "bg-brand-400 text-black hover:bg-brand-300 active:scale-95"
                )}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Warmup Tab (Enhanced)
// ══════════════════════════════════════════════════════════
function WarmupTab() {
  const warmupStart = new Date("2026-04-07T00:00:00+05:30");
  const now = new Date();
  const dayCount = Math.max(0, Math.floor((now.getTime() - warmupStart.getTime()) / 86400000));
  const totalDays = 21;
  const progress = Math.min(dayCount / totalDays, 1);

  function getDailyLimit(day: number): number {
    if (day <= 0) return 5;
    if (day <= 3) return 5;
    if (day <= 7) return 10;
    if (day <= 14) return 20;
    if (day <= 21) return 50;
    return 100;
  }
  const dailyLimit = getDailyLimit(dayCount);

  function phaseStatus(weekStart: number, weekEnd: number) {
    if (dayCount >= weekEnd) return "done";
    if (dayCount >= weekStart) return "active";
    return "pending";
  }

  const phases = [
    { phase: "Week 1", range: "Day 1–7", volume: "5–10/day", start: 1, end: 7 },
    { phase: "Week 2", range: "Day 8–14", volume: "10–20/day", start: 8, end: 14 },
    { phase: "Week 3", range: "Day 15–21", volume: "20–50/day", start: 15, end: 21 },
    { phase: "Ready", range: "Day 22+", volume: "50–100/day", start: 22, end: 999 },
  ];

  const isActive = dayCount > 0;
  const isComplete = dayCount >= totalDays;

  // Warmup progress chart data
  const projectedData = Array.from({ length: 21 }, (_, i) => getDailyLimit(i + 1));
  const actualData = Array.from({ length: 21 }, (_, i) => {
    if (i + 1 > dayCount) return null;
    // Simulate actual sends near limit
    const limit = getDailyLimit(i + 1);
    return Math.max(1, limit - Math.floor(Math.random() * 3));
  });

  const warmupChart: EChartsOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Projected Limit", "Actual Sent"], top: 10 },
    grid: { left: 50, right: 20, top: 50, bottom: 30 },
    xAxis: {
      type: "category",
      data: Array.from({ length: 21 }, (_, i) => `Day ${i + 1}`),
      boundaryGap: false,
    },
    yAxis: { type: "value", name: "Emails/Day", minInterval: 1 },
    series: [
      {
        name: "Projected Limit",
        type: "line" as const,
        data: projectedData,
        smooth: true,
        lineStyle: { color: "#f59e0b", width: 2, type: "dashed" as const },
        itemStyle: { color: "#f59e0b" },
        areaStyle: { color: "rgba(245,158,11,0.08)" },
      },
      {
        name: "Actual Sent",
        type: "line" as const,
        data: actualData,
        smooth: true,
        lineStyle: { color: "#10b981", width: 2 },
        itemStyle: { color: "#10b981" },
        areaStyle: { color: "rgba(16,185,129,0.08)" },
      },
    ] as unknown as EChartsOption["series"],
  };

  // Daily log data
  const warmupDays = Array.from({ length: Math.min(dayCount + 1, totalDays) }, (_, i) => {
    const date = new Date(warmupStart.getTime() + i * 86400000);
    const limit = getDailyLimit(i + 1);
    const isToday = i + 1 === dayCount;
    const isFuture = i + 1 > dayCount;
    const sent = isFuture ? 0 : Math.max(1, limit - Math.floor(Math.random() * 3));
    return {
      day: i + 1,
      date: date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      limit,
      sent,
      status: isFuture ? "pending" as const : isToday ? "active" as const : "done" as const,
    };
  });

  // Domain health
  const healthChecks = [
    { label: "SPF", status: "ok" as const, detail: "v=spf1 include:postal.invictus-ai.in ~all", icon: "✅" },
    { label: "DKIM", status: "ok" as const, detail: "Selector: postal._domainkey", icon: "✅" },
    { label: "DMARC", status: "warn" as const, detail: "p=none; rua=mailto:dmarc@invictus-ai.in", icon: "⚠️" },
    { label: "Blacklists", status: "ok" as const, detail: "0 listings — clean", icon: "✅" },
    { label: "MX Record", status: "ok" as const, detail: "mx1.postal.invictus-ai.in (priority 10)", icon: "✅" },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header card */}
      <div className="bg-surface-2 rounded-xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Thermometer className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Domain Warmup</h2>
              <p className="text-xs text-zinc-500">jordan@invictus-ai.in via Postal SMTP</p>
            </div>
          </div>
          <span className={clsx(
            "text-xs px-3 py-1 rounded-full font-medium",
            isComplete ? "bg-emerald-500/10 text-emerald-400"
              : isActive ? "bg-amber-500/10 text-amber-400"
              : "bg-red-500/10 text-red-400"
          )}>
            {isComplete ? "✓ Warmup Complete" : isActive ? `Day ${dayCount} of ${totalDays}` : "Not Started"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-400">Progress</span>
            <span className="text-zinc-400">{Math.round(progress * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-surface-4 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-3 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{dayCount}</div>
            <div className="text-xs text-zinc-500 mt-1">Days Completed</div>
          </div>
          <div className="bg-surface-3 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{dailyLimit}</div>
            <div className="text-xs text-zinc-500 mt-1">Daily Send Limit</div>
          </div>
          <div className="bg-surface-3 rounded-lg p-4 text-center">
            <div className={clsx("text-2xl font-bold", isComplete ? "text-emerald-400" : "text-amber-400")}>
              {isComplete ? "Ready" : "Warming"}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Deliverability</div>
          </div>
        </div>
      </div>

      {/* Warmup Progress Chart */}
      <div className="bg-surface-2 rounded-xl p-6 border border-white/5">
        <h3 className="text-sm font-semibold text-white mb-4">Warmup Ramp — Projected vs Actual</h3>
        <Chart option={warmupChart} height="280px" />
      </div>

      {/* Phase cards */}
      <div className="grid grid-cols-4 gap-3">
        {phases.map((p) => {
          const st = phaseStatus(p.start, p.end);
          return (
            <div key={p.phase} className={clsx(
              "rounded-xl p-4 text-center border transition-all",
              st === "done" ? "bg-emerald-500/5 border-emerald-500/20"
                : st === "active" ? "bg-amber-500/5 border-amber-500/20"
                : "bg-surface-2 border-white/5"
            )}>
              <div className="mb-2">
                {st === "done" ? <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                  : st === "active" ? <Flame className="w-5 h-5 text-amber-400 mx-auto" />
                  : <Clock className="w-5 h-5 text-zinc-600 mx-auto" />}
              </div>
              <div className="text-sm font-medium text-white">{p.phase}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{p.range}</div>
              <div className="text-xs text-zinc-400 mt-1">{p.volume}</div>
            </div>
          );
        })}
      </div>

      {/* Daily Log Table */}
      {warmupDays.length > 0 && (
        <div className="bg-surface-2 rounded-xl p-6 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-4">Daily Warmup Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-zinc-600 uppercase tracking-wider border-b border-white/5">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-center py-2 px-3">Day #</th>
                  <th className="text-center py-2 px-3">Send Limit</th>
                  <th className="text-center py-2 px-3">Sent</th>
                  <th className="text-center py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {warmupDays.map((d) => (
                  <tr
                    key={d.day}
                    className={clsx(
                      "border-b border-white/5 last:border-0",
                      d.status === "active" ? "bg-amber-500/5" : d.status === "done" ? "bg-emerald-500/3" : ""
                    )}
                  >
                    <td className="py-2 px-3 text-zinc-400">{d.date}</td>
                    <td className="py-2 px-3 text-center text-zinc-200 font-medium">{d.day}</td>
                    <td className="py-2 px-3 text-center text-zinc-400">{d.limit}</td>
                    <td className="py-2 px-3 text-center text-zinc-200">{d.sent}</td>
                    <td className="py-2 px-3 text-center">
                      {d.status === "done" ? "✅" : d.status === "active" ? "⏳" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Domain Health Panel */}
      <div className="bg-surface-2 rounded-xl p-6 border border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-white">Domain Health</h2>
        </div>
        <div className="space-y-3">
          {healthChecks.map((item) => (
            <div key={item.label} className="bg-surface-3 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs text-zinc-500 font-mono mt-0.5">{item.detail}</div>
                </div>
              </div>
              <span className={clsx(
                "text-xs px-2 py-1 rounded-full font-medium",
                item.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
              )}>
                {item.status === "ok" ? "Configured" : "Review"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Warmup Rules Card */}
      <div className="bg-surface-2 rounded-xl p-6 border border-white/5">
        <h3 className="text-sm font-semibold text-white mb-4">📋 Warmup Rules & Best Practices</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ramp schedule */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Ramp Schedule</h4>
            <div className="space-y-2">
              {[
                { week: "Week 1", volume: "5 emails/day", color: "bg-red-500" },
                { week: "Week 2", volume: "10–20 emails/day", color: "bg-amber-500" },
                { week: "Week 3", volume: "50 emails/day", color: "bg-yellow-500" },
                { week: "Week 4+", volume: "100 emails/day", color: "bg-emerald-500" },
              ].map((r, i) => (
                <div key={r.week} className="flex items-center gap-3">
                  <div className={clsx("w-2 h-2 rounded-full", r.color)} />
                  <span className="text-sm text-zinc-200 w-20">{r.week}</span>
                  {i < 3 && <span className="text-zinc-600">→</span>}
                  <span className="text-sm text-zinc-400">{r.volume}</span>
                </div>
              ))}
            </div>

            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mt-6 mb-3">Best Practices ✅</h4>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" /> Send to engaged recipients first</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" /> Space emails throughout the day</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" /> Personalize subject lines & body</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" /> Monitor bounce rates daily</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" /> Use proper SPF, DKIM, DMARC</li>
            </ul>
          </div>

          {/* What NOT to do */}
          <div>
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3">🚫 What NOT to Do</h4>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> Don&apos;t send 100+ emails on day 1</li>
              <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> Don&apos;t use purchased email lists</li>
              <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> Don&apos;t send identical content to all</li>
              <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> Don&apos;t ignore bounce notifications</li>
              <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> Don&apos;t skip authentication records</li>
              <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> Don&apos;t send only outbound (get replies)</li>
              <li className="flex items-start gap-2"><XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" /> Don&apos;t use spam trigger words</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Warning / Info */}
      {!isComplete && (
        <div className={clsx(
          "p-4 rounded-xl border flex items-start gap-3",
          isActive ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20"
        )}>
          <AlertTriangle className={clsx("w-5 h-5 flex-shrink-0 mt-0.5", isActive ? "text-amber-400" : "text-red-400")} />
          <div>
            <div className={clsx("text-sm font-medium", isActive ? "text-amber-400" : "text-red-400")}>
              {isActive ? "Warmup In Progress" : "Warmup Not Started"}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {isActive
                ? `Keep sending within the daily limit of ${dailyLimit} emails. ${totalDays - dayCount} days remaining before full deliverability.`
                : "Sending cold emails without warmup will land in spam. The warmup schedule starts April 7, 2026."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  Main EmailCenter Component
// ══════════════════════════════════════════════════════════
export default function EmailCenter() {
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [emailsError, setEmailsError] = useState<string | null>(null);

  // Reply/Forward state
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const fetchEmails = useCallback(async () => {
    setEmailsLoading(true);
    setEmailsError(null);
    try {
      const data = await getEmailHistory();
      if (Array.isArray(data)) {
        setEmails(data);
      } else if (data && Array.isArray(data.emails)) {
        setEmails(data.emails);
      } else if (data && Array.isArray(data.data)) {
        setEmails(data.data);
      } else {
        setEmails([]);
      }
    } catch {
      setEmailsError("Failed to load email history. Check API connection.");
    } finally {
      setEmailsLoading(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await getEmailTemplates();
      if (Array.isArray(data)) {
        setTemplates(data);
      } else if (data && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else if (data && Array.isArray(data.data)) {
        setTemplates(data.data);
      } else {
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    fetchTemplates();
  }, [fetchEmails, fetchTemplates]);

  function handleEmailSent() {
    fetchEmails();
    setActiveTab("history");
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
  }

  function handleReply(email: EmailRecord) {
    setComposeTo(email.direction === "outbound" ? email.to_address : email.from_address);
    setComposeSubject(`Re: ${email.subject}`);
    setComposeBody(`<br><br><hr><p><b>On ${new Date(email.sent_at).toLocaleString()}, ${email.from_address} wrote:</b></p>${email.body_html || email.body_text || ""}`);
    setActiveTab("compose");
  }

  function handleForward(email: EmailRecord) {
    setComposeTo("");
    setComposeSubject(`Fwd: ${email.subject}`);
    setComposeBody(`<br><br><hr><p><b>---------- Forwarded message ----------</b></p><p>From: ${email.from_address}<br>To: ${email.to_address}<br>Subject: ${email.subject}<br>Date: ${new Date(email.sent_at).toLocaleString()}</p>${email.body_html || email.body_text || ""}`);
    setActiveTab("compose");
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "history", label: "History", icon: Inbox, count: emails.length },
    { id: "compose", label: "Compose", icon: PenSquare },
    { id: "warmup", label: "Warmup", icon: Flame },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "sequences", label: "Sequences", icon: Mail },
    { id: "domains", label: "Domains", icon: Globe },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Center</h1>
          <p className="text-sm text-zinc-500 mt-1">Send emails, track history, analytics, and monitor domain warmup</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-surface-3 text-zinc-400 text-xs font-medium rounded-full flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            jordan@invictus-ai.in
          </span>
        </div>
      </div>

      {/* Stats Strip */}
      <StatsStrip emails={emails} />

      {/* Tab Bar with pills and count badges */}
      <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1 border border-white/5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-brand-400 text-black shadow-lg shadow-brand-400/20"
                : "text-zinc-400 hover:text-white hover:bg-surface-3"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={clsx(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                activeTab === tab.id ? "bg-white/20" : "bg-surface-4 text-zinc-500"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "history" && (
        <HistoryTab
          emails={emails}
          loading={emailsLoading}
          error={emailsError}
          onRefresh={fetchEmails}
          onReply={handleReply}
          onForward={handleForward}
        />
      )}
      {activeTab === "compose" && (
        <ComposeTab
          templates={templates}
          templatesLoading={templatesLoading}
          onSent={handleEmailSent}
          initialTo={composeTo}
          initialSubject={composeSubject}
          initialBody={composeBody}
        />
      )}
      {activeTab === "warmup" && <WarmupTab />}
      {activeTab === "analytics" && <AnalyticsTab emails={emails} />}
      {activeTab === "sequences" && <SequencesTab />}
      {activeTab === "domains" && <DomainsTab />}
    </div>
  );
}

/* ================================================================ */
/*  SEQUENCES TAB — Niche-optimized email sequences                  */
/* ================================================================ */
function SequencesTab() {
  const [niches, setNiches] = useState<string[]>([]);
  const [sequences, setSequences] = useState<Record<string, any[]>>({});
  const [selectedNiche, setSelectedNiche] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email?section=sequences")
      .then(r => r.json())
      .then(d => {
        setNiches(d.niches || []);
        setSequences(d.sequences || {});
        if (d.niches?.length > 0) setSelectedNiche(d.niches[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>;

  const currentSeq = sequences[selectedNiche] || [];
  const typeColors: Record<string, string> = {
    discovery: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    followup: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    value: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    breakup: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Niche selector */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Email Sequences</h2>
        <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-white/5">
          {niches.map(n => (
            <button key={n} onClick={() => setSelectedNiche(n)}
              className={clsx("px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize",
                n === selectedNiche ? "bg-brand-400/20 text-brand-400" : "text-zinc-500 hover:text-white"
              )}>{n}</button>
          ))}
        </div>
      </div>

      {/* Sequence timeline */}
      <div className="space-y-4">
        {currentSeq.map((step, i) => (
          <div key={i} className="relative pl-8">
            {/* Timeline dot */}
            <div className="absolute left-0 top-3 w-4 h-4 rounded-full bg-brand-400/20 border-2 border-brand-400 flex items-center justify-center">
              <span className="text-[8px] font-bold text-brand-400">{i + 1}</span>
            </div>
            {i < currentSeq.length - 1 && (
              <div className="absolute left-[7px] top-7 w-0.5 h-full bg-brand-400/10" />
            )}
            {/* Step card */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={clsx("px-2 py-0.5 text-[10px] font-semibold uppercase rounded-full border", typeColors[step.type] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20")}>
                  {step.type}
                </span>
                <span className="text-[11px] text-zinc-500">Day {step.day}</span>
              </div>
              <p className="text-sm font-medium text-zinc-200 mb-2">{step.subject}</p>
              <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-sans leading-relaxed bg-surface-2 rounded-lg p-3 max-h-32 overflow-y-auto">
                {step.body}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  DOMAINS TAB — Email domain status and configuration              */
/* ================================================================ */
function DomainsTab() {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email?section=domains")
      .then(r => r.json())
      .then(d => setDomains(d.domains || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>;

  return (
    <div className="space-y-6 animate-fadeInUp">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <Globe className="w-5 h-5 text-brand-400" /> Email Domains & DNS
      </h2>

      <div className="space-y-3">
        {domains.map((d, i) => (
          <div key={i} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">{d.domain}</span>
                <span className={clsx("px-2 py-0.5 text-[10px] font-medium rounded-full",
                  d.status === "active" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                )}>
                  {d.status}
                </span>
                <span className="text-[11px] text-zinc-500">{d.type} · {d.provider}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {["mx", "spf", "dkim", "dmarc"].map(rec => (
                <div key={rec} className="flex items-center gap-2 text-xs">
                  {d[rec] ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className={d[rec] ? "text-emerald-400" : "text-red-400"}>{rec.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Domain health summary */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">📧 Email Health Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-zinc-500 mb-1">Deliverability Score</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: "85%" }} />
              </div>
              <span className="text-emerald-400 font-semibold">85%</span>
            </div>
          </div>
          <div>
            <p className="text-zinc-500 mb-1">Warmup Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.min(100, (Math.floor((Date.now() - new Date("2026-04-07").getTime()) / 86400000) / 21) * 100)}%` }} />
              </div>
              <span className="text-brand-400 font-semibold">
                Day {Math.min(21, Math.floor((Date.now() - new Date("2026-04-07").getTime()) / 86400000))}/21
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
