"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, Filter, Phone, Mail, MapPin, Building2, User,
  ChevronDown, ChevronUp, X, Flame, Thermometer, Snowflake, Star,
  Clock, RefreshCw, Loader2, AlertCircle, StickyNote,
  CalendarDays, Hash, ToggleLeft, ToggleRight,
  LayoutGrid, Table as TableIcon, GripVertical,
  BarChart3, Download, Trash2, CheckSquare, Square,
  ExternalLink, PhoneCall, Send, Plus, Tag, Activity,
  FileText, Eye, EyeOff, ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";
import {
  getProspects, updateProspect, getDashboard,
  getActivities, getNotes, getEmailHistory, logActivity,
} from "@/lib/api";
import Chart from "@/components/charts/Chart";
import {
  DndContext, DragOverlay, closestCorners, PointerSensor,
  useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import toast, { Toaster } from "react-hot-toast";
import type { EChartsOption } from "echarts";

// ─── Types ───────────────────────────────────────────────────────────
type Stage = "NEW" | "CONTACTED" | "MEETING" | "PROPOSAL" | "WON" | "LOST";
type Temperature = "HOT" | "WARM" | "COLD";
type ViewMode = "kanban" | "table";
type ModalTab = "details" | "activity" | "notes" | "emails";

interface Prospect {
  id: string;
  business_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  city?: string;
  address?: string;
  niche?: string;
  stage: Stage;
  temperature?: Temperature;
  notes?: string;
  assigned_to?: string;
  icp_score?: number;
  created_at?: string;
  last_contact?: string;
  source?: string;
  demo_url?: string;
  tags?: string[];
}

interface DashboardData {
  byStage?: Record<string, number>;
  topNiches?: Array<{ niche: string; count: number }>;
  topCities?: Array<{ city: string; count: number }>;
  total?: number;
  conversionRate?: number;
  byTemperature?: Record<string, number>;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  created_at: string;
  created_by?: string;
}

interface NoteItem {
  id: string;
  content: string;
  created_at: string;
  created_by?: string;
}

interface EmailItem {
  id: string;
  subject: string;
  to: string;
  status?: string;
  sent_at?: string;
  created_at?: string;
}

// ─── Stage Config ────────────────────────────────────────────────────
const STAGES: Stage[] = ["NEW", "CONTACTED", "MEETING", "PROPOSAL", "WON", "LOST"];
const TEMPERATURES: Temperature[] = ["HOT", "WARM", "COLD"];

const stageConfig: Record<Stage, { label: string; color: string; bgColor: string; borderColor: string; headerBg: string; glowBorder: string; chartColor: string }> = {
  NEW:       { label: "New",       color: "text-zinc-300",    bgColor: "bg-zinc-600",    borderColor: "border-zinc-600",   headerBg: "bg-zinc-800/60",      glowBorder: "border-zinc-400/50 shadow-[0_0_15px_rgba(161,161,170,0.15)]", chartColor: "#3B82F6" },
  CONTACTED: { label: "Contacted", color: "text-brand-300",    bgColor: "bg-brand-600",    borderColor: "border-brand-600",   headerBg: "bg-brand-900/30",      glowBorder: "border-brand-400/50",   chartColor: "#00b4d8" },
  MEETING:   { label: "Meeting",   color: "text-zinc-300",  bgColor: "bg-zinc-600",  borderColor: "border-zinc-600", headerBg: "bg-zinc-800/30",    glowBorder: "border-zinc-400/50", chartColor: "#f59e0b" },
  PROPOSAL:  { label: "Proposal",  color: "text-amber-300",   bgColor: "bg-amber-600",   borderColor: "border-amber-600",  headerBg: "bg-amber-900/30",     glowBorder: "border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.2)]",  chartColor: "#f97316" },
  WON:       { label: "Won",       color: "text-emerald-300", bgColor: "bg-emerald-600",  borderColor: "border-emerald-600",headerBg: "bg-emerald-900/30",   glowBorder: "border-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.2)]", chartColor: "#10b981" },
  LOST:      { label: "Lost",      color: "text-red-300",     bgColor: "bg-red-600",     borderColor: "border-red-600",    headerBg: "bg-red-900/30",       glowBorder: "border-red-400/50 shadow-[0_0_15px_rgba(248,113,113,0.2)]",   chartColor: "#ef4444" },
};

const tempColors: Record<Temperature, string> = { HOT: "#ef4444", WARM: "#f59e0b", COLD: "#60a5fa" };

const NICHES = ["All", "Dental", "CA", "Salon", "Gym", "Restaurant", "Clinic", "Education", "Real Estate"];

// ─── Temperature Badge ───────────────────────────────────────────────
function TempBadge({ temp }: { temp?: Temperature }) {
  if (!temp) return null;
  const cfg = {
    HOT:  { icon: Flame,       cls: "bg-red-500/20 text-red-400 border-red-500/30" },
    WARM: { icon: Thermometer, cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    COLD: { icon: Snowflake,   cls: "bg-brand-400/20 text-brand-400 border-brand-400/30" },
  }[temp];
  const Icon = cfg.icon;
  return (
    <span className={clsx("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border", cfg.cls)}>
      <Icon className="w-3 h-3" /> {temp}
    </span>
  );
}

// ─── ICP Stars ───────────────────────────────────────────────────────
function ICPStars({ score }: { score?: number }) {
  if (score == null) return <span className="text-xs text-zinc-600">—</span>;
  const s = Math.min(5, Math.max(0, Math.round(score)));
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={clsx("w-3.5 h-3.5", i < s ? "text-amber-400 fill-amber-400" : "text-zinc-700")} />
      ))}
    </div>
  );
}

// ─── Skeleton Card ───────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-surface-3 rounded-lg p-4 border border-white/5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded bg-zinc-700" />
        <div className="h-4 w-32 bg-zinc-700 rounded" />
      </div>
      <div className="h-3 w-20 bg-zinc-700/60 rounded mb-3" />
      <div className="h-3 w-28 bg-zinc-700/60 rounded mb-2" />
      <div className="flex justify-between mt-3">
        <div className="h-4 w-14 bg-zinc-700 rounded-full" />
        <div className="h-3 w-16 bg-zinc-700/60 rounded" />
      </div>
    </div>
  );
}

