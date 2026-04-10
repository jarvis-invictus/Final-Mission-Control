import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

interface AgentDef {
  id: string;
  name: string;
  role: string;
  emoji: string;
  container: string;
  active: boolean;
}

const AGENTS: AgentDef[] = [
  { id: "jarvis", name: "Jarvis", role: "COO", emoji: "🏛️", container: "openclaw-v1yl-openclaw-1", active: true },
  { id: "elon", name: "Elon", role: "Fleet Commander", emoji: "🎖️", container: "openclaw-elon", active: true },
  { id: "linus", name: "Linus", role: "CTO", emoji: "⚙️", container: "openclaw-linus", active: true },
  { id: "jordan", name: "Jordan", role: "CRO", emoji: "📞", container: "openclaw-jordan", active: true },
  { id: "gary", name: "Gary", role: "CMO", emoji: "📣", container: "openclaw-gary", active: false },
  { id: "friend", name: "Friend", role: "Companion", emoji: "👋", container: "openclaw-friend", active: true },
  { id: "warren", name: "Warren", role: "CSO", emoji: "📊", container: "openclaw-warren", active: false },
  { id: "ray", name: "Ray", role: "CFO", emoji: "💰", container: "openclaw-ray", active: false },
  { id: "jony", name: "Jony", role: "CPO", emoji: "🎨", container: "openclaw-jony", active: false },
  { id: "steve", name: "Steve", role: "CCO", emoji: "✍️", container: "openclaw-steve", active: false },
  { id: "jeff", name: "Jeff", role: "CDO", emoji: "📦", container: "openclaw-jeff", active: false },
];

/* ============================================================
 * PERFORMANCE FIX: One docker inspect + one docker stats call
 * instead of per-container calls (was 9s → now <2s)
 * ============================================================ */

interface ContainerInfo {
  status: "running" | "stopped" | "not_found";
  uptime?: string;
  startedAt?: string;
  memoryMB?: number;
  cpuPercent?: number;
  ip?: string;
}

function batchContainerInfo(agents: AgentDef[]): Map<string, ContainerInfo> {
  const result = new Map<string, ContainerInfo>();
  const activeContainers = agents.filter(a => a.active).map(a => a.container);

  // Batch inspect — one call for all containers
  const inspectMap = new Map<string, { status: string; startedAt: string; ip: string }>();
  try {
    const raw = execSync(
      `docker inspect ${activeContainers.join(" ")} --format '{{.Name}}|||{{.State.Status}}|||{{.State.StartedAt}}|||{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null`,
      { timeout: 5000 }
    ).toString().trim();
    for (const line of raw.split("\n")) {
      const [rawName, status, startedAt, ip] = line.split("|||");
      const name = rawName.replace(/^\//, "");
      inspectMap.set(name, { status, startedAt, ip });
    }
  } catch {}

  // Batch stats — ONE docker stats call for all running containers
  const runningContainers = activeContainers.filter(c => inspectMap.get(c)?.status === "running");
  const statsMap = new Map<string, { memMB: number; cpu: number }>();
  if (runningContainers.length > 0) {
    try {
      const raw = execSync(
        `docker stats ${runningContainers.join(" ")} --no-stream --format '{{.Name}}|||{{.MemUsage}}|||{{.CPUPerc}}' 2>/dev/null`,
        { timeout: 8000 }
      ).toString().trim();
      for (const line of raw.split("\n")) {
        const [name, memStr, cpuStr] = line.split("|||");
        let memMB = 0;
        const memMatch = memStr?.match(/([\d.]+)(MiB|GiB)/);
        if (memMatch) {
          memMB = memMatch[2] === "GiB" ? parseFloat(memMatch[1]) * 1024 : parseFloat(memMatch[1]);
        }
        statsMap.set(name, { memMB: Math.round(memMB), cpu: Math.round((parseFloat(cpuStr) || 0) * 10) / 10 });
      }
    } catch {}
  }

  const now = Date.now();

  for (const agent of agents) {
    if (!agent.active) {
      result.set(agent.id, { status: "stopped" });
      continue;
    }
    const info = inspectMap.get(agent.container);
    if (!info || info.status !== "running") {
      result.set(agent.id, { status: info ? "stopped" : "not_found" });
      continue;
    }
    const diffMs = now - new Date(info.startedAt).getTime();
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const uptime = h > 24 ? `${Math.floor(h/24)}d ${h%24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
    const stats = statsMap.get(agent.container);
    result.set(agent.id, {
      status: "running",
      uptime,
      startedAt: info.startedAt,
      ip: info.ip,
      memoryMB: stats?.memMB || 0,
      cpuPercent: stats?.cpu || 0,
    });
  }

  return result;
}

export async function GET() {
  const infoMap = batchContainerInfo(AGENTS);

  const results = AGENTS.map((agent) => ({
    ...agent,
    ...(infoMap.get(agent.id) || { status: "not_found" }),
  }));

  // System stats — single call
  let systemStats = { totalMemoryMB: 0, usedMemoryMB: 0, cpuCores: 0, loadAvg: "" };
  try {
    const raw = execSync("free -m | grep Mem; echo '---'; nproc; echo '---'; cat /proc/loadavg", { timeout: 3000 }).toString();
    const [memLine, , cpuLine, , loadLine] = raw.split("\n");
    const parts = memLine.split(/\s+/);
    systemStats.totalMemoryMB = parseInt(parts[1]) || 0;
    systemStats.usedMemoryMB = parseInt(parts[2]) || 0;
    systemStats.cpuCores = parseInt(cpuLine) || 0;
    systemStats.loadAvg = loadLine?.split(" ").slice(0, 3).join(" ") || "";
  } catch {}

  const activeAgents = results.filter(r => r.active);
  return NextResponse.json({
    agents: results,
    summary: {
      running: results.filter(r => r.status === "running").length,
      total: results.length,
      activeOnline: activeAgents.filter(r => r.status === "running").length,
      activeTotal: activeAgents.length,
    },
    system: systemStats,
    timestamp: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=30" },
  });
}
