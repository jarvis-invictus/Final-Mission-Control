import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";

export const dynamic = "force-dynamic";

const AGENTS: Record<string, { name: string; container: string }> = {
  elon:   { name: "Elon",   container: "openclaw-elon" },
  jarvis: { name: "Jarvis", container: "openclaw-v1yl-openclaw-1" },
  linus:  { name: "Linus",  container: "openclaw-linus" },
  jordan: { name: "Jordan", container: "openclaw-jordan" },
  gary:   { name: "Gary",   container: "openclaw-gary" },
  friend: { name: "Friend", container: "openclaw-friend" },
};

const TOKEN = "fleet_ops_2026";

async function getContainerIP(container: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(
      `docker inspect ${container} --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}'`,
      { timeout: 5000 },
      (err, stdout) => {
        if (err) return reject(err);
        // Get the first IP (traefik_shared network usually)
        const ips = stdout.trim().split(/\s+/).filter(Boolean);
        if (ips.length === 0) return reject(new Error("No IP found"));
        // Prefer 172.26.x.x (traefik_shared)
        const preferred = ips.find(ip => ip.startsWith("172.26.")) || ips[0];
        resolve(preferred);
      }
    );
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, title, description, severity, assignedBy } = body;

    if (!agentId || !title) {
      return NextResponse.json({ error: "agentId and title required" }, { status: 400 });
    }

    const agent = AGENTS[agentId];
    if (!agent) {
      return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 400 });
    }

    // Get current container IP dynamically
    let ip: string;
    try {
      ip = await getContainerIP(agent.container);
    } catch {
      return NextResponse.json({
        success: false,
        agent: agent.name,
        message: `${agent.name}'s container (${agent.container}) is not running or has no IP`,
      });
    }

    const message = `🚨 BLOCKER ASSIGNED — from Mission Control

**Title:** ${title}
**Severity:** ${severity || "UNKNOWN"}
**Assigned by:** ${assignedBy || "Mission Control"}

**Details:**
${description || "No additional details provided."}

Please investigate and update your status. If this conflicts with your current task, note the conflict and prioritize based on severity.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`http://${ip}:18790/hooks/agent`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      return NextResponse.json({
        success: res.ok,
        agent: agent.name,
        agentId,
        httpStatus: res.status,
        ip,
        message: res.ok
          ? `✅ Blocker sent to ${agent.name} (${ip})`
          : `${agent.name} responded with HTTP ${res.status}. The agent may be busy — the message was delivered.`,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      return NextResponse.json({
        success: false,
        agent: agent.name,
        agentId,
        ip,
        message: `Could not reach ${agent.name}'s relay at ${ip}:18790. The agent's relay may be down.`,
      });
    }
  } catch (err) {
    console.error("[blockers/assign] Error:", err);
    return NextResponse.json(
      { error: "Failed to assign blocker", details: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
