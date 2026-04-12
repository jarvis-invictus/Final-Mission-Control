"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, Users, Mail, Globe, AlertCircle,
  ArrowUpRight, ArrowDownRight, Activity, Clock, RefreshCw, Loader2
} from "lucide-react";
import { getDashboard } from "@/lib/api";
import FleetStatusLive from "./FleetStatusLive";
import LiveFeed from "./LiveFeed";
import QuickActions from "./QuickActions";

// ============ TYPES ============
interface DashboardData {
  summary: {
    total: number;
    hot: number;
    conversionRate: number;
    contactedRate: number;
    dueTasks: number;
  };
  byStage: Record<string, number>;
  topNiches: { niche: string; count: number }[];
  topCities: { city: string; count: number }[];
  pipelineChart: { stage: string; count: number }[];
  recentActivities: { id: number; type: string; description: string; created_at: string; prospect_name?: string }[];
  dueTasks: {
    id: number; title: string; description: string; priority: string;
    status: string; assigned_to: string; due_at: string;
  }[];
}

// ============ SKELETON COMPONENTS ============
function SkeletonMetricCard() {
  return (
    <div className="bg-surface-2 rounded-xl p-5 border border-white/5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/5" />
        <div className="w-16 h-4 rounded bg-white/5" />
      </div>
      <div className="w-20 h-7 rounded bg-white/5 mb-2" />
      <div className="w-24 h-4 rounded bg-white/5" />
    </div>
  );
}

function SkeletonPipeline() {
  return (
    <div className="lg:col-span-2 bg-surface-2 rounded-xl p-6 border border-white/5 animate-pulse">
      <div className="w-40 h-6 rounded bg-white/5 mb-4" />
      <div className="w-full h-16 rounded bg-white/5" />
    </div>
  );
}

