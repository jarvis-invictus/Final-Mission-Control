import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const AGENTS_ROOT = process.env.AGENTS_WORKSPACE_ROOT || "/workspace/agents";

interface FileEntry {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

function scanDir(dir: string, basePath: string, depth = 0, maxDepth = 3): FileEntry[] {
  if (depth > maxDepth) return [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter(e => !e.name.startsWith("."))
      .sort((a, b) => {
        // Directories first, then alphabetical
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map(e => {
        const fullPath = path.join(dir, e.name);
        const relPath = basePath ? `${basePath}/${e.name}` : e.name;
        try {
          const stat = fs.statSync(fullPath);
          const entry: FileEntry = {
            name: e.name,
            path: relPath,
            size: stat.size,
            modified: stat.mtime.toISOString(),
            isDirectory: e.isDirectory(),
          };
          if (e.isDirectory()) {
            entry.children = scanDir(fullPath, relPath, depth + 1, maxDepth);
          }
          return entry;
        } catch {
          return {
            name: e.name,
            path: relPath,
            size: 0,
            modified: new Date().toISOString(),
            isDirectory: e.isDirectory(),
          };
        }
      });
  } catch {
    return [];
  }
}

export async function GET(
  request: Request,
  { params }: { params: { agent: string } }
) {
  const agent = params.agent;
  const agentDir = path.join(AGENTS_ROOT, agent);

  // Security: validate agent name
  if (/[./\\]/.test(agent) || agent.startsWith(".")) {
    return NextResponse.json({ error: "Invalid agent name" }, { status: 400 });
  }

  if (!fs.existsSync(agentDir)) {
    return NextResponse.json({ error: "Agent workspace not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const subPath = url.searchParams.get("path") || "";

  // Security: validate subpath
  if (subPath.includes("..") || path.isAbsolute(subPath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const targetDir = subPath ? path.join(agentDir, subPath) : agentDir;

  if (!fs.existsSync(targetDir)) {
    return NextResponse.json({ error: "Path not found" }, { status: 404 });
  }

  const files = scanDir(targetDir, subPath);

  return NextResponse.json({
    agent,
    path: subPath || "/",
    files,
  });
}
