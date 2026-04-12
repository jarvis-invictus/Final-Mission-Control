import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

export const dynamic = "force-dynamic";

const DATA_DIR = "/workspace/agents/elon";
const INTEL_FILE = DATA_DIR + "/intel-items.json";

interface IntelItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: "ai-news" | "industry-trends" | "competitor-watch" | "opportunities" | "ai-tools" | "lead-gen" | "india-market" | "pricing-intel" | "client-intel" | "regulation" | "automation" | "content-trends" | "funding" | "product-ideas";
  importance: "hot" | "notable" | "reference";
  dateAdded: string;
}

function load(): IntelItem[] {
  try {
    if (existsSync(INTEL_FILE)) return JSON.parse(readFileSync(INTEL_FILE, "utf-8"));
  } catch {}
  const seed: IntelItem[] = [
    { id: "i1", title: "OpenAI launches GPT-5.4 with 10x longer context", summary: "New model supports 2M token context. Game changer for document analysis and code generation.", source: "https://openai.com/blog", category: "ai-news", importance: "hot", dateAdded: "2026-04-10T06:00:00Z" },
    { id: "i2", title: "India SMB SaaS market to hit $50B by 2028", summary: "40% YoY growth in SMB tech adoption, especially Tier 2/3 cities.", source: "https://nasscom.in/reports", category: "industry-trends", importance: "notable", dateAdded: "2026-04-09T12:00:00Z" },
    { id: "i3", title: "Competitor: WebBee.ai raises $12M Series A", summary: "AI website builder for Indian SMBs. Direct competitor in dental/CA space.", source: "https://techcrunch.com", category: "competitor-watch", importance: "hot", dateAdded: "2026-04-08T08:00:00Z" },
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

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
  return (2 * overlap) / (wordsA.size + wordsB.size);
}

function dedupItems(items: IntelItem[]): { cleaned: IntelItem[]; removed: number } {
  const dominated = new Set<number>();
  for (let i = 0; i < items.length; i++) {
    if (dominated.has(i)) continue;
    for (let j = i + 1; j < items.length; j++) {
      if (dominated.has(j)) continue;
      if (similarity(items[i].title, items[j].title) > 0.6) {
        dominated.add(j);
      }
    }
  }
  const cleaned = items.filter((_, idx) => !dominated.has(idx));
  return { cleaned, removed: dominated.size };
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
      id: "i-" + Date.now(),
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

  if (action === "dedup") {
    const { cleaned, removed } = dedupItems(items);
    save(cleaned);
    return NextResponse.json({ removed, remaining: cleaned.length });
  }

  if (action === "generate") {
    const OR_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!OR_KEY) return NextResponse.json({ error: "OPENROUTER_API_KEY not set" }, { status: 500 });

    const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const prompt = "Business intelligence analyst for Invictus AI (India — sells AI websites to dental/CA/coaching/law SMBs).\n\nGenerate 8 intel items for " + today + ". Cover: competitor-watch, opportunities, industry-trends, lead-gen, ai-tools, india-market, automation, product-ideas.\n\nReturn ONLY this JSON array (no markdown, no text before or after):\n[{\"title\":\"...\",\"summary\":\"...\",\"source\":\"...\",\"category\":\"...\",\"importance\":\"hot|notable|reference\"}]";

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + OR_KEY,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://control.invictus-ai.in",
          "X-Title": "Invictus MC Intel Engine",
        },
        body: JSON.stringify({
          model: "google/gemma-3-27b-it:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: "OpenRouter error " + res.status + ": " + errText.slice(0, 200) }, { status: 500 });
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = cleanedContent.match(/\[[\s\S]*\]/);
      if (!match) return NextResponse.json({ error: "Model returned no JSON array", raw: content.slice(0, 300) }, { status: 500 });

      const generated: any[] = JSON.parse(match[0]);
      const newItems = generated.map((g: any) => ({
        id: "g-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        title: g.title || "Intel Item",
        summary: g.summary || "",
        source: g.source || "ai-generated",
        category: g.category || "industry-trends",
        importance: g.importance || "notable",
        dateAdded: new Date().toISOString(),
      }));

      const merged = [...newItems, ...items];
      const { cleaned, removed } = dedupItems(merged);
      const final = cleaned.slice(0, 60);
      save(final);
      return NextResponse.json({ generated: newItems.length, deduped: removed, total: final.length });
    } catch (e: any) {
      return NextResponse.json({ error: "Generation failed: " + e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
