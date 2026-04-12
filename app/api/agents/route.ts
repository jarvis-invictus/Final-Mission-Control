import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

interface AgentCheck {
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

const AGENT_DEFS = [
  { id: "jarvis", name: "Jarvis", role: "COO",            title: "Gateway & Infrastructure", container: "openclaw-v1yl-openclaw-1" },
  { id: "elon",   name: "Elon",   role: "Fleet Commander", title: "Fleet Operations",         container: "openclaw-elon" },
  { id: "linus",  name: "Linus",  role: "CTO",            title: "Build & Deploy",            container: "openclaw-linus" },
  { id: "jordan", name: "Jordan", role: "CRO",            title: "Revenue & Outreach",        container: "openclaw-jordan" },
  { id: "gary",   name: "Gary",   role: "CMO",            title: "Growth & Marketing",        container: "openclaw-gary" },
  { id: "friend", name: "Friend", role: "Support",        title: "Support & Assistance",      container: "openclaw-friend" },
];

const PORT = 18790;
const TOKEN = "fleet_ops_2026";
const TIMEOUT_MS = 5000;

/* Resolve container IPs individually — handles missing containers gracefully */
function resolveIPs(): Map<string, string> {
  const result = new Map<string, string>();
  for (const agent of AGENT_DEFS) {
    try {
      const raw = execSync(
        `docker inspect ${agent.container} --format '{{.Name}}|||{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' 2>/dev/null`,
        { timeout: 3000 }
      ).toString().trim();
      const [rawName, ipsStr] = raw.split("|||");
      const name = rawName.replace(/^\//, "");
      const ips = (ipsStr || "").trim().split(/\s+/);
      const ip = ips.find(i => i.startsWith("172.26.")) || ips[0] || "";
      if (ip) result.set(name, ip);
    } catch {
      // Container doesn't exist or isn't running — skip
    }
  }
  return result;
}

async function checkAgent(agent: typeof AGENT_DEFS[number], ip: string): Promise<AgentCheck> {
  const endpoint = `http://${ip}:${PORT}/hooks/agent`;
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    return {
      id: agent.id, name: agent.name, role: agent.role, title: agent.title,
      ip, port: PORT, endpoint, status: "ALIVE", responseMs: elapsed,
      httpStatus: res.status, lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    let errorDetail = "Connection failed";
    if (err instanceof Error) {
      if (err.name === "AbortError") errorDetail = `Timeout after ${TIMEOUT_MS}ms`;
      else if (err.message.includes("ECONNREFUSED")) errorDetail = "Connection refused";
      else if (err.message.includes("ENOTFOUND")) errorDetail = "Host not found";
      else errorDetail = err.message;
    }
    return {
      id: agent.id, name: agent.name, role: agent.role, title: agent.title,
      ip, port: PORT, endpoint, status: "DOWN", responseMs: elapsed,
      httpStatus: null, lastChecked: new Date().toISOString(), error: errorDetail,
    };
  }
}

export async function GET(): Promise<any> {
  const ipMap = resolveIPs();
  const results = await Promise.all(
    AGENT_DEFS.map(agent => {
      const ip = ipMap.get(agent.container) || "0.0.0.0";
      return checkAgent(agent, ip);
    })
  );
  const online = results.filter(r => r.status === "ALIVE").length;
  return NextResponse.json({
    agents: results,
    summary: { online, total: results.length },
    checkedAt: new Date().toISOString(),
  });
}
