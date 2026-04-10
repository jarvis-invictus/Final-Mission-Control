import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const AGENTS_ROOT = process.env.AGENTS_WORKSPACE_ROOT || "/workspace/agents";

const KEY_FILES = ["SOUL.md", "MEMORY.md", "IDENTITY.md", "HEARTBEAT.md", "AGENTS.md", "TOOLS.md", "DECISIONS.md", "BOOT.md"];

const AGENT_META: Record<string, { emoji: string; role: string }> = {
  elon: { emoji: "🎖️", role: "Fleet Commander" },
  jordan: { emoji: "📞", role: "CRO Sales" },
  gary: { emoji: "📣", role: "CMO Marketing" },
  linus: { emoji: "⚙️", role: "CTO Engineering" },
  friend: { emoji: "👋", role: "Companion" },
};

function countFiles(dir: string, depth = 0): { count: number; totalSize: number } {
  if (depth > 3) return { count: 0, totalSize: 0 };
  let count = 0;
  let totalSize = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = countFiles(fullPath, depth + 1);
        count += sub.count;
        totalSize += sub.totalSize;
      } else {
        count++;
        try {
          const stat = fs.statSync(fullPath);
          totalSize += stat.size;
        } catch { /* skip */ }
      }
    }
  } catch { /* skip */ }
  return { count, totalSize };
}

export async function GET() {
  try {
    if (!fs.existsSync(AGENTS_ROOT)) {
      return NextResponse.json({ agents: [], error: "Workspace root not found" }, { status: 404 });
    }

    const dirs = fs.readdirSync(AGENTS_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith("."));

    const agents = dirs.map(d => {
      const agentDir = path.join(AGENTS_ROOT, d.name);
      const { count, totalSize } = countFiles(agentDir);
      const keyFilesPresent = KEY_FILES.filter(f => fs.existsSync(path.join(agentDir, f)));
      const meta = AGENT_META[d.name] || { emoji: "🤖", role: "Agent" };

      // Read first paragraph of SOUL.md if present
      let soulPreview = "";
      const soulPath = path.join(agentDir, "SOUL.md");
      if (fs.existsSync(soulPath)) {
        try {
          const content = fs.readFileSync(soulPath, "utf-8");
          const lines = content.split("\n");
          const paragraphs = [];
          let current = "";
          for (const line of lines) {
            if (line.trim() === "") {
              if (current.trim()) paragraphs.push(current.trim());
              current = "";
            } else if (!line.startsWith("#")) {
              current += " " + line;
            }
          }
          if (current.trim()) paragraphs.push(current.trim());
          soulPreview = (paragraphs[0] || "").slice(0, 300);
        } catch { /* skip */ }
      }

      return {
        id: d.name,
        name: d.name.charAt(0).toUpperCase() + d.name.slice(1),
        emoji: meta.emoji,
        role: meta.role,
        fileCount: count,
        totalSize,
        keyFiles: keyFilesPresent,
        soulPreview,
      };
    });

    return NextResponse.json({ agents });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to scan workspaces" },
      { status: 500 }
    );
  }
}
