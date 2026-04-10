import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getDocsDir(): string {
  const candidates = [
    process.env.DOCS_PATH,
    "/workspace/docs",
    "/data/.openclaw/workspace/docs",
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      console.log(`[docs API] Using docs directory: ${dir}`);
      return dir;
    }
  }

  console.warn(`[docs API] No docs directory found. Tried: ${candidates.join(", ")}`);
  return candidates[0] || "/workspace/docs";
}

const DOCS_DIR = getDocsDir();

function categorize(filename: string): string {
  const f = filename.toLowerCase();
  // Strategy
  if (/^(warren-|master-|decisions-|blueprint-)/.test(f)) return "strategy";
  // Sales
  if (/^(jordan-|outreach-|prospect-|cold-)/.test(f)) return "sales";
  // Marketing
  if (/^(gary-|content-|linkedin-|social-)/.test(f)) return "marketing";
  // Engineering
  if (/^(linus-|deploy-|docker-|api-)/.test(f)) return "engineering";
  // Dental
  if (/^dental-/.test(f)) return "dental";
  // Finance
  if (/^(ray-|financial-|pricing-|invoice-)/.test(f)) return "finance";
  // Delivery
  if (/^(jeff-|onboarding-|fulfillment-|sop-)/.test(f)) return "delivery";
  // Product
  if (/^(jony-|design-|template-|ui-)/.test(f)) return "product";
  // Creative
  if (/^(steve-|brand-|copy-|voice-)/.test(f)) return "creative";
  return "other";
}

function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return filename
    .replace(/\.md$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const AGENTS_BASE = "/workspace/agents";
const AGENT_NAMES = ["elon", "jordan", "gary", "linus", "friend", "jarvis"];

type DocEntry = {
  slug: string;
  filename: string;
  title: string;
  category: string;
  agent: string;
  size: number;
  modified: string;
  preview: string;
  wordCount: number;
};

function readDocFile(filePath: string, filename: string, category: string, agent: string): DocEntry | null {
  let stat: fs.Stats;
  try { stat = fs.statSync(filePath); } catch { return null; }

  let content: string;
  try { content = fs.readFileSync(filePath, "utf-8"); } catch { return null; }

  const title = extractTitle(content, filename);
  const preview = content
    .replace(/^#+\s+.+$/gm, "")
    .replace(/[#*_>`\[\]]/g, "")
    .trim()
    .slice(0, 200);

  return {
    slug: `${agent}__${filename.replace(/\.md$/, "")}`,
    filename,
    title,
    category,
    agent,
    size: stat.size,
    modified: stat.mtime.toISOString(),
    preview,
    wordCount: countWords(content),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").toLowerCase();
    const category = (searchParams.get("category") || "").toLowerCase();
    const agentFilter = (searchParams.get("agent") || "").toLowerCase();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "0", 10);

    const docs: DocEntry[] = [];

    // Scan shared docs
    if (fs.existsSync(DOCS_DIR)) {
      let entries: fs.Dirent[] = [];
      try { entries = fs.readdirSync(DOCS_DIR, { withFileTypes: true }); } catch { /* skip */ }

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
        const cat = categorize(entry.name);
        if (category && category !== "all" && cat !== category) continue;
        const doc = readDocFile(path.join(DOCS_DIR, entry.name), entry.name, cat, "shared");
        if (doc) {
          doc.slug = entry.name.replace(/\.md$/, "");
          docs.push(doc);
        }
      }
    }

    // Scan agent workspaces
    for (const agentName of AGENT_NAMES) {
      if (agentFilter && agentFilter !== "all" && agentFilter !== agentName) continue;

      const agentBase = path.join(AGENTS_BASE, agentName);
      if (!fs.existsSync(agentBase)) continue;

      // Top-level .md files (SOUL.md, MEMORY.md, etc.)
      try {
        const topEntries = fs.readdirSync(agentBase, { withFileTypes: true });
        for (const entry of topEntries) {
          if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
          if (category && category !== "all" && category !== "agent-config") continue;
          const doc = readDocFile(path.join(agentBase, entry.name), entry.name, "agent-config", agentName);
          if (doc) docs.push(doc);
        }
      } catch { /* skip */ }

      // docs/ subfolder
      const agentDocsDir = path.join(agentBase, "docs");
      if (fs.existsSync(agentDocsDir)) {
        try {
          const docEntries = fs.readdirSync(agentDocsDir, { withFileTypes: true });
          for (const entry of docEntries) {
            if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
            const cat = categorize(entry.name);
            if (category && category !== "all" && cat !== category) continue;
            const doc = readDocFile(path.join(agentDocsDir, entry.name), entry.name, cat, agentName);
            if (doc) docs.push(doc);
          }
        } catch { /* skip */ }
      }
    }

    // Apply search filter
    const filtered = search
      ? docs.filter((d) => `${d.filename} ${d.title} ${d.preview}`.toLowerCase().includes(search))
      : docs;

    filtered.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    const total = filtered.length;

    if (limit > 0) {
      const start = (page - 1) * limit;
      const paged = filtered.slice(start, start + limit);
      return NextResponse.json({
        docs: paged,
        total,
        page,
        limit,
        hasMore: start + limit < total,
        docsPath: DOCS_DIR,
      });
    }

    return NextResponse.json({ docs: filtered, total, docsPath: DOCS_DIR });
  } catch (err) {
    console.error("[docs API] Unexpected error:", err);
    return NextResponse.json(
      { error: "Failed to read docs", docs: [], total: 0 },
      { status: 500 }
    );
  }
}
