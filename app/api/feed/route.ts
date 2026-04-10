import { NextResponse } from "next/server";
import { readdirSync, statSync, existsSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const DOCS_DIR = "/workspace/docs";
const AGENTS_DIR = "/workspace/agents";

interface FeedItem {
  type: "doc_new" | "doc_updated" | "prospect_stage" | "fleet_event" | "system" | "conversation";
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
  agent?: string;
  meta?: Record<string, string | number>;
}

const AGENT_NAMES: Record<string, { name: string; emoji: string }> = {
  elon: { name: "Elon", emoji: "🎖️" },
  jarvis: { name: "Jarvis", emoji: "🏛️" },
  linus: { name: "Linus", emoji: "⚙️" },
  jordan: { name: "Jordan", emoji: "📞" },
  gary: { name: "Gary", emoji: "📣" },
  friend: { name: "Friend", emoji: "👋" },
};

const CONTAINER_MAP: Record<string, string> = {
  "openclaw-v1yl-openclaw-1": "jarvis",
  "openclaw-elon": "elon",
  "openclaw-linus": "linus",
  "openclaw-jordan": "jordan",
  "openclaw-gary": "gary",
  "openclaw-friend": "friend",
};

function scanDocs(dir: string, agentId: string | null, feed: FeedItem[], cutoff: Date) {
  try {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      try {
        const fp = join(dir, entry.name);
        const stat = statSync(fp);
        const mtime = new Date(stat.mtime);
        if (mtime < cutoff) continue;
        const ctime = new Date(stat.birthtime || stat.ctime);
        const isNew = (mtime.getTime() - ctime.getTime()) < 60000;
        const title = entry.name.replace(/\.md$/, "").replace(/[-_]/g, " ");
        const agentInfo = agentId ? AGENT_NAMES[agentId] : null;
        feed.push({
          type: isNew ? "doc_new" : "doc_updated",
          title: isNew ? `New: ${title}` : `Updated: ${title}`,
          description: `${(stat.size / 1024).toFixed(1)}KB${agentInfo ? ` · ${agentInfo.name}` : " · Shared"}`,
          timestamp: mtime.toISOString(),
          icon: isNew ? "📄" : "✏️",
          agent: agentId || "shared",
          meta: { size: stat.size, filename: entry.name },
        });
      } catch {}
    }
    // Also scan docs/ subfolder
    const docsSubdir = join(dir, "docs");
    if (existsSync(docsSubdir)) {
      try {
        const subEntries = readdirSync(docsSubdir, { withFileTypes: true });
        for (const entry of subEntries) {
          if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
          try {
            const fp = join(docsSubdir, entry.name);
            const stat = statSync(fp);
            const mtime = new Date(stat.mtime);
            if (mtime < cutoff) continue;
            const ctime = new Date(stat.birthtime || stat.ctime);
            const isNew = (mtime.getTime() - ctime.getTime()) < 60000;
            const title = entry.name.replace(/\.md$/, "").replace(/[-_]/g, " ");
            const agentInfo = agentId ? AGENT_NAMES[agentId] : null;
            feed.push({
              type: isNew ? "doc_new" : "doc_updated",
              title: isNew ? `New: ${title}` : `Updated: ${title}`,
              description: `${(stat.size / 1024).toFixed(1)}KB${agentInfo ? ` · ${agentInfo.name}` : " · Shared"}`,
              timestamp: mtime.toISOString(),
              icon: isNew ? "📄" : "✏️",
              agent: agentId || "shared",
              meta: { size: stat.size, filename: entry.name },
            });
          } catch {}
        }
      } catch {}
    }
  } catch {}
}

