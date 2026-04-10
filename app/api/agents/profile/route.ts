import { NextResponse } from "next/server";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const AGENTS_ROOT = process.env.AGENTS_WORKSPACE_ROOT || "/workspace/agents";

const AGENT_META: Record<string, { name: string; role: string; title: string; emoji: string; model: string; department: string; reportsTo: string; subAgents: string[]; skills: string[]; authority: string[] }> = {
  jarvis: { name: "Jarvis", role: "COO", title: "Chief Operating Officer", emoji: "🏛️", model: "claude-opus-4.6", department: "Operations", reportsTo: "Sahil (CEO)", subAgents: ["Sentinel", "Arbiter", "Chronicle", "Nexus", "Dispatch"], skills: ["Fleet orchestration", "Task routing", "Discord ops", "Strategic planning", "Cross-dept coordination"], authority: ["Can assign tasks to all agents", "Can restart fleet members", "Can approve/reject proposals", "Direct report to CEO", "Budget allocation decisions"] },
  elon: { name: "Elon", role: "Fleet Commander", title: "Chief of Staff", emoji: "🎖️", model: "claude-opus-4.6", department: "Command", reportsTo: "Jarvis (COO)", subAgents: ["Linus", "Jordan", "Gary", "Friend"], skills: ["Fleet monitoring", "Agent coordination", "VPS management", "Docker ops", "Task delegation"], authority: ["Can message all agents via hooks", "Can restart containers", "Can deploy to VPS", "Escalates blockers to Jarvis", "Memory & doc management"] },
  linus: { name: "Linus", role: "CTO", title: "Chief Technology Officer", emoji: "⚙️", model: "claude-opus-4.6", department: "Engineering", reportsTo: "Elon", subAgents: ["Forge", "Tester", "Reviewer"], skills: ["Full-stack development", "Docker/DevOps", "API design", "Next.js/React", "Database management"], authority: ["Can deploy to production", "Can create/modify containers", "Can push to GitHub", "Infrastructure decisions", "Tech stack choices"] },
  jordan: { name: "Jordan", role: "CRO", title: "Chief Revenue Officer", emoji: "📞", model: "claude-sonnet-4.6", department: "Revenue", reportsTo: "Elon", subAgents: ["Hunter", "Closer"], skills: ["Cold outreach", "Email campaigns", "Sales pipeline", "Lead qualification", "Follow-up sequences"], authority: ["Can send outreach emails", "Can update CRM prospects", "Can schedule meetings", "Revenue target ownership", "Pricing negotiations"] },
  gary: { name: "Gary", role: "CMO", title: "Chief Marketing Officer", emoji: "📣", model: "claude-sonnet-4.6", department: "Marketing", reportsTo: "Elon", subAgents: ["Quill", "Megaphone", "Radar"], skills: ["Content marketing", "LinkedIn strategy", "SEO optimization", "Brand messaging", "Market research"], authority: ["Can post to LinkedIn", "Can create marketing content", "Can run ad campaigns", "Brand voice decisions", "Content calendar ownership"] },
  friend: { name: "Friend", role: "Companion", title: "Support & Assistance", emoji: "👋", model: "claude-sonnet-4.6", department: "Support", reportsTo: "None (independent)", subAgents: [], skills: ["Brainstorming", "Research", "Casual chat", "Task assistance", "Creative thinking"], authority: ["General assistant", "No fleet authority", "No approval/personnel authority", "Can research and create notes"] },
};

function safeRead(path: string): string {
  try { return readFileSync(path, "utf-8"); } catch { return ""; }
}

function countFiles(dir: string): { files: number; totalSize: number; folders: string[] } {
  let files = 0;
  let totalSize = 0;
  const folders: string[] = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".cache" || entry.name === ".npm" || entry.name === ".local") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        folders.push(entry.name);
        try {
          const sub = readdirSync(full, { withFileTypes: true });
          files += sub.filter(s => s.isFile()).length;
          sub.filter(s => s.isFile()).forEach(s => {
            try { totalSize += statSync(join(full, s.name)).size; } catch {}
          });
        } catch {}
      } else {
        files++;
        try { totalSize += statSync(full).size; } catch {}
      }
    }
  } catch {}
  return { files, totalSize, folders };
}

function getMemoryFiles(dir: string): { name: string; size: number; modified: string; preview: string }[] {
  const memDir = join(dir, "memory");
  try {
    const entries = readdirSync(memDir, { withFileTypes: true });
    return entries
      .filter(e => e.isFile() && e.name.endsWith(".md"))
      .map(e => {
        const full = join(memDir, e.name);
        const stat = statSync(full);
        const content = safeRead(full);
        return {
          name: e.name,
          size: stat.size,
          modified: stat.mtime.toISOString(),
          preview: content.slice(0, 300),
        };
      })
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch { return []; }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const agentId = url.searchParams.get("id");
  
  if (!agentId) {
    const agents = Object.entries(AGENT_META).map(([id, meta]) => {
      const dir = join(AGENTS_ROOT, id);
      const soul = safeRead(join(dir, "SOUL.md"));
      const memory = safeRead(join(dir, "MEMORY.md"));
      const stats = countFiles(dir);
      return {
        id,
        ...meta,
        soulLines: soul.split("\n").length,
        soulPreview: soul.slice(0, 200),
        memoryLines: memory.split("\n").length,
        memoryWords: memory.split(/\s+/).filter(Boolean).length,
        fileCount: stats.files,
        totalSize: stats.totalSize,
        topFolders: stats.folders.slice(0, 10),
        hasSOUL: soul.length > 0,
        hasMEMORY: memory.length > 0,
        hasHEARTBEAT: safeRead(join(dir, "HEARTBEAT.md")).length > 0,
        hasIDENTITY: safeRead(join(dir, "IDENTITY.md")).length > 0,
        hasDECISIONS: safeRead(join(dir, "DECISIONS.md")).length > 0,
      };
    });
    return NextResponse.json({ agents });
  }

  const meta = AGENT_META[agentId];
  if (!meta) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const dir = join(AGENTS_ROOT, agentId);
  const soul = safeRead(join(dir, "SOUL.md"));
  const memory = safeRead(join(dir, "MEMORY.md"));
  const heartbeat = safeRead(join(dir, "HEARTBEAT.md"));
  const identity = safeRead(join(dir, "IDENTITY.md"));
  const decisions = safeRead(join(dir, "DECISIONS.md"));
  const tools = safeRead(join(dir, "TOOLS.md"));
  const stats = countFiles(dir);
  const memoryFiles = getMemoryFiles(dir);

  return NextResponse.json({
    id: agentId,
    ...meta,
    soul,
    memory,
    heartbeat,
    identity,
    decisions,
    tools,
    stats,
    memoryFiles,
    hasDocs: {
      soul: soul.length > 0,
      memory: memory.length > 0,
      heartbeat: heartbeat.length > 0,
      identity: identity.length > 0,
      decisions: decisions.length > 0,
      tools: tools.length > 0,
    },
  });
}
