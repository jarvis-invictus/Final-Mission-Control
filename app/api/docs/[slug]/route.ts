import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DOCS_DIR = (() => {
  for (const d of [process.env.DOCS_PATH, "/workspace/docs", "/data/.openclaw/workspace/docs"]) {
    if (d && fs.existsSync(d)) return d;
  }
  return "/workspace/docs";
})();

const AGENTS_BASE = "/workspace/agents";
const AGENT_NAMES = ["elon", "jordan", "gary", "linus", "friend", "jarvis"];

function sanitizeSlug(slug: string): boolean {
  return !(!slug || /[\/\\]/.test(slug) || slug.includes("..") || slug.startsWith("."));
}

/**
 * Resolve slug to file path. Supports:
 * - "agent__filename" → /workspace/agents/<agent>/filename.md or /workspace/agents/<agent>/docs/filename.md
 * - "filename" → /workspace/docs/filename.md (shared)
 */
function resolveDoc(slug: string): { path: string; agent: string } | null {
  // Agent-specific slug: "agent__filename"
  const agentMatch = slug.match(/^([a-z]+)__(.+)$/);
  if (agentMatch) {
    const [, agentId, filename] = agentMatch;
    if (!AGENT_NAMES.includes(agentId)) return null;

    // Try agent root first (SOUL.md, MEMORY.md, etc.)
    const rootPath = path.join(AGENTS_BASE, agentId, `${filename}.md`);
    if (fs.existsSync(rootPath)) return { path: rootPath, agent: agentId };

    // Try agent docs/ subfolder
    const docsPath = path.join(AGENTS_BASE, agentId, "docs", `${filename}.md`);
    if (fs.existsSync(docsPath)) return { path: docsPath, agent: agentId };

    // Try agent skills/ subfolder
    const skillsPath = path.join(AGENTS_BASE, agentId, "skills");
    if (fs.existsSync(skillsPath)) {
      // Check each skill dir for SKILL.md or the filename
      try {
        const skillDirs = fs.readdirSync(skillsPath, { withFileTypes: true });
        for (const d of skillDirs) {
          if (!d.isDirectory()) continue;
          const fp = path.join(skillsPath, d.name, `${filename}.md`);
          if (fs.existsSync(fp)) return { path: fp, agent: agentId };
          // Also check if the slug is the skill name and serve SKILL.md
          if (d.name === filename) {
            const skillMd = path.join(skillsPath, d.name, "SKILL.md");
            if (fs.existsSync(skillMd)) return { path: skillMd, agent: agentId };
          }
        }
      } catch {}
    }

    // Try memory/ subfolder
    const memoryPath = path.join(AGENTS_BASE, agentId, "memory", `${filename}.md`);
    if (fs.existsSync(memoryPath)) return { path: memoryPath, agent: agentId };

    return null;
  }

  // Shared docs
  const sharedPath = path.join(DOCS_DIR, `${slug}.md`);
  const resolved = path.resolve(sharedPath);
  const docsResolved = path.resolve(DOCS_DIR);
  if (!resolved.startsWith(docsResolved + path.sep) && resolved !== docsResolved) return null;
  if (fs.existsSync(resolved)) return { path: resolved, agent: "shared" };

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!sanitizeSlug(slug) && !slug.includes("__")) {
      return NextResponse.json({ error: "Invalid document slug" }, { status: 400 });
    }

    const resolved = resolveDoc(slug);
    if (!resolved) {
      return NextResponse.json(
        { error: `Document not found: ${slug}`, docsPath: DOCS_DIR },
        { status: 404 }
      );
    }

    const content = fs.readFileSync(resolved.path, "utf-8");
    const stat = fs.statSync(resolved.path);

    return NextResponse.json({
      slug,
      filename: path.basename(resolved.path),
      content,
      size: stat.size,
      modified: stat.mtime.toISOString(),
      agent: resolved.agent,
    });
  } catch (err) {
    console.error("[docs/slug API] Error:", err);
    return NextResponse.json({ error: "Failed to read document" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const resolved = resolveDoc(slug);
    if (!resolved) {
      return NextResponse.json({ error: `Document not found: ${slug}` }, { status: 404 });
    }

    const body = await req.json();
    if (typeof body.content !== "string") {
      return NextResponse.json({ error: "Missing content field" }, { status: 400 });
    }

    fs.writeFileSync(resolved.path, body.content, "utf-8");
    const stat = fs.statSync(resolved.path);

    return NextResponse.json({
      slug,
      filename: path.basename(resolved.path),
      size: stat.size,
      modified: stat.mtime.toISOString(),
      success: true,
    });
  } catch (err) {
    console.error("[docs/slug PATCH] Error:", err);
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}
