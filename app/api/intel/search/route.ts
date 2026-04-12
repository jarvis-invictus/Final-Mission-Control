import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OR_KEY = process.env.OPENROUTER_API_KEY || "";

async function searchWeb(query: string): Promise<any[]> {
  // Use web search via a free API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch("https://api.duckduckgo.com/?q=" + encodeURIComponent(query) + "&format=json&no_html=1&skip_disambig=1", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const results: any[] = [];
      if (data.AbstractText) {
        results.push({ title: data.Heading || query, summary: data.AbstractText, source: data.AbstractURL || "DuckDuckGo", type: "summary" });
      }
      for (const topic of (data.RelatedTopics || []).slice(0, 8)) {
        if (topic.Text) {
          results.push({ title: topic.Text.slice(0, 80), summary: topic.Text, source: topic.FirstURL || "", type: "related" });
        }
      }
      return results;
    }
  } catch {}
  return [];
}

async function aiResearch(prompt: string): Promise<string> {
  if (!OR_KEY) return "OpenRouter API key not configured.";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + OR_KEY,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://control.invictus-ai.in",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 3000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "No response.";
    }
    return "API error: " + res.status;
  } catch (e: any) {
    return "Error: " + e.message;
  }
}

export async function POST(req: NextRequest): Promise<any> {
  const body = await req.json();
  const { action, query, topic } = body;

  if (action === "search") {
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

    // AI-powered deep search
    const prompt = "You are an AI business intelligence analyst. Research the following topic and provide detailed, actionable intelligence. Include specific numbers, company names, URLs where possible, and recent developments (2025-2026). Format with clear sections and bullet points.\n\nTopic: " + query;
    const aiResult = await aiResearch(prompt);
    const webResults = await searchWeb(query);

    return NextResponse.json({
      query,
      aiAnalysis: aiResult,
      webResults,
      timestamp: new Date().toISOString(),
    });
  }

  if (action === "generate-feed") {
    const category = topic || "ai-market";
    let prompt = "";

    if (category === "ai-market") {
      prompt = `You are an AI market intelligence analyst. Generate 8 current AI market news items for April 2026. Focus on:
- Major AI model releases and updates
- AI startup funding rounds and acquisitions
- AI regulation and policy changes globally
- Open source AI developments
- AI infrastructure (GPU, cloud, edge)
- AI applications in business automation

For each item provide: title (specific, with company/product names), detailed summary (3-4 sentences with numbers), source URL or publication name, and importance (hot/notable/reference).

Return ONLY a JSON array: [{"title":"...","summary":"...","source":"...","importance":"...","category":"ai-market"}]`;
    } else if (category === "tools") {
      prompt = `You are a self-hosted software expert. Generate 8 items about useful self-hosted tools and platforms that a tech company should know about in 2026. Focus on:
- Self-hosted alternatives to popular SaaS (email, CRM, analytics, automation)
- Unknown but powerful open-source tools
- Developer tools and platforms
- AI/ML self-hosted solutions
- Monitoring, deployment, and DevOps tools
- Communication and collaboration platforms

For each item: title (specific tool name + what it does), detailed summary (3-4 sentences including GitHub stars, tech stack, deployment complexity), source (GitHub URL or official site), importance (hot/notable/reference).

Return ONLY a JSON array: [{"title":"...","summary":"...","source":"...","importance":"...","category":"tools"}]`;
    } else if (category === "startups") {
      prompt = `You are a startup intelligence analyst. Generate 8 items about interesting startups (both well-known and under-the-radar) that are relevant to an AI web agency in 2026. Focus on:
- AI-powered SaaS startups
- Indian tech startups (especially B2B/SMB focused)
- Tools that could be integrated or white-labeled
- Competitors or potential partners
- Startups solving similar problems (websites for SMBs, automation, chatbots)
- YC-backed or bootstrapped gems

For each: title, detailed summary (funding, traction, tech stack), source, importance.

Return ONLY a JSON array: [{"title":"...","summary":"...","source":"...","importance":"...","category":"startups"}]`;
    }

    const result = await aiResearch(prompt);
    try {
      const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        const items = JSON.parse(match[0]).map((item: any) => ({
          ...item,
          id: "gen-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          dateAdded: new Date().toISOString(),
        }));
        return NextResponse.json({ items, category });
      }
    } catch {}
    return NextResponse.json({ error: "Failed to parse AI response", raw: result.slice(0, 500) }, { status: 500 });
  }

  if (action === "deep-dive") {
    if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
    const prompt = "Provide an in-depth analysis of the following topic. Be comprehensive — include history, current state, key players, market size, technical details, pros/cons, alternatives, and future outlook. Use specific numbers, company names, and recent data (2025-2026). Write in a professional but readable style with clear sections.\n\nTopic: " + query;
    const result = await aiResearch(prompt);
    return NextResponse.json({ query, analysis: result, timestamp: new Date().toISOString() });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
