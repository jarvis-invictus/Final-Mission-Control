import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const AGENTS_ROOT = process.env.AGENTS_WORKSPACE_ROOT || "/workspace/agents";

function validatePath(filePath: string): boolean {
  if (!filePath) return false;
  if (filePath.includes("..")) return false;
  if (path.isAbsolute(filePath)) return false;
  if (filePath.startsWith("/")) return false;
  return true;
}

export async function GET(
  request: Request,
  { params }: { params: { agent: string } }
) {
  const agent = params.agent;

  if (/[./\\]/.test(agent.replace(/[a-z0-9-]/gi, ""))) {
    return NextResponse.json({ error: "Invalid agent name" }, { status: 400 });
  }

  const url = new URL(request.url);
  const filePath = url.searchParams.get("path") || "";

  if (!validatePath(filePath)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const fullPath = path.join(AGENTS_ROOT, agent, filePath);

  // Ensure we're still within the agent's workspace
  const resolvedPath = path.resolve(fullPath);
  const resolvedRoot = path.resolve(path.join(AGENTS_ROOT, agent));
  if (!resolvedPath.startsWith(resolvedRoot)) {
    return NextResponse.json({ error: "Path traversal detected" }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      return NextResponse.json({ error: "Path is a directory" }, { status: 400 });
    }

    const content = fs.readFileSync(fullPath, "utf-8");

    return NextResponse.json({
      filename: path.basename(filePath),
      path: filePath,
      content,
      size: stat.size,
      modified: stat.mtime.toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read file" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { agent: string } }
) {
  const agent = params.agent;

  if (/[./\\]/.test(agent.replace(/[a-z0-9-]/gi, ""))) {
    return NextResponse.json({ error: "Invalid agent name" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { path: filePath, content } = body;

    if (!filePath || typeof content !== "string") {
      return NextResponse.json({ error: "Missing path or content" }, { status: 400 });
    }

    if (!validatePath(filePath)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // Only allow .md files for now
    if (!filePath.endsWith(".md")) {
      return NextResponse.json({ error: "Only .md files can be edited" }, { status: 400 });
    }

    const fullPath = path.join(AGENTS_ROOT, agent, filePath);

    // Ensure we're still within the agent's workspace
    const resolvedPath = path.resolve(fullPath);
    const resolvedRoot = path.resolve(path.join(AGENTS_ROOT, agent));
    if (!resolvedPath.startsWith(resolvedRoot)) {
      return NextResponse.json({ error: "Path traversal detected" }, { status: 403 });
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, content, "utf-8");

    const stat = fs.statSync(fullPath);

    return NextResponse.json({
      success: true,
      size: stat.size,
      modified: stat.mtime.toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to write file" },
      { status: 500 }
    );
  }
}
