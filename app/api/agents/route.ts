import { NextResponse } from "next/server";

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

const ACTIVE_AGENTS = [
  { id: "jarvis", name: "Jarvis", role: "COO", title: "Gateway & Infrastructure", ip: "172.26.0.10" },
  { id: "linus",  name: "Linus",  role: "CTO", title: "Build & Deploy",           ip: "172.26.0.3"  },
  { id: "jordan", name: "Jordan", role: "CRO", title: "Revenue & Outreach",       ip: "172.26.0.14" },
  { id: "gary",   name: "Gary",   role: "CMO", title: "Growth & Content",         ip: "172.26.0.12" },
  { id: "friend", name: "Friend", role: "Support", title: "Support & Assistance", ip: "172.26.0.7"  },
];

const PORT = 18790;
const TOKEN = "fleet_ops_2026";
const TIMEOUT_MS = 3000;

async function checkAgent(agent: (typeof ACTIVE_AGENTS)[number]): Promise<AgentCheck> {
  const endpoint = `http://${agent.ip}:${PORT}/hooks/agent`;
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
    // ANY HTTP response means the container is alive and listening.
    // 405 is the expected response from relay endpoints (Method Not Allowed).
    // Even 500 means the server process is running.
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      title: agent.title,
      ip: agent.ip,
      port: PORT,
      endpoint,
      status: "ALIVE",
      responseMs: elapsed,
      httpStatus: res.status,
      lastChecked: new Date().toISOString(),
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    let errorDetail = "Connection failed";
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        errorDetail = `Timeout after ${TIMEOUT_MS}ms`;
      } else if (err.message.includes("ECONNREFUSED")) {
        errorDetail = "Connection refused — container may be down";
      } else if (err.message.includes("ENOTFOUND")) {
        errorDetail = "Host not found — DNS/network issue";
      } else {
        errorDetail = err.message;
      }
    }
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      title: agent.title,
      ip: agent.ip,
      port: PORT,
      endpoint,
      status: "DOWN",
      responseMs: elapsed,
      httpStatus: null,
      lastChecked: new Date().toISOString(),
      error: errorDetail,
    };
  }
}

export async function GET() {
  const results = await Promise.all(ACTIVE_AGENTS.map(checkAgent));
  const online = results.filter((r) => r.status === "ALIVE").length;
  return NextResponse.json({
    agents: results,
    summary: { online, total: results.length },
    checkedAt: new Date().toISOString(),
  });
}