function scanConversations(agentId: string, feed: FeedItem[], cutoff: Date) {
  // Look for memory/chat-log-*.md and memory/*.md files as conversation logs
  const memDir = join(AGENTS_DIR, agentId, "memory");
  try {
    if (!existsSync(memDir)) return;
    const entries = readdirSync(memDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      try {
        const fp = join(memDir, entry.name);
        const stat = statSync(fp);
        const mtime = new Date(stat.mtime);
        if (mtime < cutoff) continue;
        const agentInfo = AGENT_NAMES[agentId];
        const isChatLog = entry.name.startsWith("chat-log-");
        feed.push({
          type: "conversation",
          title: isChatLog ? `Chat log: ${entry.name.replace(/\.md$/, "").replace("chat-log-", "")}` : `Memory: ${entry.name.replace(/\.md$/, "")}`,
          description: `${(stat.size / 1024).toFixed(1)}KB · ${agentInfo?.name || agentId}`,
          timestamp: mtime.toISOString(),
          icon: isChatLog ? "💬" : "🧠",
          agent: agentId,
          meta: { size: stat.size, filename: entry.name },
        });
      } catch {}
    }
  } catch {}
}

export async function GET() {
  const feed: FeedItem[] = [];
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // 1. Shared docs
  scanDocs(DOCS_DIR, null, feed, threeDaysAgo);

  // 2. Agent-specific docs + conversations
  for (const agentId of Object.keys(AGENT_NAMES)) {
    const agentDir = join(AGENTS_DIR, agentId);
    scanDocs(agentDir, agentId, feed, threeDaysAgo);
    scanConversations(agentId, feed, threeDaysAgo);
  }

  // 3. CRM prospect changes
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch("https://crm.invictus-ai.in/api/prospects?limit=50&sort=updated_at&order=desc", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    const prospects = Array.isArray(data) ? data : data?.data || [];
    for (const p of prospects) {
      if (p.stage_changed_at) {
        const changedAt = new Date(p.stage_changed_at);
        if (changedAt > threeDaysAgo && p.stage !== "NEW") {
          feed.push({
            type: "prospect_stage",
            title: `${p.business_name} → ${p.stage}`,
            description: `${p.niche || "Unknown"} · ${p.city || ""}`,
            timestamp: changedAt.toISOString(),
            icon: p.stage === "WON" ? "🎉" : p.stage === "CONTACTED" ? "📞" : p.stage === "MEETING" ? "🤝" : "📋",
            agent: "jordan",
            meta: { stage: p.stage, niche: p.niche || "", id: p.id },
          });
        }
      }
    }
  } catch {}

  // 4. Fleet events
  try {
    const containers = Object.keys(CONTAINER_MAP);
    const raw = execSync(
      `docker inspect ${containers.join(" ")} --format '{{.Name}}|||{{.State.StartedAt}}' 2>/dev/null`,
      { timeout: 5000 }
    ).toString().trim();
    for (const line of raw.split("\n")) {
      const [rawName, startedAt] = line.split("|||");
      const name = rawName.replace(/^\//, "");
      const agentId = CONTAINER_MAP[name];
      const started = new Date(startedAt);
      if (started > oneDayAgo && agentId) {
        const info = AGENT_NAMES[agentId];
        feed.push({
          type: "fleet_event",
          title: `${info?.name || agentId} started`,
          description: "Container restarted",
          timestamp: started.toISOString(),
          icon: "🟢",
          agent: agentId,
        });
      }
    }
  } catch {}

  // 5. System events
  try {
    const uptime = execSync("uptime -s 2>/dev/null", { timeout: 3000 }).toString().trim();
    const bootTime = new Date(uptime);
    if (bootTime > threeDaysAgo) {
      feed.push({
        type: "system",
        title: "VPS booted",
        description: "System startup",
        timestamp: bootTime.toISOString(),
        icon: "🖥️",
        agent: "system",
      });
    }
  } catch {}

  feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Build agent summary
  const agentSummary: Record<string, number> = {};
  for (const item of feed) {
    const a = item.agent || "shared";
    agentSummary[a] = (agentSummary[a] || 0) + 1;
  }

  return NextResponse.json({
    feed: feed.slice(0, 100),
    total: feed.length,
    agentSummary,
    timestamp: now.toISOString(),
  }, {
    headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=60" },
  });
}
