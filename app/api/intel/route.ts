import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

export const dynamic = "force-dynamic";

const DATA_DIR = "/workspace/agents/elon";
const INTEL_FILE = `${DATA_DIR}/intel-items.json`;

interface IntelItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: "ai-news" | "industry-trends" | "competitor-watch" | "opportunities";
  importance: "hot" | "notable" | "reference";
  dateAdded: string;
}

function load(): IntelItem[] {
  try {
    if (existsSync(INTEL_FILE)) return JSON.parse(readFileSync(INTEL_FILE, "utf-8"));
  } catch {}
  const seed: IntelItem[] = [
    { id: "i1", title: "OpenAI launches GPT-5.4 with 10x longer context", summary: "New model supports 2M token context. Game changer for document analysis and code generation.", source: "https://openai.com/blog", category: "ai-news", importance: "hot", dateAdded: "2026-04-10T06:00:00Z" },
    { id: "i2", title: "India SMB SaaS market to hit $50B by 2028", summary: "Report shows 40% YoY growth in SMB tech adoption, especially in Tier 2/3 cities.", source: "https://nasscom.in/reports", category: "industry-trends", importance: "notable", dateAdded: "2026-04-09T12:00:00Z" },
    { id: "i3", title: "Competitor: WebBee.ai raises $12M Series A", summary: "AI website builder for Indian SMBs. Direct competitor in dental/CA space. Focus on WhatsApp integration.", source: "https://techcrunch.com", category: "competitor-watch", importance: "hot", dateAdded: "2026-04-08T08:00:00Z" },
  ];
  save(seed);
  return seed;
}

function save(items: IntelItem[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(INTEL_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

export async function GET(): Promise<any> {
  const items = load();
  return NextResponse.json({ items, total: items.length });
}

export async function POST(req: NextRequest): Promise<any> {
  const body = await req.json();
  const { action } = body;
  const items = load();

  if (action === "create") {
    const item: IntelItem = {
      id: `i-${Date.now()}`,
      title: body.title || "Untitled",
      summary: body.summary || "",
      source: body.source || "",
      category: body.category || "ai-news",
      importance: body.importance || "reference",
      dateAdded: new Date().toISOString(),
    };
    items.unshift(item);
    save(items);
    return NextResponse.json({ item, total: items.length });
  }

  if (action === "delete") {
    const filtered = items.filter(i => i.id !== body.id);
    save(filtered);
    return NextResponse.json({ deleted: body.id, remaining: filtered.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
