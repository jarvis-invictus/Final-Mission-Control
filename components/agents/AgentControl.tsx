"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, Clock, Loader2, Pause, Zap, Users, Gauge, Server, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";
import Chart from "../charts/Chart";
import type { EChartsOption } from "echarts";
import AgentWorkspace from "./AgentWorkspace";
import AgentProfiles from "./AgentProfiles";

/* ================================================================
   TYPES
   ================================================================ */
interface AgentHealth {
  id: string;
  name: string;
  role: string;
  title: string;
  ip: string;
  port: number;
  endpoint: string;
  status: "ALIVE" | "DOWN";
  responseMs: number;
  httpStatus: number | null;
  lastChecked: string;
  error?: string;
}

interface FleetResponse {
  agents: AgentHealth[];
  summary: { online: number; total: number };
  checkedAt: string;
}

/* ================================================================
   CONSTANTS
   ================================================================ */
const REFRESH_INTERVAL = 30_000;

const AGENT_META: Record<string, {
  emoji: string;
  responsibility: string;
  subAgents: string[];
}> = {
  jarvis: {
    emoji: "🏛️",
    responsibility: "Supreme Commander — Directs fleet, strategic ops",
    subAgents: ["Sentinel", "Arbiter", "Chronicle"],
  },
  linus: {
    emoji: "⚙️",
    responsibility: "CTO — Engineering, deploys, infrastructure",
    subAgents: ["Forge", "Deployer", "Inspector"],
  },
  jordan: {
    emoji: "📞",
    responsibility: "CRO — Sales outreach, cold email, closing",
    subAgents: ["Hunter", "Archer", "Tracker", "Closer"],
  },
  gary: {
    emoji: "📣",
    responsibility: "CMO — Content, LinkedIn, marketing campaigns",
    subAgents: ["Quill", "Megaphone", "Radar"],
  },
  friend: {
    emoji: "👋",
    responsibility: "Companion — Casual support, brainstorming",
    subAgents: [],
  },
};

interface StandbyAgent {
  id: string;
  name: string;
  role: string;
  title: string;
  emoji: string;
  subAgents: string[];
}

const STANDBY_AGENTS: StandbyAgent[] = [
  { id: "warren", name: "Warren", role: "CSO", title: "Strategy", emoji: "📊", subAgents: ["Analyst", "Scout"] },
  { id: "ray",    name: "Ray",    role: "CFO", title: "Finance", emoji: "💎", subAgents: ["Ledger", "Auditor"] },
  { id: "jony",   name: "Jony",   role: "CPO", title: "Product", emoji: "✨", subAgents: ["Designer", "Tester"] },
  { id: "steve",  name: "Steve",  role: "CCO", title: "Creative", emoji: "🎯", subAgents: ["Writer", "Director"] },
  { id: "jeff",   name: "Jeff",   role: "CDO", title: "Delivery", emoji: "📡", subAgents: ["Router", "Tracker"] },
];

/* ================================================================
   ORG TREE DATA
   ================================================================ */
const ORG_TREE_DATA = {
  name: "👑 Sahil",
  value: "CEO",
  children: [
    {
      name: "🏛️ Jarvis",
      value: "COO",
      children: [
        {
          name: "🎖️ Elon",
          value: "Fleet Commander",
          children: [
            { name: "⚙️ Linus", value: "CTO" },
            { name: "📞 Jordan", value: "CRO" },
            { name: "📣 Gary", value: "CMO" },
            { name: "📊 Warren", value: "CSO (Standby)" },
            { name: "💎 Ray", value: "CFO (Standby)" },
            { name: "✨ Jony", value: "CPO (Standby)" },
            { name: "🎯 Steve", value: "CCO (Standby)" },
            { name: "📡 Jeff", value: "CDO (Standby)" },
            { name: "👋 Friend", value: "Companion" },
          ],
        },
      ],
    },
  ],
};

/* ================================================================
   HELPER: color by latency
   ================================================================ */