function SkeletonFleet() {
  return (
    <div className="bg-surface-2 rounded-xl p-6 border border-white/5 animate-pulse">
      <div className="w-28 h-6 rounded bg-white/5 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}

// ============ DISPLAY COMPONENTS ============
function MetricCard({
  title, value, change, changeType, icon: Icon, color, href
}: {
  title: string; value: string; change: string; changeType: "up" | "down" | "neutral";
  icon: React.ElementType; color: string; href?: string;
}) {
  const content = (
    <div className={`bg-surface-2 rounded-xl p-5 border border-white/5 hover:border-brand-400/20 transition-all group ${href ? "cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${
          changeType === "up" ? "text-success" : changeType === "down" ? "text-danger" : "text-zinc-500"
        }`}>
          {changeType === "up" ? <ArrowUpRight className="w-3 h-3" /> :
           changeType === "down" ? <ArrowDownRight className="w-3 h-3" /> : null}
          {change}
        </div>
      </div>
      <div className="text-2xl font-bold text-white group-hover:text-brand-400 transition-colors mb-1">{value}</div>
      <div className="text-sm text-zinc-500 flex items-center justify-between">
        <span>{title}</span>
        {href && <span className="text-[10px] text-zinc-600 group-hover:text-brand-400/50 transition-colors">Click to view →</span>}
      </div>
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }
  return content;
}

function AgentStatus({ name, status, task, uptime }: {
  name: string; status: "online" | "offline" | "busy"; task: string; uptime: string;
}) {
  const statusColors = {
    online: "bg-success",
    offline: "bg-danger",
    busy: "bg-warning",
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-surface-3 rounded-lg hover:bg-surface-4 transition-all">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]} animate-pulse`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-200">{name}</div>
        <div className="text-xs text-zinc-500 truncate">{task}</div>
      </div>
      <div className="text-[10px] text-zinc-600 font-mono">{uptime}</div>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function CommandCenter() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [ghlStats, setGhlStats] = useState<{ contacts: number; opportunities: number; pipelineValue: number; conversations: number } | null>(null);
  const [weather, setWeather] = useState<{ temp_C: string; weatherDesc: string; city?: string } | null>(null);
  const [liveTime, setLiveTime] = useState(new Date());
  const [livePriorities, setLivePriorities] = useState<{ level: string; owner: string; title: string; detail: string; source: string }[]>([]);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [result, ghlRes] = await Promise.all([
        getDashboard(),
        fetch("/api/ghl?section=overview").then(r => r.ok ? r.json() : null).catch(() => null),
      ]);
      setData(result);
      if (ghlRes && !ghlRes.error) {
        const opps = ghlRes.opportunities?.items || [];
        setGhlStats({
          contacts: ghlRes.contacts?.total ?? 0,
          opportunities: ghlRes.opportunities?.total ?? 0,
          pipelineValue: opps.reduce((s: number, o: any) => s + (o.monetaryValue || 0), 0),
          conversations: ghlRes.conversations?.total ?? 0,
        });
      }
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(message);
      // Keep last known data on error (don't clear `data`)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* Weather + live clock — fixed location: Mamurdi, Pune */
  useEffect(() => {
    fetch("/api/weather?city=Mamurdi,Pune").then(r => r.json()).then(setWeather).catch(() => {});
    // Fetch live priorities from Jarvis
    fetch("/api/jarvis-priorities").then(r => r.json()).then(d => {
      if (d.priorities) setLivePriorities(d.priorities);
    }).catch(() => {});

    const clockInterval = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Derive display values from live data
  const totalProspects = data?.summary?.total ?? 0;
  const hotProspects = data?.summary?.hot ?? 0;
  const contactedRate = data?.summary?.contactedRate ?? 0;
  const conversionRate = data?.summary?.conversionRate ?? 0;

  const byStage = data?.byStage ?? {};
  const topNiches = data?.topNiches ?? [];
  const dueTasks = data?.dueTasks ?? [];

  // Find top niche for subtitle
  const topNiche = topNiches.length > 0 ? topNiches[0] : null;
  const dentalCount = topNiches.find(n => n.niche === "dental")?.count ?? 0;

  // Format number with commas
  const fmt = (n: number) => n.toLocaleString("en-IN");

  // Greeting based on IST time
  const istHour = liveTime.getUTCHours() + 5 + (liveTime.getUTCMinutes() + 30 >= 60 ? 1 : 0);
  const normalizedHour = ((istHour % 24) + 24) % 24;
  const greeting = normalizedHour < 12 ? "Good morning" : normalizedHour < 17 ? "Good afternoon" : "Good evening";
  const istTimeStr = liveTime.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const istDateStr = liveTime.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Current date string
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  // Priority mapping for task cards
  const priorityConfig: Record<string, { color: string; borderColor: string; label: string }> = {
    P0: { color: "text-danger", borderColor: "border-danger", label: "Critical" },
    P1: { color: "text-warning", borderColor: "border-warning", label: "High" },
    P2: { color: "text-info", borderColor: "border-info", label: "Medium" },
    P3: { color: "text-zinc-400", borderColor: "border-zinc-500", label: "Low" },
  };

  // ============ LOADING STATE ============
  if (loading && !data) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Command Center</h1>
            <p className="text-sm text-zinc-500 mt-1">
              <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
              Loading live CRM data…
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonMetricCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonPipeline />
          <SkeletonFleet />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-danger flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm text-danger">{error}</span>
            {data && <span className="text-xs text-zinc-500 ml-2">— showing last known data</span>}
          </div>
          <button onClick={() => fetchData(true)} className="text-xs text-zinc-400 hover:text-white transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Welcome Bar */}
      <div className="glass rounded-2xl p-6 animate-fadeInUp">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, <span className="neon-text">Master</span> 👋
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {istDateStr} · {istTimeStr} IST
              </span>
              {weather && weather.temp_C !== "?" && (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {weather.weatherDesc === "Sunny" || weather.weatherDesc === "Clear" ? "☀️" : weather.weatherDesc.includes("Rain") ? "🌧️" : weather.weatherDesc.includes("Cloud") ? "☁️" : "🌤️"}
                  {weather.temp_C}°C Mamurdi, Pune · {weather.weatherDesc}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[10px] text-zinc-600 font-mono">
                Updated {lastUpdated.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" })}
              </span>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:border-brand-400/30 hover:shadow-[0_0_15px_rgba(212,168,83,0.1)] text-zinc-300 hover:text-white transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Prospects"
          value={fmt(totalProspects)}
          change={`Hot leads: ${fmt(hotProspects)}`}
          changeType={hotProspects > 0 ? "up" : "neutral"}
          icon={Users}
          color="bg-brand-400"
          href="/crm"
        />
        <MetricCard
          title="Contacted Rate"
          value={`${contactedRate.toFixed(1)}%`}
          change={`${fmt(byStage["CONTACTED"] ?? 0)} contacted`}
          changeType={contactedRate > 0 ? "up" : "neutral"}
          icon={Mail}
          color="bg-brand-400"
          href="/crm"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          change={`${fmt(byStage["WON"] ?? 0)} won`}
          changeType={conversionRate > 0 ? "up" : "neutral"}
          icon={TrendingUp}
          color="bg-brand-400"
          href="/crm"
        />
        <MetricCard
          title="GHL Pipeline"
          value={ghlStats ? `₹${(ghlStats.pipelineValue / 1000).toFixed(0)}K` : "—"}
          change={ghlStats ? `${ghlStats.opportunities} deals · ${ghlStats.contacts} contacts` : "Loading..."}
          changeType={ghlStats && ghlStats.pipelineValue > 0 ? "up" : "neutral"}
          icon={Globe}
          color="bg-brand-400"
          href="/ghl"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-surface-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-white">⚡ Quick Actions</span>
        </div>
        <QuickActions />
      </div>

      {/* Live Fleet Status */}
      <div className="bg-surface-1 rounded-2xl p-6 border border-surface-5">
        <FleetStatusLive />
      </div>

      {/* Today's Priorities — Live from Jarvis + Elon */}
      <div className="bg-surface-2 rounded-xl p-6 border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Today&apos;s Priorities</h2>
          <span className="text-[10px] text-zinc-600">Live from Jarvis + Elon</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(livePriorities.length > 0 ? livePriorities : [
            { level: "P0", owner: "Elon", title: "MC V7 — Full completion", detail: "Fleet, Niche Gallery, n8n, Intel, Calendar, Onboarding Engine", source: "elon" },
            { level: "P1", owner: "Jarvis", title: "Cold Email — DNS + warmup", detail: "invictusai.site/.online/.tech — Postal ready, DNS pending", source: "jarvis" },
            { level: "P1", owner: "Jarvis", title: "n8n Workflows — expand", detail: "4 active at n8n.invictus-ai.in, building template library", source: "jarvis" },
            { level: "P2", owner: "All", title: "First client onboarding", detail: "Onboarding engine ready — waiting for first real client", source: "elon" },
          ]).slice(0, 4).map((p, i) => {
            const borderCol = p.level === "P0" ? "border-red-500" : p.level === "P1" ? "border-amber-500" : "border-brand-500";
            const labelCol = p.level === "P0" ? "text-red-400" : p.level === "P1" ? "text-amber-400" : "text-brand-400";
            return (
              <div key={i} className={`p-4 bg-surface-3 rounded-lg border-l-2 ${borderCol}`}>
                <div className={`text-xs ${labelCol} font-medium uppercase tracking-wider mb-2`}>
                  {p.level} · {p.owner}
                </div>
                <div className="text-sm text-zinc-200 font-medium line-clamp-2">{p.title}</div>
                <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
