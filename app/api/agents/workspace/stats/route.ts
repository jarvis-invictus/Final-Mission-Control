import { NextRequest, NextResponse } from "next/server";
import { readdirSync, statSync } from "fs";
import { join, extname } from "path";

export const dynamic = "force-dynamic";

const AGENTS_ROOT = process.env.AGENTS_WORKSPACE_ROOT || "/workspace/agents";

interface FileTypeStat {
  extension: string;
  count: number;
  totalSize: number;
}

interface FolderStat {
  name: string;
  fileCount: number;
  totalSize: number;
  types: Record<string, number>;
}

function walkDir(dir: string, maxDepth: number = 3, depth: number = 0): { files: { name: string; ext: string; size: number; modified: string; path: string }[] } {
  const result: { name: string; ext: string; size: number; modified: string; path: string }[] = [];
  if (depth > maxDepth) return { files: result };

  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === ".next" || entry.name === ".cache" || entry.name === ".npm" || entry.name === ".local") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = walkDir(full, maxDepth, depth + 1);
        result.push(...sub.files);
      } else {
        try {
          const stat = statSync(full);
          const ext = extname(entry.name).toLowerCase() || "(no ext)";
          result.push({
            name: entry.name,
            ext,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            path: full.replace(AGENTS_ROOT + "/", ""),
          });
        } catch {}
      }
    }
  } catch {}
  return { files: result };
}

export async function GET(req: NextRequest) {
  const agentId = new URL(req.url).searchParams.get("agent");

  if (agentId) {
    const dir = join(AGENTS_ROOT, agentId);
    const { files } = walkDir(dir);

    const typeMap: Record<string, { count: number; totalSize: number }> = {};
    for (const f of files) {
      if (!typeMap[f.ext]) typeMap[f.ext] = { count: 0, totalSize: 0 };
      typeMap[f.ext].count++;
      typeMap[f.ext].totalSize += f.size;
    }

    const types: FileTypeStat[] = Object.entries(typeMap)
      .map(([ext, stat]) => ({ extension: ext, ...stat }))
      .sort((a, b) => b.count - a.count);

    const folderMap: Record<string, FolderStat> = {};
    for (const f of files) {
      const parts = f.path.split("/");
      const folder = parts.length > 2 ? parts[1] : "(root)";
      if (!folderMap[folder]) folderMap[folder] = { name: folder, fileCount: 0, totalSize: 0, types: {} };
      folderMap[folder].fileCount++;
      folderMap[folder].totalSize += f.size;
      folderMap[folder].types[f.ext] = (folderMap[folder].types[f.ext] || 0) + 1;
    }

    const folders: FolderStat[] = Object.values(folderMap).sort((a, b) => b.fileCount - a.fileCount);

    const nicheKeywords = ["dental", "salon", "ca-", "restaurant", "gym", "clinic", "derma", "physio", "yoga", "hotel", "pharmacy", "labs", "lawyer", "realestate", "wedding", "optician", "pet", "photography", "tutor", "travel", "coaching", "interior", "autoservice", "events", "jeweller"];
    const nicheMap: Record<string, number> = {};
    for (const f of files) {
      const lower = f.name.toLowerCase();
      for (const niche of nicheKeywords) {
        if (lower.includes(niche)) {
          nicheMap[niche] = (nicheMap[niche] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      agent: agentId,
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      types,
      folders: folders.slice(0, 30),
      niches: Object.entries(nicheMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    });
  }

  const agents: string[] = [];
  try {
    const entries = readdirSync(AGENTS_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) agents.push(entry.name);
    }
  } catch {}

  const summaries = agents.map(id => {
    const dir = join(AGENTS_ROOT, id);
    const { files } = walkDir(dir, 2);
    const typeMap: Record<string, number> = {};
    for (const f of files) {
      typeMap[f.ext] = (typeMap[f.ext] || 0) + 1;
    }
    return {
      agent: id,
      totalFiles: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      topTypes: Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([ext, count]) => ({ ext, count })),
    };
  });

  return NextResponse.json({ agents: summaries });
}
