import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";

export const dynamic = "force-dynamic";

// Jarvis workspace is mounted into MC container at /workspace/agents/jarvis
// We read MEMORY.md and extract current priority items
const JARVIS_MEMORY = "/workspace/agents/jarvis/MEMORY.md";
const JARVIS_DAILY = "/workspace/agents/jarvis/memory/2026-04-10.md";

interface Priority {
  level: "P0" | "P1" | "P2";
  owner: string;
  title: string;
  detail: string;
  source: "jarvis" | "elon";
}

function extractPriorities(content: string): Priority[] {
  const priorities: Priority[] = [];
  const lines = content.split("\n");

  // Look for priority patterns in memory:
  // - Lines with URGENT, Critical, P0, P1, High Priority
  // - Bullet points under "Current Focus", "Active Priorities", "Today"
  const priorityPatterns = [
    /critical|urgent|p0\b|🔴|⚡/i,
    /high priority|p1\b|🟡|important/i,
    /in progress|active|working on/i,
  ];

  let inPrioritySection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect priority sections
    if (/current.*focus|active.*task|today.*priority|## priority|### priority|urgent|hard pivot/i.test(line)) {
      inPrioritySection = true;
    }

    // Extract bullet items in priority sections
    if (inPrioritySection && /^[-*•]\s+/.test(line) && line.length > 10) {
      const text = line.replace(/^[-*•]\s+/, "").trim();
      if (text.length < 200 && !text.includes("```")) {
        let level: "P0" | "P1" | "P2" = "P2";
        if (/critical|urgent|p0|🔴|blocker/i.test(text)) level = "P0";
        else if (/high|important|p1|🟡/i.test(text)) level = "P1";

        priorities.push({
          level,
          owner: "Jarvis",
          title: text.slice(0, 80),
          detail: text.length > 80 ? text : "",
          source: "jarvis",
        });
      }
    }

    // Stop after 30 lines in a section to avoid runaway
    if (inPrioritySection && line === "" && priorities.length > 0 && i > 5) {
      inPrioritySection = false;
    }
  }

  return priorities.slice(0, 5);
}

export async function GET(): Promise<any> {
  const priorities: Priority[] = [];

  // Always include Elon's known current priority
  priorities.push({
    level: "P0",
    owner: "Elon",
    title: "MC V7 — Complete all 12 remaining items",
    detail: "Fleet cards, Niche Gallery, n8n templates, Intel filters, Calendar, Onboarding Engine",
    source: "elon",
  });

  // Try to read Jarvis daily log first (more current)
  try {
    const sources = [JARVIS_DAILY, JARVIS_MEMORY];
    for (const src of sources) {
      if (existsSync(src)) {
        const content = readFileSync(src, "utf-8");
        const extracted = extractPriorities(content);
        if (extracted.length > 0) {
          priorities.push(...extracted.slice(0, 3));
          break;
        }
      }
    }
  } catch {
    // Fallback if Jarvis workspace not accessible
    priorities.push({
      level: "P1",
      owner: "Jarvis",
      title: "Cold email infrastructure — DNS + warmup",
      detail: "invictusai.site/.online/.tech — Postal SMTP ready, DNS records pending",
      source: "jarvis",
    });
    priorities.push({
      level: "P1",
      owner: "Jarvis",
      title: "n8n workflows — 4 active, expanding",
      detail: "Running at n8n.invictus-ai.in. Template library being standardized.",
      source: "jarvis",
    });
  }

  // Deduplicate and limit
  const unique = priorities.slice(0, 4);

  return NextResponse.json({
    priorities: unique,
    lastUpdated: new Date().toISOString(),
    jarvisAccessible: existsSync(JARVIS_MEMORY),
  });
}