function latencyColor(ms: number): string {
  if (ms < 200) return "#22c55e";
  if (ms <= 500) return "#f59e0b";
  return "#ef4444";
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

/** Section 2 — Stat card */
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className={clsx("text-xl font-bold font-mono", color)}>{value}</p>
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

/** Section 4 — Active agent card */
function ActiveAgentCard({
  agent,
  onCheckNow,
  checking,
}: {
  agent: AgentHealth;
  onCheckNow: () => void;
  checking: boolean;
}) {
  const meta = AGENT_META[agent.id] ?? { emoji: "🤖", responsibility: "Agent", subAgents: [] };
  const alive = agent.status === "ALIVE";

  return (
    <div
      className={clsx(
        "relative bg-surface-2 rounded-xl border-l-4 border border-surface-4 overflow-hidden",
        "transition-all duration-300 group hover:scale-[1.01]",
        alive
          ? "border-l-emerald-500 hover:shadow-[0_0_24px_rgba(34,197,94,0.08)]"
          : "border-l-red-500 hover:shadow-[0_0_24px_rgba(239,68,68,0.08)]"
      )}
    >
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "w-2.5 h-2.5 rounded-full",
              alive ? "bg-emerald-400 animate-pulse" : "bg-red-500"
            )}
          />
          <h3 className="text-base font-semibold text-white">{agent.name}</h3>
          <span className="text-[10px] font-bold tracking-wide uppercase bg-brand-400/20 text-brand-400 px-2 py-0.5 rounded-full">
            {agent.role}
          </span>
        </div>
        {agent.error && (
          <span className="text-[10px] text-red-400 font-mono truncate max-w-[140px]" title={agent.error}>
            {agent.error}
          </span>
        )}
      </div>

      {/* AVATAR AREA */}
      <div className="flex justify-center py-1">
        <div className="w-10 h-10 rounded-lg bg-surface-3 border border-surface-4 flex items-center justify-center text-xl">
          {meta.emoji}
        </div>
      </div>

      {/* INFO GRID 2×2 */}
      <div className="grid grid-cols-2 gap-px bg-surface-4 mx-4 rounded-lg overflow-hidden text-center">
        {[
          { label: "IP", val: agent.ip },
          { label: "Port", val: String(agent.port) },
          { label: "HTTP", val: agent.httpStatus != null ? String(agent.httpStatus) : "—" },
          { label: "Latency", val: `${agent.responseMs}ms` },
        ].map((c) => (
          <div key={c.label} className="bg-surface-3 py-2 px-2">
            <p className="text-xs font-mono text-zinc-300 truncate">{c.val}</p>
            <p className="text-[9px] text-zinc-600 uppercase tracking-wider">{c.label}</p>
          </div>
        ))}
      </div>

      {/* RESPONSIBILITY */}
      <div className="px-4 pt-3">
        <p className="text-xs text-zinc-400 leading-relaxed">{meta.responsibility}</p>
      </div>

      {/* SUB-AGENTS */}
      {meta.subAgents.length > 0 && (
        <div className="px-4 pt-2 flex flex-wrap gap-1">
          {meta.subAgents.map((s) => (
            <span
              key={s}
              className="text-[10px] bg-surface-3 border border-surface-4 text-zinc-500 px-2 py-0.5 rounded-full"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* BOTTOM */}
      <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-surface-4">
        <span className="text-[10px] text-zinc-600 font-mono">{fmtTime(agent.lastChecked)}</span>
        <button
          onClick={onCheckNow}
          disabled={checking}
          className="text-[10px] font-medium text-brand-400 hover:text-brand-300 disabled:opacity-40 flex items-center gap-1"
        >
          <RefreshCw className={clsx("w-3 h-3", checking && "animate-spin")} />
          Check Now
        </button>
      </div>
    </div>
  );
}

/** Section 6 — Standby agent card */
function StandbyCard({ agent }: { agent: StandbyAgent }) {
  return (
    <div className="bg-surface-2/40 rounded-xl border border-dashed border-surface-4 p-4 opacity-50 hover:opacity-70 transition-opacity">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl grayscale">{agent.emoji}</span>
        <div>
          <h4 className="text-sm font-semibold text-zinc-400">{agent.name}</h4>
          <p className="text-[10px] text-zinc-600">{agent.role} — {agent.title}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase bg-zinc-800 text-zinc-500">
          <Pause className="w-2.5 h-2.5" /> Standby
        </span>
      </div>
      {agent.subAgents.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {agent.subAgents.map((s) => (
            <span key={s} className="text-[9px] bg-surface-3/50 text-zinc-600 px-1.5 py-0.5 rounded-full">
              {s}
            </span>
          ))}
        </div>
      )}
      <button
        disabled
        title="Coming soon"
        className="text-[10px] font-medium text-zinc-600 cursor-not-allowed flex items-center gap-1 mt-1"
      >
        <Zap className="w-3 h-3" /> Activate
      </button>
    </div>
  );
}

/* ================================================================
   CHART BUILDERS
   ================================================================ */

function buildResponseTimeChart(agents: AgentHealth[]): EChartsOption {
  const alive = agents.filter((a) => a.status === "ALIVE");
  return {
    title: {
      text: "Agent Response Times",
      left: "center",
      textStyle: { color: "#fff", fontSize: 14, fontWeight: 600 },
    },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 60, right: 30, bottom: 40, top: 50 },
    xAxis: {
      type: "category",
      data: alive.map((a) => a.name),
      axisLabel: { color: "#a1a1aa", fontSize: 12 },
    },
    yAxis: {
      type: "value",
      name: "ms",
      nameTextStyle: { color: "#71717a" },
      axisLabel: { color: "#a1a1aa" },
      splitLine: { lineStyle: { color: "#262630" } },
    },
    animationDuration: 1200,
    animationEasing: "elasticOut",
    series: [
      {
        type: "bar",
        data: alive.map((a) => ({
          value: a.responseMs,
          itemStyle: { color: latencyColor(a.responseMs), borderRadius: [6, 6, 0, 0] },
        })),
        barWidth: "40%",
        label: {
          show: true,
          position: "top",
          formatter: "{c}ms",
          color: "#a1a1aa",
          fontSize: 11,
          fontFamily: "JetBrains Mono, monospace",
        },
      },
    ],
  };
}

function buildHealthGauge(online: number, total: number): EChartsOption {
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;
  return {
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: "90%",
        progress: { show: true, width: 18 },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [
              [0.6, "#ef4444"],
              [0.8, "#f59e0b"],
              [1, "#22c55e"],
            ],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: {
          show: true,
          offsetCenter: [0, "70%"],
          fontSize: 13,
          color: "#a1a1aa",
        },
        detail: {
          valueAnimation: true,
          fontSize: 32,
          fontWeight: 700,
          offsetCenter: [0, "20%"],
          formatter: "{value}%",
          color: pct === 100 ? "#22c55e" : pct >= 80 ? "#f59e0b" : "#ef4444",
        },
        data: [{ value: pct, name: "Fleet Health" }],
      },
    ],
  };
}

