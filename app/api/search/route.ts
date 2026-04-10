import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const DOCS_DIR = "/workspace/docs";
const AGENTS_ROOT = "/workspace/agents";

const PAGES = [
  { title: "Command Center", href: "/", description: "Overview dashboard with metrics, pipeline, fleet status" },
  { title: "CRM Pipeline", href: "/crm", description: "Prospect management, Kanban board, sales pipeline" },
  { title: "Activity Log", href: "/activity", description: "Timeline of agent actions and system events" },
  { title: "Email Center", href: "/email", description: "Email campaigns, warmup tracker, templates" },
  { title: "Demos", href: "/demos", description: "Website demo gallery, client templates, live previews" },
  { title: "Documents", href: "/docs", description: "Document hub, playbooks, strategy docs, SOPs" },
  { title: "Playbooks", href: "/playbooks", description: "Sales playbooks, onboarding scripts, pitch decks" },
  { title: "Agents", href: "/agents", description: "Fleet command, agent profiles, workspace browser" },
  { title: "Team / Org", href: "/team", description: "Team structure, skills, authority, org chart" },
  { title: "Blockers", href: "/blockers", description: "Blocker tracker, severity levels, resolution status" },
  { title: "System Audit", href: "/audit", description: "VPS health, disk, RAM, swap, container status" },
  { title: "SOP: Onboarding", href: "/sop/onboarding", description: "Client onboarding standard operating procedure" },
  { title: "SOP: Fulfillment", href: "/sop/fulfillment", description: "Delivery and fulfillment procedures" },
];

const AGENT_META: Record<string, { name: string; role: string; emoji: string }> = {
  jarvis: { name: "Jarvis", role: "COO", emoji: "🏛️" },
  elon: { name: "Elon", role: "Fleet Commander", emoji: "🎖️" },
  linus: { name: "Linus", role: "CTO", emoji: "⚙️" },
  jordan: { name: "Jordan", role: "CRO", emoji: "📞" },
  gary: { name: "Gary", role: "CMO", emoji: "📣" },
  friend: { name: "Friend", role: "Companion", emoji: "👋" },
};

function safeRead(path: string): string {
  try { return readFileSync(path, "utf-8"); } catch { return ""; }
}

interface SearchResult {
  type: "page" | "doc" | "agent" | "file";
  title: string;
  description: string;
  href: string;
  icon?: string;
  category?: string;
  score: number;
}

function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  
  // Exact match in title = highest
  if (t === q) return 100;
  // Starts with query
  if (t.startsWith(q)) return 90;
  // Contains exact phrase
  if (t.includes(q)) return 80;
  
  // Word-level matching
  const queryWords = q.split(/\s+/);
  const matchedWords = queryWords.filter(w => t.includes(w));
  if (matchedWords.length === queryWords.length) return 70;
  if (matchedWords.length > 0) return 40 + (matchedWords.length / queryWords.length) * 30;
  
  return 0;
}

export async function GET(req: NextRequest) {
  const q = (new URL(req.url)).searchParams.get("q") || "";
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  const results: SearchResult[] = [];
  const query = q.toLowerCase();

  // 1. Search pages
  for (const page of PAGES) {
    const haystack = `${page.title} ${page.description}`;
    const score = fuzzyMatch(query, haystack);
    if (score > 0) {
      results.push({
        type: "page",
        title: page.title,
        description: page.description,
        href: page.href,
        icon: "page",
        score,
      });
    }
  }

  // 2. Search agents
  for (const [id, meta] of Object.entries(AGENT_META)) {
    const haystack = `${meta.name} ${meta.role} ${id}`;
    const score = fuzzyMatch(query, haystack);
    if (score > 0) {
      results.push({
        type: "agent",
        title: `${meta.emoji} ${meta.name}`,
        description: meta.role,
        href: `/agents?profile=${id}`,
        icon: "agent",
        category: "Fleet",
        score,
      });
    }
  }

  // 3. Search docs
  try {
    const entries = readdirSync(DOCS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const filePath = join(DOCS_DIR, entry.name);
      const content = safeRead(filePath);
      if (!content) continue;

      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch
        ? titleMatch[1].trim()
        : entry.name.replace(/\.md$/, "").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      
      const preview = content.replace(/^#+\s+.+$/gm, "").replace(/[#*_>`\[\]]/g, "").trim().slice(0, 150);
      const haystack = `${entry.name} ${title} ${content.slice(0, 2000)}`;
      const score = fuzzyMatch(query, haystack);

      if (score > 0) {
        results.push({
          type: "doc",
          title,
          description: preview,
          href: `/docs?doc=${entry.name.replace(/\.md$/, "")}`,
          icon: "doc",
          category: categorize(entry.name),
          score: Math.min(score, 85), // docs max slightly below exact page match
        });
      }
    }
  } catch {}

  // 4. Search agent workspace files (top-level only for speed)
  for (const [id, meta] of Object.entries(AGENT_META)) {
    const dir = join(AGENTS_ROOT, id);
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        if (entry.name.startsWith(".")) continue;
        const nameScore = fuzzyMatch(query, entry.name);
        if (nameScore > 30) {
          results.push({
            type: "file",
            title: entry.name,
            description: `${meta.emoji} ${meta.name}'s workspace`,
            href: `/agents?profile=${id}`,
            icon: "file",
            category: meta.name,
            score: Math.min(nameScore, 75),
          });
        }
      }
    } catch {}
  }

  // Sort by score descending, limit to 20
  results.sort((a, b) => b.score - a.score);
  const limited = results.slice(0, 20);

  return NextResponse.json({ results: limited, query: q, total: results.length });
}

function categorize(filename: string): string {
  const f = filename.toLowerCase();
  if (/^(warren-|master-|decisions-)/.test(f)) return "Strategy";
  if (/^(jordan-|outreach-|prospect-|cold-)/.test(f)) return "Sales";
  if (/^(gary-|content-|linkedin-|social-)/.test(f)) return "Marketing";
  if (/^(linus-|deploy-|docker-|api-)/.test(f)) return "Engineering";
  if (/^dental-/.test(f)) return "Dental";
  if (/^(jeff-|onboarding-|fulfillment-|sop-)/.test(f)) return "Delivery";
  if (/^(elon-|mc-|mission-)/.test(f)) return "Operations";
  return "Other";
}
