import { NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const CUSTOM_EVENTS_FILE = "/tmp/mc-calendar-events.json";

function loadCustomEvents(): CalendarEvent[] {
  try {
    if (existsSync(CUSTOM_EVENTS_FILE)) {
      return JSON.parse(readFileSync(CUSTOM_EVENTS_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

function saveCustomEvents(evts: CalendarEvent[]) {
  writeFileSync(CUSTOM_EVENTS_FILE, JSON.stringify(evts, null, 2));
}

const GHL_KEY = process.env.GHL_API_KEY || "pit-b67e8052-7423-4cc9-abbe-3a5cd5b89df8";
const GHL_LOC = process.env.GHL_LOCATION_ID || "AVBEYuMBQNnuxogWO6YQ";

export const dynamic = "force-dynamic";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;          // ISO date
  time?: string;         // HH:MM
  endTime?: string;
  type: "meeting" | "task" | "content" | "reminder";
  priority?: "P0" | "P1" | "P2" | "P3";
  assignee?: string;
  status?: "scheduled" | "done" | "cancelled" | "draft" | "published";
  description?: string;
  platform?: string;     // for content: linkedin, blog, twitter
  client?: string;       // for meetings: client name
  niche?: string;
}

function getAgentTasks(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const now = new Date();

  // Parse HEARTBEAT.md for current priorities
  try {
    const hb = readFileSync("/workspace/agents/elon/HEARTBEAT.md", "utf-8");
    if (hb.includes("Niche Selection")) {
      events.push({
        id: "hb-niche",
        title: "Decide 2-3 Focus Niches",
        date: now.toISOString().split("T")[0],
        type: "task",
        priority: "P0",
        assignee: "Sahil",
        status: "scheduled",
        description: "All vertical-building and outreach stalled until niches selected",
      });
    }
    if (hb.includes("pricing") || hb.includes("Pricing")) {
      events.push({
        id: "hb-pricing",
        title: "Define Pricing & Offer",
        date: now.toISOString().split("T")[0],
        type: "task",
        priority: "P0",
        assignee: "Sahil",
        status: "scheduled",
        description: "Sales can't close without pricing tiers",
      });
    }
  } catch {}

  // Parse memory files for recent tasks
  const memDir = "/workspace/agents/elon/memory";
  try {
    if (existsSync(memDir)) {
      const files = readdirSync(memDir).filter(f => f.startsWith("2026-04") && f.endsWith(".md")).sort().reverse().slice(0, 3);
      for (const file of files) {
        const content = readFileSync(join(memDir, file), "utf-8");
        const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : now.toISOString().split("T")[0];

        // Extract time-stamped entries
        const timeEntries = content.matchAll(/##\s+(\d{1,2}:\d{2}\s*(?:AM|PM|IST)?)\s*—?\s*(.+)/gi);
        for (const match of timeEntries) {
          events.push({
            id: `mem-${file}-${match[1]}`,
            title: match[2].replace(/[✅🔧🏆💡⚠️]/g, "").trim().slice(0, 80),
            date,
            time: match[1].replace(/\s*IST/i, "").trim(),
            type: "task",
            status: match[2].includes("✅") ? "done" : "scheduled",
            assignee: "Elon",
          });
        }
      }
    }
  } catch {}

  // Add MC rebuild as ongoing task
  events.push({
    id: "mc-rebuild",
    title: "Mission Control V4/V5 Rebuild",
    date: now.toISOString().split("T")[0],
    type: "task",
    priority: "P1",
    assignee: "Elon",
    status: "scheduled",
    description: "Calendar, doc viewer, demo gallery, GitHub integration",
  });

  // Add domain warmup as upcoming task
  events.push({
    id: "domain-warmup",
    title: "Domain Warmup Plan",
    date: new Date(now.getTime() + 7 * 86400000).toISOString().split("T")[0],
    type: "task",
    priority: "P2",
    assignee: "Jordan",
    status: "scheduled",
    description: "invictus-ai.in needs warming before cold email campaign",
  });

  return events;
}

function getContentCalendar(): CalendarEvent[] {
  // Content events from gary's workspace
  const events: CalendarEvent[] = [];
  const now = new Date();

  events.push({
    id: "content-linkedin-1",
    title: "LinkedIn: Company Launch Post",
    date: now.toISOString().split("T")[0],
    type: "content",
    platform: "linkedin",
    assignee: "Gary",
    status: "draft",
    description: "Announce Invictus AI — AI-powered business solutions for SMBs",
  });

  events.push({
    id: "content-linkedin-2",
    title: "LinkedIn: Dental AI Case Study",
    date: new Date(now.getTime() + 3 * 86400000).toISOString().split("T")[0],
    type: "content",
    platform: "linkedin",
    assignee: "Gary",
    status: "draft",
    description: "How AI chatbot increased dental clinic bookings by 40%",
  });

  return events;
}

async function getGHLAppointments(): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  try {
    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 86400000).toISOString();
    const endTime = new Date(now.getTime() + 60 * 86400000).toISOString();
    const res = await fetch(
      `https://services.leadconnectorhq.com/calendars/events?locationId=${GHL_LOC}&startTime=${startTime}&endTime=${endTime}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_KEY}`,
          Version: "2021-07-28",
          Accept: "application/json",
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      for (const e of (data.events || [])) {
        events.push({
          id: `ghl-${e.id}`,
          title: e.title || e.name || "GHL Appointment",
          date: e.startTime ? new Date(e.startTime).toISOString().split("T")[0] : now.toISOString().split("T")[0],
          time: e.startTime ? new Date(e.startTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : undefined,
          type: "meeting",
          status: e.appointmentStatus === "confirmed" ? "scheduled" : e.appointmentStatus === "cancelled" ? "cancelled" : "scheduled",
          assignee: "GHL",
          client: e.contact?.name || e.title,
          description: `Go High Level appointment · ${e.appointmentStatus || "pending"}`,
        });
      }
    }
  } catch {}
  return events;
}

export async function GET() {
  const events: CalendarEvent[] = [];

  // Gather all events
  events.push(...getAgentTasks());
  events.push(...getContentCalendar());
  
  // GHL appointments
  const ghlAppts = await getGHLAppointments();
  events.push(...ghlAppts);

  // Custom user-created events
  events.push(...loadCustomEvents());

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Group by date
  const byDate: Record<string, CalendarEvent[]> = {};
  for (const e of events) {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push(e);
  }

  // Summary
  const summary = {
    total: events.length,
    meetings: events.filter(e => e.type === "meeting").length,
    tasks: events.filter(e => e.type === "task").length,
    content: events.filter(e => e.type === "content").length,
    reminders: events.filter(e => e.type === "reminder").length,
    overdue: events.filter(e => e.date < new Date().toISOString().split("T")[0] && e.status !== "done").length,
  };

  return NextResponse.json({ events, byDate, summary, timestamp: new Date().toISOString() }, {
    headers: { "Cache-Control": "public, max-age=30" },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, date, time, type, priority, assignee, description, platform, client } = body;

    if (!title || !date || !type) {
      return NextResponse.json({ error: "title, date, and type are required" }, { status: 400 });
    }

    const event: CalendarEvent = {
      id: `custom-${Date.now()}`,
      title,
      date,
      time: time || undefined,
      type,
      priority: priority || undefined,
      assignee: assignee || "Sahil",
      status: "scheduled",
      description: description || undefined,
      platform: platform || undefined,
      client: client || undefined,
    };

    const events = loadCustomEvents();
    events.push(event);
    saveCustomEvents(events);

    return NextResponse.json({ event, total: events.length });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