function buildOrgTree(): EChartsOption {
  return {
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      formatter: (p: unknown) => {
        const params = p as { name: string; value: string };
        return `<b>${params.name}</b><br/>${params.value}`;
      },
    },
    series: [
      {
        type: "tree",
        data: [ORG_TREE_DATA],
        top: "8%",
        left: "12%",
        bottom: "8%",
        right: "12%",
        symbolSize: 14,
        orient: "TB",
        label: {
          position: "top",
          verticalAlign: "middle",
          align: "center",
          fontSize: 11,
          color: "#e4e4e7",
          backgroundColor: "rgba(24,24,31,0.85)",
          borderColor: "#262630",
          borderWidth: 1,
          borderRadius: 4,
          padding: [4, 8],
          rich: {},
        },
        leaves: {
          label: {
            position: "bottom",
            verticalAlign: "middle",
            align: "center",
          },
        },
        lineStyle: {
          color: "#3B82F6",
          width: 1.5,
          curveness: 0.5,
        },
        itemStyle: {
          color: "#3B82F6",
          borderColor: "#3B82F6",
        },
        emphasis: {
          focus: "descendant",
        },
        expandAndCollapse: false,
        animationDuration: 800,
        animationDurationUpdate: 500,
      },
    ],
  };
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function AgentControl() {
  const [fleet, setFleet] = useState<FleetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);
  const [checkingAgent, setCheckingAgent] = useState<string | null>(null);
  const [fleetCollapsed, setFleetCollapsed] = useState(true);

  const fetchFleet = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data: FleetResponse = await res.json();
      setFleet(data);
      setCountdown(REFRESH_INTERVAL / 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check fleet");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const checkSingleAgent = useCallback(async (agentId: string) => {
    setCheckingAgent(agentId);
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      if (!res.ok) return;
      const data: FleetResponse = await res.json();
      setFleet(data);
    } finally {
      setCheckingAgent(null);
    }
  }, []);

  useEffect(() => {
    fetchFleet();
    const iv = setInterval(() => fetchFleet(true), REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [fetchFleet]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1)), 1000);
    return () => clearInterval(tick);
  }, []);

  const onlineCount = fleet?.summary.online ?? 0;
  const totalActive = fleet?.summary.total ?? 5;
  const allHealthy = onlineCount === totalActive;
  const avgResponse = useMemo(() => {
    if (!fleet) return 0;
    const alive = fleet.agents.filter((a) => a.status === "ALIVE");
    if (alive.length === 0) return 0;
    return Math.round(alive.reduce((s, a) => s + a.responseMs, 0) / alive.length);
  }, [fleet]);
  const uptimePct = totalActive > 0 ? Math.round((onlineCount / totalActive) * 100) : 0;
  const countdownPct = (countdown / (REFRESH_INTERVAL / 1000)) * 100;

  /* -------- LOADING SKELETON -------- */
  if (loading && !fleet) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <p className="text-sm text-zinc-500">Scanning fleet…</p>
      </div>
    );
  }

  /* -------- CHART OPTIONS -------- */
  const responseChartOpt = fleet ? buildResponseTimeChart(fleet.agents) : {};
  const gaugeOpt = buildHealthGauge(onlineCount, totalActive);
  const treeOpt = buildOrgTree();

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* =============== ROW 1 — PAGE HEADER =============== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🤖 Fleet Command Center
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Agent Fleet Status — Last checked:{" "}
            <span className="text-zinc-400 font-mono">
              {fleet?.checkedAt ? fmtTime(fleet.checkedAt) : "—"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Fleet health badge */}
          <span
            className={clsx(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold tracking-wide",
              allHealthy
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : onlineCount > 0
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
            )}
          >
            <span className={clsx("w-2.5 h-2.5 rounded-full", allHealthy ? "bg-emerald-400 animate-pulse" : onlineCount > 0 ? "bg-amber-400" : "bg-red-500")} />
            {onlineCount}/{totalActive} ONLINE
          </span>

          {/* Countdown with bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
              <Clock className="w-3.5 h-3.5" />
              Next check in <span className="text-zinc-300 font-semibold">{countdown}s</span>
            </div>
            <div className="h-1 w-full bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-400 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${countdownPct}%` }}
              />
            </div>
          </div>

          {/* Refresh */}
          <button
            onClick={() => fetchFleet(true)}
            disabled={refreshing}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              "bg-brand-400/10 text-brand-400 hover:bg-brand-400/20 border border-brand-400/20",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Checking…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Collapsible Fleet Dashboard */}
      <div className="bg-surface-2 border border-surface-4 rounded-xl overflow-hidden">
        <button
          onClick={() => setFleetCollapsed(!fleetCollapsed)}
          className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-3/50 transition-colors"
        >
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Fleet Dashboard &amp; Health
          </h2>
          <ChevronDown className={clsx("w-4 h-4 text-zinc-500 transition-transform", fleetCollapsed && "-rotate-90")} />
        </button>

        {!fleetCollapsed && (
          <div className="px-4 pb-4 space-y-4 border-t border-surface-4 pt-4">

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center gap-3">
          <span className="flex-1">{error}</span>
          <button onClick={() => fetchFleet(true)} className="text-xs text-zinc-400 hover:text-white">Retry</button>
        </div>
      )}

      {/* =============== ROW 2 — FLEET OVERVIEW BAR =============== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5 text-emerald-400" />}
          label="Active Agents"
          value={onlineCount}
          color="text-emerald-400"
        />
        <StatCard
          icon={<Pause className="w-5 h-5 text-zinc-500" />}
          label="Standby Agents"
          value={STANDBY_AGENTS.length}
          color="text-zinc-400"
        />
        <StatCard
          icon={<Gauge className="w-5 h-5 text-brand-400" />}
          label="Avg Response"
          value={`${avgResponse}ms`}
          color="text-brand-400"
        />
        <StatCard
          icon={<Server className="w-5 h-5 text-emerald-400" />}
          label="Fleet Uptime"
          value={`${uptimePct}%`}
          color={uptimePct === 100 ? "text-emerald-400" : uptimePct >= 80 ? "text-amber-400" : "text-red-400"}
        />
      </div>

      {/* =============== ROW 3 — RESPONSE TIME CHART =============== */}
      <div className="bg-surface-2 border border-surface-4 rounded-xl p-4">
        <Chart option={responseChartOpt} height="280px" loading={!fleet} />
      </div>

      {/* =============== ROW 4 — ACTIVE FLEET GRID =============== */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          Active Fleet
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {fleet?.agents.map((agent) => (
            <ActiveAgentCard
              key={agent.id}
              agent={agent}
              onCheckNow={() => checkSingleAgent(agent.id)}
              checking={checkingAgent === agent.id}
            />
          ))}
        </div>
      </div>

      {/* =============== ROW 5 — ORG TREE + HEALTH GAUGE =============== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-surface-2 border border-surface-4 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            🏛️ Org Hierarchy
          </h2>
          <Chart option={treeOpt} height="380px" />
        </div>
        <div className="lg:col-span-2 bg-surface-2 border border-surface-4 rounded-xl p-4 flex flex-col items-center justify-center">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            🛡️ Fleet Health
          </h2>
          <Chart option={gaugeOpt} height="300px" />
        </div>
      </div>

      {/* =============== ROW 6 — STANDBY FLEET =============== */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Pause className="w-4 h-4 text-zinc-500" />
          ⏸️ Standby Fleet — Spin up when needed
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {STANDBY_AGENTS.map((agent) => (
            <StandbyCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

          </div>
        )}
      </div>

      {/* =============== AGENT PROFILES — PRIMARY SECTION =============== */}
      <AgentProfiles />

      {/* =============== WORKSPACE BROWSER =============== */}
      <AgentWorkspace />
    </div>
  );
}
