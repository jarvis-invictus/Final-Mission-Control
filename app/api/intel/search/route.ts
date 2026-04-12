import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

async function gemini(prompt: string, maxTokens = 4000): Promise<string> {
  if (!GEMINI_KEY) return "⚠️ GEMINI_API_KEY not configured.";

  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
  const maxRetries = 3;

  for (const model of models) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 3000 * attempt));

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: maxTokens, temperature: 0.6 },
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timer);

        const raw = await res.text();

        if (!res.ok) {
          let errCode = 0;
          try { errCode = JSON.parse(raw)?.error?.code || 0; } catch {}
          if (errCode === 429 || errCode === 503) continue; // Retry
          if (errCode === 403) return "⚠️ API key issue — check Gemini API configuration.";
          continue;
        }

        const data = JSON.parse(raw);
        const parts: any[] = data.candidates?.[0]?.content?.parts || [];
        const text = parts.filter((p: any) => !p.thought && p.text).map((p: any) => p.text).join("");
        if (text) return text;
      } catch {
        continue;
      }
    }
  }
  return "⏳ Gemini is temporarily rate-limited (free tier: 15 requests/minute). Wait 60 seconds and try again. To remove this limit, upgrade the Gemini API key to paid tier at https://ai.google.dev/pricing";
}

function parseJsonArray(result: string): any[] | null {
  let cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const startIdx = cleaned.indexOf("[");
  if (startIdx < 0) return null;

  let endIdx = cleaned.lastIndexOf("]");
  if (endIdx <= startIdx) {
    // Truncated response — try to fix
    const lastObj = cleaned.lastIndexOf("}");
    if (lastObj > startIdx) {
      cleaned = cleaned.slice(0, lastObj + 1) + "]";
      endIdx = cleaned.length - 1;
    } else return null;
  }

  try {
    return JSON.parse(cleaned.slice(startIdx, endIdx + 1));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, query, topic } = body;

    if (action === "search") {
      if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
      const prompt = `You are an elite AI business intelligence analyst. Research this topic and provide detailed, actionable analysis with specific numbers, company names, URLs, recent developments (2025-2026). Format with markdown (## sections, **bold**, bullet points). No fluff.\n\nTopic: ${query}`;
      const result = await gemini(prompt, 3000);
      return NextResponse.json({ query, aiAnalysis: result, timestamp: new Date().toISOString() });
    }

    if (action === "generate-feed") {
      const category = topic || "ai-market-indian";
      let prompt = "";

      if (category === "ai-market-indian") {
        prompt = `Generate 4 specific Indian AI market news items (April 2026). Real company names, numbers, events. Cover: startups, government policy, Indian language AI, infrastructure. Return ONLY JSON array:\n[{"title":"headline","summary":"3-4 sentences","source":"URL","importance":"hot|notable|useful","category":"indian"}]`;
      } else if (category === "ai-market-global") {
        prompt = `Generate 4 specific global AI market items (April 2026). Real names, numbers. Cover: model releases, funding, regulation, dev tools. Return ONLY JSON array:\n[{"title":"headline","summary":"3-4 sentences","source":"URL","importance":"hot|notable|useful","category":"global"}]`;
      } else if (category === "tools") {
        prompt = `Generate 4 useful tools/platforms for a tech agency (2026). Mix self-hosted, open-source, AI tools, dev platforms. Include pricing, GitHub stars. Return ONLY JSON array:\n[{"title":"Name — description","summary":"3-4 sentences","source":"URL","importance":"hot|notable|useful","category":"tools"}]`;
      } else if (category === "startups") {
        prompt = `Generate 4 interesting startups (AI/SaaS, India+global). Include funding, tech stack. Return ONLY JSON array:\n[{"title":"Name — description","summary":"3-4 sentences","source":"URL","importance":"hot|notable|useful","category":"startups"}]`;
      } else {
        return NextResponse.json({ error: "Unknown category" }, { status: 400 });
      }

      const result = await gemini(prompt, 2000);
      
      // Check if it's a rate limit message
      if (result.startsWith("⏳") || result.startsWith("⚠️")) {
        return NextResponse.json({ error: result }, { status: 429 });
      }

      const items = parseJsonArray(result);
      if (items && items.length > 0) {
        const enriched = items.map((item: any) => ({
          ...item,
          id: "gen-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
          dateAdded: new Date().toISOString(),
        }));
        return NextResponse.json({ items: enriched, category });
      }
      return NextResponse.json({ error: "Could not parse AI response", raw: result.slice(0, 800) }, { status: 500 });
    }

    if (action === "deep-dive") {
      if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
      const prompt = `Comprehensive analysis of: "${query}"\n\nInclude: Overview, Current State (2025-2026), Key Players, Market Size, Technical Details, Strengths/Weaknesses, Alternatives, Opportunities for an AI web agency, Future Outlook.\n\nUse specific data, markdown formatting.`;
      const result = await gemini(prompt, 4000);
      return NextResponse.json({ query, analysis: result, timestamp: new Date().toISOString() });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Server error: " + e.message }, { status: 500 });
  }
}