// ─── Dental Dashboard Card ───────────────────────────────────────────
function DentalDashboardCard({
  prospects,
  dentalOnly,
  onToggleDental,
}: {
  prospects: Prospect[];
  dentalOnly: boolean;
  onToggleDental: () => void;
}) {
  const dentalProspects = prospects.filter(
    (p) => p.niche?.toLowerCase() === "dental"
  );
  const total = dentalProspects.length;
  const byStage = STAGES.reduce<Record<Stage, number>>((acc, s) => {
    acc[s] = dentalProspects.filter((p) => p.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  return (
    <button
      onClick={onToggleDental}
      className={clsx(
        "w-full text-left rounded-xl border-2 p-4 transition-all duration-300 group",
        dentalOnly
          ? "border-brand-400/50 bg-brand-400/5 shadow-[0_0_20px_rgba(0,188,212,0.1)]"
          : "border-brand-400/20 bg-surface-2 hover:border-brand-400/40 hover:bg-brand-400/[0.03]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦷</span>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Dental Pipeline
              {dentalOnly && (
                <span className="text-[10px] bg-brand-400/20 text-brand-400 px-2 py-0.5 rounded-full font-semibold">
                  ACTIVE
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              <span className="text-brand-400 font-semibold">{total}</span> Dental Prospects
              {!dentalOnly && " — Click to filter"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {STAGES.filter((s) => s !== "LOST").map((s) => (
            <div key={s} className="text-center">
              <div className={clsx("text-sm font-bold", stageConfig[s].color)}>
                {byStage[s]}
              </div>
              <div className="text-[9px] text-zinc-600 uppercase tracking-wide">
                {stageConfig[s].label}
              </div>
            </div>
          ))}
          {STAGES.filter((s) => s !== "LOST").length > 0 && (
            <ArrowRight className="w-3.5 h-3.5 text-zinc-600 mx-1" />
          )}
          <div className="text-center">
            <div className="text-sm font-bold text-red-300">{byStage.LOST}</div>
            <div className="text-[9px] text-zinc-600 uppercase tracking-wide">Lost</div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── CRM Analytics Section ───────────────────────────────────────────
function CRMAnalytics({
  prospects,
  dashboardData,
  loading,
}: {
  prospects: Prospect[];
  dashboardData: DashboardData | null;
  loading: boolean;
}) {
  // Compute stage distribution
  const stageData = useMemo(() => {
    const counts: Record<Stage, number> = {} as Record<Stage, number>;
    STAGES.forEach((s) => { counts[s] = 0; });
    prospects.forEach((p) => {
      const s = (p.stage || "NEW").toUpperCase() as Stage;
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [prospects]);

  const totalProspects = prospects.length;

  // Compute temperature breakdown
  const tempData = useMemo(() => {
    const counts: Record<string, number> = { HOT: 0, WARM: 0, COLD: 0 };
    prospects.forEach((p) => {
      const t = (p.temperature || "").toUpperCase();
      if (counts[t] !== undefined) counts[t]++;
    });
    return counts;
  }, [prospects]);

  // Compute top niches
  const nicheData = useMemo(() => {
    const counts: Record<string, number> = {};
    prospects.forEach((p) => {
      const n = p.niche || "Unknown";
      counts[n] = (counts[n] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [prospects]);

  // Stage Distribution Doughnut
  const stagePieOption: EChartsOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
    graphic: [{
      type: "text",
      left: "center",
      top: "center",
      style: {
        text: String(totalProspects),
        fontSize: 28,
        fontWeight: "bold",
        fill: "#ffffff",
      },
    }],
    series: [{
      type: "pie",
      radius: ["55%", "80%"],
      center: ["50%", "50%"],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: "transparent", borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 12, fontWeight: "bold", color: "#fff" },
        itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" },
      },
      data: STAGES.map((s) => ({
        value: stageData[s],
        name: stageConfig[s].label,
        itemStyle: { color: stageConfig[s].chartColor },
      })),
      animationType: "scale" as const,
      animationEasing: "elasticOut" as const,
    }],
  };

  // Temperature Horizontal Bar
  const tempTotal = tempData.HOT + tempData.WARM + tempData.COLD;
  const tempBarOption: EChartsOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 60, right: 60, top: 10, bottom: 10, containLabel: false },
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      data: ["COLD", "WARM", "HOT"],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#a1a1aa", fontSize: 11, fontWeight: "bold" as const },
    },
    series: [{
      type: "bar",
      barWidth: 24,
      itemStyle: { borderRadius: [0, 6, 6, 0] },
      label: {
        show: true,
        position: "right",
        color: "#a1a1aa",
        fontSize: 11,
        formatter: (p: unknown) => {
          const val = typeof (p as Record<string, unknown>).value === "number" ? (p as Record<string, unknown>).value as number : 0;
          const pct = tempTotal > 0 ? ((val / tempTotal) * 100).toFixed(0) : "0";
          return `${val} (${pct}%)`;
        },
      },
      data: [
        { value: tempData.COLD, itemStyle: { color: tempColors.COLD } },
        { value: tempData.WARM, itemStyle: { color: tempColors.WARM } },
        { value: tempData.HOT, itemStyle: { color: tempColors.HOT } },
      ],
    }],
  };

  // Top Niches Vertical Bar
  const nicheBarOption: EChartsOption = {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 10, right: 10, top: 10, bottom: 50, containLabel: true },
    xAxis: {
      type: "category",
      data: nicheData.map(([n]) => n.charAt(0).toUpperCase() + n.slice(1)),
      axisLabel: { color: "#a1a1aa", fontSize: 9, rotate: 35, interval: 0 },
      axisLine: { lineStyle: { color: "#262630" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#71717a", fontSize: 10 },
      splitLine: { lineStyle: { color: "#262630" } },
      axisLine: { show: false },
    },
    series: [{
      type: "bar",
      barWidth: 28,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: nicheData.map(([n, c]) => ({
        value: c,
        itemStyle: {
          color: n.toLowerCase() === "dental" ? "#22d3ee" : "#3B82F6",
        },
      })),
    }],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Stage Distribution Pie */}
      <div className="bg-surface-2 rounded-xl border border-white/5 p-4">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">
          Stage Distribution
        </h4>
        <Chart option={stagePieOption} height="220px" loading={loading} />
      </div>

      {/* Temperature Breakdown */}
      <div className="bg-surface-2 rounded-xl border border-white/5 p-4">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">
          Temperature Breakdown
        </h4>
        <Chart option={tempBarOption} height="220px" loading={loading} />
      </div>

      {/* Top Niches */}
      <div className="bg-surface-2 rounded-xl border border-white/5 p-4">
        <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">
          Top Niches
        </h4>
        <Chart option={nicheBarOption} height="220px" loading={loading} />
      </div>
    </div>
  );
}

// ─── Prospect Detail Slide-in Modal ──────────────────────────────────
function ProspectDetailModal({
  prospect,
  onClose,
  onStageChange,
  onTempChange,
  changingStage,
}: {
  prospect: Prospect;
  onClose: () => void;
  onStageChange: (id: string, stage: Stage) => void;
  onTempChange: (id: string, temp: Temperature) => void;
  changingStage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ModalTab>("details");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [loggingCall, setLoggingCall] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    // Trigger slide-in animation
    requestAnimationFrame(() => setSlideIn(true));
  }, []);

  const handleClose = () => {
    setSlideIn(false);
    setTimeout(onClose, 300);
  };

  // Load tab data
  useEffect(() => {
    async function loadTabData() {
      setLoadingTab(true);
      try {
        if (activeTab === "activity") {
          const data = await getActivities(prospect.id);
          setActivities(Array.isArray(data) ? data : data?.data || []);
        } else if (activeTab === "notes") {
          const data = await getNotes(prospect.id);
          setNotes(Array.isArray(data) ? data : data?.data || []);
        } else if (activeTab === "emails") {
          const data = await getEmailHistory(prospect.id);
          setEmails(Array.isArray(data) ? data : data?.data || []);
        }
      } catch {
        // Silently handle — data might not exist yet
      } finally {
        setLoadingTab(false);
      }
    }
    if (activeTab !== "details") loadTabData();
  }, [activeTab, prospect.id]);

  const created = prospect.created_at
    ? new Date(prospect.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await logActivity({
        prospect_id: prospect.id,
        type: "note",
        description: newNote.trim(),
      });
      setNotes((prev) => [
        { id: Date.now().toString(), content: newNote.trim(), created_at: new Date().toISOString() },
        ...prev,
      ]);
      setNewNote("");
      toast.success("Note added");
    } catch {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleLogCall = async () => {
    setLoggingCall(true);
    try {
      await logActivity({
        prospect_id: prospect.id,
        type: "call",
        description: `Phone call with ${prospect.business_name}`,
      });
      toast.success("Call logged");
      // Refresh activities if on that tab
      if (activeTab === "activity") {
        const data = await getActivities(prospect.id);
        setActivities(Array.isArray(data) ? data : data?.data || []);
      }
    } catch {
      toast.error("Failed to log call");
    } finally {
      setLoggingCall(false);
    }
  };

  const tabs: { key: ModalTab; label: string; icon: typeof Activity }[] = [
    { key: "details", label: "Details", icon: FileText },
    { key: "activity", label: "Activity", icon: Activity },
    { key: "notes", label: "Notes", icon: StickyNote },
    { key: "emails", label: "Emails", icon: Mail },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={handleClose}>
      {/* Backdrop */}
      <div className={clsx(
        "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
        slideIn ? "opacity-100" : "opacity-0"
      )} />

      {/* Slide-in Panel */}
      <div
        className={clsx(
          "relative w-full max-w-2xl bg-surface-2 border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out overflow-hidden flex flex-col",
          slideIn ? "translate-x-0" : "translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/5 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 truncate">
              <Building2 className="w-5 h-5 text-brand-400 flex-shrink-0" />
              {prospect.business_name}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {prospect.niche && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-zinc-600/20 text-zinc-300 border-zinc-600/30">
                  <Hash className="w-3 h-3" /> {prospect.niche}
                </span>
              )}
              <TempBadge temp={prospect.temperature} />
              <span className={clsx(
                "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-semibold border",
                stageConfig[prospect.stage]?.bgColor?.replace("bg-", "bg-") + "/20",
                stageConfig[prospect.stage]?.color,
                stageConfig[prospect.stage]?.borderColor?.replace("border-", "border-") + "/30",
              )}>
                {stageConfig[prospect.stage]?.label}
              </span>
            </div>
          </div>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors p-1 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5 bg-surface-3/30 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <select
              value={prospect.stage}
              disabled={changingStage}
              onChange={(e) => onStageChange(prospect.id, e.target.value as Stage)}
              className="bg-surface-3 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-200 appearance-none cursor-pointer hover:border-white/20 transition-colors disabled:opacity-50"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{stageConfig[s].label}</option>
              ))}
            </select>
            <select
              value={prospect.temperature || ""}
              onChange={(e) => onTempChange(prospect.id, e.target.value as Temperature)}
              className="bg-surface-3 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-200 appearance-none cursor-pointer hover:border-white/20 transition-colors"
            >
              <option value="">No Temp</option>
              {TEMPERATURES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {prospect.email && (
              <a
                href={`mailto:${prospect.email}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-400/10 text-brand-400 text-xs font-medium hover:bg-brand-400/20 transition-colors border border-brand-400/20"
              >
                <Send className="w-3 h-3" /> Email
              </a>
            )}
            <button
              onClick={handleLogCall}
              disabled={loggingCall}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 disabled:opacity-50"
            >
              <PhoneCall className="w-3 h-3" /> {loggingCall ? "..." : "Log Call"}
            </button>
            {prospect.demo_url && (
              <a
                href={prospect.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium hover:bg-brand-300/20 transition-colors border border-brand-500/20"
              >
                <ExternalLink className="w-3 h-3" /> View Demo
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 flex-shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2",
                  activeTab === tab.key
                    ? "text-brand-300 border-brand-500"
                    : "text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-700"
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "details" && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                {prospect.phone && (
                  <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 text-sm text-zinc-300 bg-surface-3 rounded-lg px-3 py-2.5 hover:bg-surface-4 transition-colors">
                    <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{prospect.phone}</span>
                  </a>
                )}
                {prospect.email && (
                  <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 text-sm text-zinc-300 bg-surface-3 rounded-lg px-3 py-2.5 hover:bg-surface-4 transition-colors">
                    <Mail className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    <span className="truncate">{prospect.email}</span>
                  </a>
                )}
                {prospect.city && (
                  <div className="flex items-center gap-2 text-sm text-zinc-300 bg-surface-3 rounded-lg px-3 py-2.5">
                    <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="truncate">{prospect.city}</span>
                  </div>
                )}
                {prospect.address && (
                  <div className="flex items-center gap-2 text-sm text-zinc-300 bg-surface-3 rounded-lg px-3 py-2.5">
                    <Building2 className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    <span className="truncate">{prospect.address}</span>
                  </div>
                )}
              </div>

              {/* ICP Score */}
              <div className="flex items-center gap-3 bg-surface-3 rounded-lg px-3 py-2.5">
                <label className="text-xs text-zinc-500 uppercase tracking-wide font-medium">ICP Score</label>
                <ICPStars score={prospect.icp_score} />
                {prospect.icp_score != null && (
                  <span className="text-xs text-zinc-400 ml-1">({prospect.icp_score}/5)</span>
                )}
              </div>

              {/* Tags */}
              {prospect.tags && prospect.tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-zinc-500" />
                  {prospect.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-700/50 text-zinc-300 border border-zinc-600/30">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-6 text-xs text-zinc-500">
                {prospect.contact_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> {prospect.contact_name}
                  </span>
                )}
                {prospect.assigned_to && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Assigned: {prospect.assigned_to}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Created: {created}
                </span>
                {prospect.source && (
                  <span className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" /> {prospect.source}
                  </span>
                )}
              </div>

              {/* Notes */}
              {prospect.notes && (
                <div className="bg-surface-3 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1.5 font-medium">
                    <StickyNote className="w-3.5 h-3.5" /> Notes
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{prospect.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-3">
              {loadingTab ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                </div>
              ) : activities.length > 0 ? (
                <div className="relative pl-6 border-l border-white/5">
                  {activities.map((a) => (
                    <div key={a.id} className="relative mb-4 last:mb-0">
                      <div className="absolute -left-[25px] top-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-surface-2" />
                      <div className="bg-surface-3 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-400">
                            {a.type}
                          </span>
                          <span className="text-[10px] text-zinc-600">
                            {new Date(a.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-600 text-center py-8">No activities yet</p>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-3">
              {/* Add Note Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note…"
                  className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-brand-500/40 transition-colors"
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="px-3 py-2 bg-brand-400 hover:bg-brand-300 text-black font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>

              {loadingTab ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                </div>
              ) : notes.length > 0 ? (
                notes.map((n) => (
                  <div key={n.id} className="bg-surface-3 rounded-lg p-3 border border-white/5">
                    <p className="text-sm text-zinc-300">{n.content}</p>
                    <p className="text-[10px] text-zinc-600 mt-1.5">
                      {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {n.created_by && ` • ${n.created_by}`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600 text-center py-8">No notes yet</p>
              )}
            </div>
          )}

          {activeTab === "emails" && (
            <div className="space-y-3">
              {loadingTab ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                </div>
              ) : emails.length > 0 ? (
                emails.map((e) => (
                  <div key={e.id} className="bg-surface-3 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-200">{e.subject}</span>
                      {e.status && (
                        <span className={clsx(
                          "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                          e.status === "sent" ? "bg-emerald-500/20 text-emerald-400" :
                          e.status === "failed" ? "bg-red-500/20 text-red-400" :
                          "bg-zinc-700/50 text-zinc-400"
                        )}>
                          {e.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      To: {e.to} •{" "}
                      {(e.sent_at || e.created_at) &&
                        new Date(e.sent_at || e.created_at || "").toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600 text-center py-8">No emails sent yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable Prospect Card (Draggable) ──────────────────────────────
function SortableProspectCard({
  prospect,
  onClick,
}: {
  prospect: Prospect;
  onClick: () => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: prospect.id, data: { prospect } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="touch-none">
      <div
        className={clsx(
          "bg-surface-3 rounded-lg p-3.5 cursor-pointer group border border-white/5 hover:border-brand-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.08)] transition-all duration-200",
          isDragging && "ring-2 ring-brand-500/40"
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>
            <Building2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <span
              className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors truncate"
              onClick={onClick}
            >
              {prospect.business_name}
            </span>
          </div>
          <TempBadge temp={prospect.temperature} />
        </div>

        <div onClick={onClick}>
          {prospect.niche && (
            <div className="text-[11px] text-zinc-500 mb-2 ml-10">{prospect.niche}</div>
          )}
          {prospect.city && (
            <div className="flex items-center gap-1 text-xs text-zinc-500 mb-1.5 ml-10">
              <MapPin className="w-3 h-3" /> {prospect.city}
            </div>
          )}
          {prospect.phone && (
            <div className="flex items-center gap-1 text-xs text-zinc-500 ml-10">
              <Phone className="w-3 h-3" /> {prospect.phone}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drag Overlay Card ───────────────────────────────────────────────
function DragOverlayCard({ prospect }: { prospect: Prospect }) {
  return (
    <div className="bg-surface-3 rounded-lg p-3.5 border-2 border-brand-500/50 shadow-2xl shadow-brand-500/20 w-[260px] rotate-2 opacity-90">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <Building2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
          <span className="text-sm font-medium text-white truncate">{prospect.business_name}</span>
        </div>
        <TempBadge temp={prospect.temperature} />
      </div>
      {prospect.niche && <div className="text-[11px] text-zinc-400 ml-10">{prospect.niche}</div>}
      {prospect.city && (
        <div className="flex items-center gap-1 text-xs text-zinc-400 ml-10 mt-1">
          <MapPin className="w-3 h-3" /> {prospect.city}
        </div>
      )}
    </div>
  );
}

// ─── Droppable Kanban Column ─────────────────────────────────────────
function DroppableKanbanColumn({
  stage, prospects, loading, onCardClick, isOver,
}: {
  stage: Stage; prospects: Prospect[]; loading: boolean;
  onCardClick: (p: Prospect) => void; isOver: boolean;
}) {
  const config = stageConfig[stage];
  const stageProspects = prospects.filter((p) => (p.stage || "").toUpperCase() === stage);
  const { setNodeRef } = useDroppable({ id: `column-${stage}`, data: { stage } });
  const [displayLimit, setDisplayLimit] = useState(50);
  const prospectIds = stageProspects.slice(0, displayLimit).map((p) => p.id);

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex-shrink-0 w-[280px] rounded-xl transition-all duration-200 p-1",
        isOver && config.glowBorder,
        isOver && "border-2 bg-white/[0.02]",
        !isOver && "border-2 border-transparent"
      )}
    >
      <div className={clsx("flex items-center gap-2 mb-3 px-3 py-2 rounded-lg border-l-2", config.headerBg, config.borderColor)}>
        <span className={clsx("text-sm font-semibold", config.color)}>{config.label}</span>
        <span className="text-[11px] text-zinc-500 ml-auto bg-surface-4 px-2 py-0.5 rounded-full font-mono">
          {loading ? "…" : stageProspects.length}
        </span>
      </div>

      <SortableContext items={prospectIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2.5 min-h-[200px] max-h-[calc(100vh-260px)] overflow-y-auto pr-1 scrollbar-thin">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : stageProspects.length > 0 ? (
            <>
              {stageProspects.slice(0, displayLimit).map((prospect) => (
                <SortableProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  onClick={() => onCardClick(prospect)}
                />
              ))}
              {stageProspects.length > displayLimit && (
                <button
                  onClick={() => setDisplayLimit(prev => prev + 50)}
                  className="w-full py-2 text-xs text-zinc-500 hover:text-brand-400 bg-surface-3/50 rounded-lg border border-white/5 hover:border-brand-400/30 transition-colors"
                >
                  Show more ({stageProspects.length - displayLimit} remaining)
                </button>
              )}
            </>
          ) : (
            <div className={clsx(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isOver ? "border-brand-500/40 bg-brand-500/5" : "border-white/5"
            )}>
              <span className={clsx("text-xs", isOver ? "text-brand-400" : "text-zinc-600")}>
                {isOver ? "Drop here" : "No prospects"}
              </span>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ─── Bulk Actions Bar ────────────────────────────────────────────────
function BulkActionsBar({
  selectedCount,
  onChangeStage,
  onChangeTemp,
  onExport,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  onChangeStage: (stage: Stage) => void;
  onChangeTemp: (temp: Temperature) => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-30 bg-surface-3/95 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg animate-in slide-in-from-top-2 duration-300">
      <span className="text-sm font-semibold text-brand-300">
        {selectedCount} selected
      </span>
      <div className="w-px h-5 bg-white/10" />

      <select
        defaultValue=""
        onChange={(e) => { if (e.target.value) onChangeStage(e.target.value as Stage); e.target.value = ""; }}
        className="bg-surface-4 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-300 appearance-none cursor-pointer hover:border-white/20"
      >
        <option value="" disabled>Change Stage</option>
        {STAGES.map((s) => <option key={s} value={s}>{stageConfig[s].label}</option>)}
      </select>

      <select
        defaultValue=""
        onChange={(e) => { if (e.target.value) onChangeTemp(e.target.value as Temperature); e.target.value = ""; }}
        className="bg-surface-4 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-300 appearance-none cursor-pointer hover:border-white/20"
      >
        <option value="" disabled>Change Temp</option>
        {TEMPERATURES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
      >
        <Download className="w-3 h-3" /> Export
      </button>

      {!confirmDelete ? (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={() => { onDelete(); setConfirmDelete(false); }}
            className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-500 transition-colors"
          >
            Confirm Delete
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
      )}

      <button
        onClick={onClear}
        className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Clear selection
      </button>
    </div>
  );
}

// ─── Table View with Bulk Actions ────────────────────────────────────
function TableView({
  prospects, loading, onStageChange, onRowClick,
  selectedIds, onToggleSelect, onToggleAll,
}: {
  prospects: Prospect[]; loading: boolean;
  onStageChange: (id: string, stage: Stage) => void;
  onRowClick: (p: Prospect) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
}) {
  const allSelected = prospects.length > 0 && prospects.every((p) => selectedIds.has(p.id));
  const someSelected = prospects.some((p) => selectedIds.has(p.id)) && !allSelected;

  if (loading) {
    return (
      <div className="bg-surface-2 rounded-xl border border-white/5 p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500 mx-auto mb-2" />
        <p className="text-sm text-zinc-500">Loading prospects…</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-2 rounded-xl border border-white/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-surface-3/50">
              <th className="text-left px-3 py-3 w-10">
                <button onClick={onToggleAll} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-brand-400" />
                  ) : someSelected ? (
                    <CheckSquare className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold w-10">#</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Business Name</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Niche</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">City</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Phone</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Email</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Stage</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Temp</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">ICP</th>
              <th className="text-left px-4 py-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Created</th>
            </tr>
          </thead>
          <tbody>
            {prospects.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-zinc-600">No prospects found</td>
              </tr>
            ) : (
              prospects.map((p, idx) => (
                <tr
                  key={p.id}
                  className={clsx(
                    "border-b border-white/[0.03] hover:bg-surface-3/40 cursor-pointer transition-colors",
                    selectedIds.has(p.id) && "bg-brand-500/5"
                  )}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onToggleSelect(p.id)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                      {selectedIds.has(p.id) ? (
                        <CheckSquare className="w-4 h-4 text-brand-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 font-mono text-xs" onClick={() => onRowClick(p)}>{idx + 1}</td>
                  <td className="px-4 py-3 text-zinc-200 font-medium" onClick={() => onRowClick(p)}>{p.business_name}</td>
                  <td className="px-4 py-3 text-zinc-400" onClick={() => onRowClick(p)}>{p.niche || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400" onClick={() => onRowClick(p)}>{p.city || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs" onClick={() => onRowClick(p)}>{p.phone || "—"}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-[180px] truncate" onClick={() => onRowClick(p)}>{p.email || "—"}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={p.stage}
                      onChange={(e) => onStageChange(p.id, e.target.value as Stage)}
                      className={clsx(
                        "text-xs font-semibold px-2 py-1 rounded-md border appearance-none cursor-pointer bg-transparent",
                        stageConfig[p.stage]?.color || "text-zinc-400",
                        stageConfig[p.stage]?.borderColor || "border-zinc-600",
                      )}
                    >
                      {STAGES.map((s) => <option key={s} value={s}>{stageConfig[s].label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3" onClick={() => onRowClick(p)}><TempBadge temp={p.temperature} /></td>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs" onClick={() => onRowClick(p)}>
                    {p.icp_score != null ? p.icp_score : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs" onClick={() => onRowClick(p)}>
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Filter Chips ────────────────────────────────────────────────────
function FilterChips({
  cities,
  activeCityFilter,
  activeTempFilter,
  activeIcpMin,
  activeIcpMax,
  onCityFilter,
  onTempFilter,
  onIcpFilter,
  onClearFilters,
  activeFilterCount,
}: {
  cities: string[];
  activeCityFilter: string;
  activeTempFilter: string;
  activeIcpMin: number;
  activeIcpMax: number;
  onCityFilter: (city: string) => void;
  onTempFilter: (temp: string) => void;
  onIcpFilter: (min: number, max: number) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Temperature chips */}
        {TEMPERATURES.map((t) => (
          <button
            key={t}
            onClick={() => onTempFilter(activeTempFilter === t ? "" : t)}
            className={clsx(
              "text-[11px] px-2.5 py-1 rounded-full font-semibold border transition-colors",
              activeTempFilter === t
                ? t === "HOT" ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : t === "WARM" ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-brand-400/20 text-brand-400 border-brand-400/30"
                : "bg-surface-3 text-zinc-500 border-white/5 hover:text-zinc-300 hover:border-white/10"
            )}
          >
            {t === "HOT" ? "🔥" : t === "WARM" ? "🌡️" : "❄️"} {t}
          </button>
        ))}

        {/* Top cities */}
        {cities.slice(0, 4).map((c) => (
          <button
            key={c}
            onClick={() => onCityFilter(activeCityFilter === c ? "" : c)}
            className={clsx(
              "text-[11px] px-2.5 py-1 rounded-full font-semibold border transition-colors",
              activeCityFilter === c
                ? "bg-zinc-600/20 text-zinc-400 border-zinc-600/30"
                : "bg-surface-3 text-zinc-500 border-white/5 hover:text-zinc-300 hover:border-white/10"
            )}
          >
            📍 {c}
          </button>
        ))}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] px-2.5 py-1 rounded-full font-semibold border bg-surface-3 text-zinc-500 border-white/5 hover:text-zinc-300 hover:border-white/10 transition-colors flex items-center gap-1"
        >
          <Filter className="w-3 h-3" />
          Advanced
          {activeFilterCount > 0 && (
            <span className="bg-brand-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center ml-0.5">
              {activeFilterCount}
            </span>
          )}
          {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-[11px] px-2 py-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="bg-surface-2 rounded-xl border border-white/5 p-4 flex items-center gap-6">
          {/* City selector */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block mb-1">City</label>
            <select
              value={activeCityFilter}
              onChange={(e) => onCityFilter(e.target.value)}
              className="bg-surface-3 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-300 appearance-none cursor-pointer"
            >
              <option value="">All Cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* ICP range */}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block mb-1">ICP Score</label>
            <div className="flex items-center gap-2">
              <select
                value={activeIcpMin}
                onChange={(e) => onIcpFilter(Number(e.target.value), activeIcpMax)}
                className="bg-surface-3 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-300 appearance-none cursor-pointer"
              >
                {[0, 1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <span className="text-xs text-zinc-600">to</span>
              <select
                value={activeIcpMax}
                onChange={(e) => onIcpFilter(activeIcpMin, Number(e.target.value))}
                className="bg-surface-3 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-zinc-300 appearance-none cursor-pointer"
              >
                {[0, 1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CSV Export ───────────────────────────────────────────────────────
function exportCSV(prospects: Prospect[], filename: string) {
  const headers = ["Business Name", "Niche", "City", "Phone", "Email", "Stage", "Temperature", "ICP Score", "Created"];
  const rows = prospects.map((p) => [
    p.business_name,
    p.niche || "",
    p.city || "",
    p.phone || "",
    p.email || "",
    p.stage,
    p.temperature || "",
    p.icp_score != null ? String(p.icp_score) : "",
    p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main CRM Pipeline ──────────────────────────────────────────────
export default function CRMPipeline() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState("All");
  const [dentalOnly, setDentalOnly] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [changingStage, setChangingStage] = useState(false);
  const [nicheOpen, setNicheOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [activeProspect, setActiveProspect] = useState<Prospect | null>(null);
  const [overColumn, setOverColumn] = useState<Stage | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter states
  const [cityFilter, setCityFilter] = useState("");
  const [tempFilter, setTempFilter] = useState("");
  const [icpMin, setIcpMin] = useState(0);
  const [icpMax, setIcpMax] = useState(5);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nicheDropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Close niche dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (nicheDropdownRef.current && !nicheDropdownRef.current.contains(e.target as Node)) {
        setNicheOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    getDashboard().then(setDashboardData).catch(() => {});
  }, []);

  // Fetch prospects
  const fetchProspects = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: "2000" };
      const q = search ?? searchQuery;
      if (q.trim()) params.search = q.trim();
      if (dentalOnly) {
        params.niche = "dental";
      } else if (nicheFilter !== "All") {
        params.niche = nicheFilter.toLowerCase();
      }
      const data = await getProspects(params);
      const list: Prospect[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      setProspects(list);
    } catch (err) {
      console.error("Failed to fetch prospects:", err);
      setError("Failed to load prospects. Check your connection and try again.");
      setProspects([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, nicheFilter, dentalOnly]);

  useEffect(() => { fetchProspects(); }, [fetchProspects]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { fetchProspects(value); }, 400);
  };

  // Apply local filters
  const filteredProspects = useMemo(() => {
    let result = prospects;
    if (cityFilter) {
      result = result.filter((p) => p.city?.toLowerCase() === cityFilter.toLowerCase());
    }
    if (tempFilter) {
      result = result.filter((p) => p.temperature?.toUpperCase() === tempFilter);
    }
    if (icpMin > 0 || icpMax < 5) {
      result = result.filter((p) => {
        const score = p.icp_score ?? 0;
        return score >= icpMin && score <= icpMax;
      });
    }
    return result;
  }, [prospects, cityFilter, tempFilter, icpMin, icpMax]);

  // Unique cities for filter
  const uniqueCities = useMemo(() => {
    const cities: Record<string, number> = {};
    prospects.forEach((p) => {
      if (p.city) cities[p.city] = (cities[p.city] || 0) + 1;
    });
    return Object.entries(cities)
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);
  }, [prospects]);

  const activeFilterCount = (cityFilter ? 1 : 0) + (tempFilter ? 1 : 0) + ((icpMin > 0 || icpMax < 5) ? 1 : 0);

  // Stage change handler
  const handleStageChange = async (id: string, newStage: Stage) => {
    const oldProspect = prospects.find((p) => p.id === id);
    const oldStage = oldProspect?.stage;
    if (!oldStage || oldStage === newStage) return;
    const businessName = oldProspect?.business_name || "Prospect";

    // Optimistic update
    setChangingStage(true);
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, stage: newStage } : p)));
    if (selectedProspect?.id === id) {
      setSelectedProspect((prev) => prev ? { ...prev, stage: newStage } : null);
    }

    try {
      await updateProspect(id, { stage: newStage });

      // Undo toast (5 seconds)
      toast((t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm">
            <strong>{businessName}</strong> → {stageConfig[newStage].label}
          </span>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, stage: oldStage } : p)));
              if (selectedProspect?.id === id) {
                setSelectedProspect((prev) => prev ? { ...prev, stage: oldStage } : null);
              }
              try {
                await updateProspect(id, { stage: oldStage });
                toast.success("Reverted!", { duration: 2000 });
              } catch {
                toast.error("Undo failed — refresh to check");
                fetchProspects();
              }
            }}
            className="px-2 py-1 text-xs font-bold bg-brand-400/20 text-brand-400 rounded hover:bg-brand-400/30 transition-colors whitespace-nowrap"
          >
            Undo
          </button>
        </div>
      ), { duration: 5000, icon: "✅" });
    } catch {
      // Revert on failure
      setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, stage: oldStage } : p)));
      if (selectedProspect?.id === id) {
        setSelectedProspect((prev) => prev ? { ...prev, stage: oldStage } : null);
      }
      toast.error("Failed to update stage — reverted");
    } finally {
      setChangingStage(false);
    }
  };

  // Temperature change handler
  const handleTempChange = async (id: string, newTemp: Temperature) => {
    const oldProspect = prospects.find((p) => p.id === id);
    const oldTemp = oldProspect?.temperature;
    setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, temperature: newTemp } : p)));
    if (selectedProspect?.id === id) {
      setSelectedProspect((prev) => prev ? { ...prev, temperature: newTemp } : null);
    }
    try {
      await updateProspect(id, { temperature: newTemp });
      toast.success(`Temperature set to ${newTemp}`);
    } catch {
      if (oldTemp !== undefined) {
        setProspects((prev) => prev.map((p) => (p.id === id ? { ...p, temperature: oldTemp } : p)));
        if (selectedProspect?.id === id) {
          setSelectedProspect((prev) => prev ? { ...prev, temperature: oldTemp } : null);
        }
      }
      toast.error("Failed to update temperature — reverted");
    }
  };

  // Bulk actions
  const handleBulkStageChange = async (stage: Stage) => {
    const ids = Array.from(selectedIds);
    setProspects((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, stage } : p));
    try {
      await Promise.all(ids.map((id) => updateProspect(id, { stage })));
      toast.success(`${ids.length} prospects moved to ${stageConfig[stage].label}`);
    } catch {
      toast.error("Some updates failed");
      fetchProspects();
    }
    setSelectedIds(new Set());
  };

  const handleBulkTempChange = async (temp: Temperature) => {
    const ids = Array.from(selectedIds);
    setProspects((prev) => prev.map((p) => selectedIds.has(p.id) ? { ...p, temperature: temp } : p));
    try {
      await Promise.all(ids.map((id) => updateProspect(id, { temperature: temp })));
      toast.success(`${ids.length} prospects set to ${temp}`);
    } catch {
      toast.error("Some updates failed");
      fetchProspects();
    }
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    const selected = filteredProspects.filter((p) => selectedIds.has(p.id));
    exportCSV(selected, `prospects-selected-${Date.now()}.csv`);
    toast.success(`Exported ${selected.length} prospects`);
  };

  const handleBulkDelete = async () => {
    toast.success(`Delete ${selectedIds.size} prospects — not implemented (safety)`);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (filteredProspects.every((p) => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProspects.map((p) => p.id)));
    }
  };

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const prospect = prospects.find((p) => p.id === event.active.id);
    if (prospect) setActiveProspect(prospect);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColumn(null); return; }
    const overId = String(over.id);
    if (overId.startsWith("column-")) {
      setOverColumn(overId.replace("column-", "") as Stage);
    } else {
      const overProspect = prospects.find((p) => p.id === overId);
      if (overProspect) setOverColumn(overProspect.stage);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProspect(null);
    setOverColumn(null);
    if (!over) return;
    const overId = String(over.id);
    let targetStage: Stage | null = null;
    if (overId.startsWith("column-")) {
      targetStage = overId.replace("column-", "") as Stage;
    } else {
      const overProspect = prospects.find((p) => p.id === overId);
      if (overProspect) targetStage = overProspect.stage;
    }
    if (!targetStage) return;
    const activeProspectData = prospects.find((p) => p.id === active.id);
    if (activeProspectData && activeProspectData.stage !== targetStage) {
      handleStageChange(String(active.id), targetStage);
    }
  };

  const activeNiche = dentalOnly ? "Dental" : nicheFilter;

  return (
    <div className="p-6 space-y-5">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: { background: "#1e1e2e", color: "#e4e4e7", border: "1px solid rgba(255,255,255,0.1)" },
          success: { iconTheme: { primary: "#34d399", secondary: "#1e1e2e" } },
          error: { iconTheme: { primary: "#f87171", secondary: "#1e1e2e" } },
        }}
      />

      {/* Dental Dashboard Card */}
      <DentalDashboardCard
        prospects={prospects}
        dentalOnly={dentalOnly}
        onToggleDental={() => setDentalOnly(!dentalOnly)}
      />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">CRM Pipeline</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {dentalOnly ? "🦷 Dental Prospects" : "All Prospects"} — {loading ? "Loading…" : `${filteredProspects.length} total`}
            {activeFilterCount > 0 && (
              <span className="text-brand-400 ml-1">({activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active)</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-surface-2 border border-white/5 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("kanban")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                viewMode === "kanban" ? "bg-brand-400/20 text-brand-300" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <LayoutGrid className="w-4 h-4" /> Kanban
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors",
                viewMode === "table" ? "bg-brand-400/20 text-brand-300" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <TableIcon className="w-4 h-4" /> Table
            </button>
          </div>

          {/* Analytics Toggle */}
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors",
              showAnalytics
                ? "bg-brand-400/20 border-brand-500/30 text-brand-300"
                : "bg-surface-2 border-white/5 text-zinc-400 hover:bg-surface-3"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            {showAnalytics ? "Hide Analytics" : "Show Analytics"}
          </button>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-lg text-zinc-500 text-sm border border-white/5 focus-within:border-brand-500/40 transition-colors">
            <Search className="w-4 h-4 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search prospects…"
              className="bg-transparent outline-none text-zinc-300 placeholder-zinc-600 w-48"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => handleSearchChange("")} className="text-zinc-600 hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Niche Filter Dropdown */}
          <div className="relative" ref={nicheDropdownRef}>
            <button
              onClick={() => setNicheOpen(!nicheOpen)}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors",
                activeNiche !== "All"
                  ? "bg-brand-400/20 border-brand-500/30 text-brand-300"
                  : "bg-surface-2 border-white/5 text-zinc-400 hover:bg-surface-3"
              )}
            >
              <Filter className="w-4 h-4" />
              {activeNiche !== "All" ? activeNiche : "Niche"}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {nicheOpen && !dentalOnly && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface-3 border border-white/10 rounded-lg shadow-xl z-40 py-1 overflow-hidden">
                {NICHES.map((n) => (
                  <button
                    key={n}
                    onClick={() => { setNicheFilter(n); setNicheOpen(false); }}
                    className={clsx(
                      "w-full text-left px-3 py-2 text-sm transition-colors",
                      nicheFilter === n ? "bg-brand-400/20 text-brand-300" : "text-zinc-400 hover:bg-surface-4 hover:text-zinc-200"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dental Only Toggle */}
          <button
            onClick={() => setDentalOnly(!dentalOnly)}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
              dentalOnly
                ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300"
                : "bg-surface-2 border-white/5 text-zinc-400 hover:bg-surface-3"
            )}
          >
            {dentalOnly ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            🦷 Dental Only
          </button>

          {/* Export CSV */}
          <button
            onClick={() => {
              exportCSV(filteredProspects, `prospects-${Date.now()}.csv`);
              toast.success(`Exported ${filteredProspects.length} prospects`);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-2 rounded-lg text-zinc-400 text-sm hover:bg-surface-3 transition-colors border border-white/5"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchProspects()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-surface-2 rounded-lg text-zinc-400 text-sm hover:bg-surface-3 transition-colors border border-white/5 disabled:opacity-50"
          >
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <FilterChips
        cities={uniqueCities}
        activeCityFilter={cityFilter}
        activeTempFilter={tempFilter}
        activeIcpMin={icpMin}
        activeIcpMax={icpMax}
        onCityFilter={setCityFilter}
        onTempFilter={setTempFilter}
        onIcpFilter={(min, max) => { setIcpMin(min); setIcpMax(max); }}
        onClearFilters={() => { setCityFilter(""); setTempFilter(""); setIcpMin(0); setIcpMax(5); }}
        activeFilterCount={activeFilterCount}
      />

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
          <button
            onClick={() => fetchProspects()}
            className="ml-auto text-xs text-red-400 hover:text-red-300 font-medium underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Analytics Section */}
      {showAnalytics && (
        <CRMAnalytics
          prospects={filteredProspects}
          dashboardData={dashboardData}
          loading={loading}
        />
      )}

      {/* Bulk Actions Bar (table view only) */}
      {viewMode === "table" && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          onChangeStage={handleBulkStageChange}
          onChangeTemp={handleBulkTempChange}
          onExport={handleBulkExport}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* View: Kanban or Table */}
      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4 -mx-2 px-2">
            <div className="flex gap-4 min-w-max">
              {STAGES.map((stage) => (
                <DroppableKanbanColumn
                  key={stage}
                  stage={stage}
                  prospects={filteredProspects}
                  loading={loading}
                  onCardClick={setSelectedProspect}
                  isOver={overColumn === stage}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={null}>
            {activeProspect ? <DragOverlayCard prospect={activeProspect} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <TableView
          prospects={filteredProspects}
          loading={loading}
          onStageChange={handleStageChange}
          onRowClick={setSelectedProspect}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleAll={handleToggleAll}
        />
      )}

      {/* Prospect Detail Modal */}
      {selectedProspect && (
        <ProspectDetailModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onStageChange={handleStageChange}
          onTempChange={handleTempChange}
          changingStage={changingStage}
        />
      )}
    </div>
  );
}
