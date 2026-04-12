import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

export const dynamic = "force-dynamic";

/* ============================================
   Email API — domains, sequences, warmup status
   ============================================ */

const DATA_DIR = "/workspace/agents/elon";
const SEQUENCES_FILE = `${DATA_DIR}/email-sequences.json`;

/* Known email domains */
const EMAIL_DOMAINS = [
  { domain: "invictus-ai.in", type: "primary", provider: "Zoho", mx: true, spf: true, dkim: true, dmarc: true, status: "active", warmupDay: 21, warmupTotal: 21 },
  { domain: "invictusai.site", type: "cold-outreach", provider: "Postal SMTP", mx: true, spf: true, dkim: true, dmarc: true, status: "warming", warmupDay: 3, warmupTotal: 21 },
  { domain: "invictusai.online", type: "cold-outreach", provider: "Postal SMTP", mx: true, spf: true, dkim: true, dmarc: true, status: "warming", warmupDay: 3, warmupTotal: 21 },
  { domain: "invictusai.tech", type: "cold-outreach", provider: "Postal SMTP", mx: true, spf: true, dkim: true, dmarc: true, status: "warming", warmupDay: 3, warmupTotal: 21 },
];

/* Default sequences per niche */
const DEFAULT_SEQUENCES: Record<string, any[]> = {
  dental: [
    { day: 0, type: "discovery", subject: "Transform {clinic_name}'s patient bookings with AI", body: "Hi Dr. {name},\n\nI noticed {clinic_name} doesn't have an online booking system. We help dental clinics like yours increase bookings by 40% with AI-powered websites.\n\nWould you be open to a 10-minute call this week?\n\nBest,\nInvictus AI" },
    { day: 3, type: "followup", subject: "Quick follow-up — dental AI demo for {clinic_name}", body: "Hi Dr. {name},\n\nJust following up on my earlier email. Here's a live demo we built for a dental clinic similar to yours: {demo_url}\n\nThe whole setup takes under 48 hours. Want me to show you how it works?\n\nBest,\nInvictus AI" },
    { day: 7, type: "value", subject: "How {city} dental clinics are getting 3x more patients online", body: "Hi Dr. {name},\n\nQuick insight: dental clinics in {city} with professional websites get 3x more inquiries than those relying on Google Maps alone.\n\nWe've helped clinics like yours go from 0 to 50+ monthly online bookings.\n\nShall I share the case study?\n\nBest,\nInvictus AI" },
    { day: 14, type: "breakup", subject: "Closing the loop — {clinic_name}", body: "Hi Dr. {name},\n\nI understand you're busy. I'll close this thread for now.\n\nIf you ever want to explore AI-powered patient acquisition, just reply to this email. The offer stands.\n\nWishing {clinic_name} the best,\nInvictus AI" },
  ],
  ca: [
    { day: 0, type: "discovery", subject: "How CAs in {city} are getting clients online — {firm_name}", body: "Hi {name},\n\nI noticed {firm_name} doesn't have a professional website. We help CA firms attract high-value clients through AI-powered web presence.\n\nOur clients see an average 60% increase in online inquiries within 30 days.\n\nWould a 10-minute call work this week?\n\nBest,\nInvictus AI" },
    { day: 3, type: "followup", subject: "Quick demo for {firm_name} — AI-powered CA website", body: "Hi {name},\n\nFollowing up — here's a live demo for a CA firm like yours: {demo_url}\n\nIt includes GST filing portal, tax calculator, and client portal. Everything a modern CA firm needs.\n\n5 minutes to review?\n\nBest,\nInvictus AI" },
    { day: 7, type: "value", subject: "Why top CAs in {city} are investing in web presence", body: "Hi {name},\n\n78% of businesses search for CAs online before making a call. Without a website, {firm_name} is invisible to these potential clients.\n\nWe make it easy — professional site in 48 hours, fully managed.\n\nInterested?\n\nBest,\nInvictus AI" },
    { day: 14, type: "breakup", subject: "Last note from Invictus AI — {firm_name}", body: "Hi {name},\n\nNo worries if now's not the right time. I'll close this thread.\n\nWhenever you're ready to build {firm_name}'s online presence, just reply here.\n\nAll the best,\nInvictus AI" },
  ],
  education: [
    { day: 0, type: "discovery", subject: "Boost {institute_name}'s enrollment with AI", body: "Hi {name},\n\nI noticed {institute_name} could benefit from a modern web presence. We help coaching institutes and schools increase enrollment by 45% with AI-powered websites.\n\nWould you be open to a quick call?\n\nBest,\nInvictus AI" },
    { day: 3, type: "followup", subject: "Demo for {institute_name} — AI enrollment system", body: "Hi {name},\n\nHere's a demo we built for a coaching institute: {demo_url}\n\nIncludes course catalog, online enrollment, and parent portal.\n\nWant to see how it works?\n\nBest,\nInvictus AI" },
    { day: 7, type: "value", subject: "Parents are searching online for institutes like {institute_name}", body: "Hi {name},\n\n82% of parents research institutes online before enrollment. A professional website is your best salesperson.\n\nWe've helped institutes go from 50 to 200+ inquiries per month.\n\nInterested in a case study?\n\nBest,\nInvictus AI" },
    { day: 14, type: "breakup", subject: "Closing the loop — {institute_name}", body: "Hi {name},\n\nI'll close this thread for now. Whenever you're ready to boost {institute_name}'s enrollment, just reply.\n\nAll the best,\nInvictus AI" },
  ],
  lawyer: [
    { day: 0, type: "discovery", subject: "How {firm_name} can attract more clients online", body: "Hi Advocate {name},\n\nI noticed {firm_name} doesn't have a strong online presence. We help law firms attract premium clients through AI-powered professional websites.\n\n87% of legal clients research lawyers online before hiring. A credible website is essential.\n\nWould a brief call work?\n\nBest,\nInvictus AI" },
    { day: 3, type: "followup", subject: "Demo for {firm_name} — AI-powered legal website", body: "Hi Advocate {name},\n\nHere's a demo we built: {demo_url}\n\nIncludes case specialties, client testimonials, and consultation booking.\n\nWould you like a custom version for {firm_name}?\n\nBest,\nInvictus AI" },
    { day: 7, type: "value", subject: "Why top lawyers in {city} invest in web presence", body: "Hi Advocate {name},\n\nClients searching for '{city} lawyer' see your competitors first. A professional website ensures {firm_name} appears credible and trustworthy online.\n\nWe deliver in 48 hours, fully managed.\n\nShall I share more?\n\nBest,\nInvictus AI" },
    { day: 14, type: "breakup", subject: "Last note — {firm_name}", body: "Hi Advocate {name},\n\nI'll close this thread. When {firm_name} is ready for a professional web presence, just reply.\n\nBest wishes,\nInvictus AI" },
  ],
};

function loadSequences(): Record<string, any[]> {
  try {
    if (existsSync(SEQUENCES_FILE)) {
      return JSON.parse(readFileSync(SEQUENCES_FILE, "utf-8"));
    }
  } catch {}
  return DEFAULT_SEQUENCES;
}

function saveSequences(data: Record<string, any[]>): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SEQUENCES_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

export async function GET(req: NextRequest): Promise<any> {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") || "domains";

  if (section === "domains") {
    return NextResponse.json({ domains: EMAIL_DOMAINS });
  }

  if (section === "sequences") {
    const niche = searchParams.get("niche");
    const sequences = loadSequences();
    if (niche && sequences[niche]) {
      return NextResponse.json({ niche, sequence: sequences[niche] });
    }
    return NextResponse.json({
      niches: Object.keys(sequences),
      sequences,
    });
  }

  return NextResponse.json({ error: "Unknown section" }, { status: 400 });
}

export async function POST(req: NextRequest): Promise<any> {
  const body = await req.json();
  const { action, niche, sequence } = body;

  if (action === "saveSequence" && niche && sequence) {
    const sequences = loadSequences();
    sequences[niche] = sequence;
    saveSequences(sequences);
    return NextResponse.json({ success: true, niche });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
