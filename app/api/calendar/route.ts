import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = "/app/data";
const EVENTS_FILE = DATA_DIR + "/calendar-events.json";

const GHL_KEY = process.env.GHL_API_KEY || "pit-b67e8052-7423-4cc9-abbe-3a5cd5b89df8";
const GHL_LOC = process.env.GHL_LOCATION_ID || "AVBEYuMBQNnuxogWO6YQ";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  endTime?: string;
  type: "meeting" | "task" | "deadline" | "reminder" | "content";
  priority?: "P0" | "P1" | "P2" | "P3";
  assignee?: string;
  status?: "scheduled" | "done" | "cancelled";
  description?: string;
  source?: "manual" | "ghl" | "system";
  client?: string;
}

function loadEvents(): CalendarEvent[] {
  try {
    if (existsSync(EVENTS_FILE)) return JSON.parse(readFileSync(EVENTS_FILE, "utf-8"));
  } catch {}

  // Seed with meaningful events
  const today = new Date().toISOString().slice(0, 10);
  const seed: CalendarEvent[] = [
    {
      id: "sys-warmup-start",
      title: "Email Domain Warmup Started",
      date: "2026-04-12",
      time: "15:18",
      type: "task",
      priority: "P1",
      assignee: "Elon",
      status: "done",
      description: "21-day warmup across 3 outreach domains (invictusai.site, .online, .tech)",
      source: "system",
    },
    {
      id: "sys-warmup-end",
      title: "Domain Warmup Complete (Target)",
      date: "2026-05-03",
      type: "deadline",
      priority: "P0",
      assignee: "Elon",
      status: "scheduled",
      description: "All 3 outreach domains should be fully warmed. Ready for cold outreach.",
      source: "system",
    },
    {
      id: "sys-outreach-start",
      title: "Cold Outreach Campaign Launch",
      date: "2026-05-05",
      type: "deadline",
      priority: "P0",
      assignee: "Jordan",
      status: "scheduled",
      description: "Begin sending cold emails to dental prospects. 50-100/day capacity.",
      source: "system",
    },
  ];
  saveEvents(seed);
  return seed;
}

function saveEvents(events: CalendarEvent[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
  } catch {}
}

async function fetchGHLAppointments(): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  try {
    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 86400000).toISOString();
    const endTime = new Date(now.getTime() + 60 * 86400000).toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      "https://services.leadconnectorhq.com/calendars/events?locationId=" + GHL_LOC + "&startTime=" + startTime + "&endTime=" + endTime,
      {
        headers: {
          Authorization: "Bearer " + GHL_KEY,
          Version: "2021-07-28",
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      for (const e of (data.events || [])) {
        const start = e.startTime ? new Date(e.startTime) : now;
        events.push({
          id: "ghl-" + e.id,
          title: e.title || e.name || "GHL Appointment",
          date: start.toISOString().slice(0, 10),
          time: start.toTimeString().slice(0, 5),
          type: "meeting",
          status: e.appointmentStatus === "cancelled" ? "cancelled" : "scheduled",
          assignee: "Sahil",
          client: e.contact?.name || e.title,
          description: "Go High Level appointment",
          source: "ghl",
        });
      }
    }
  } catch {}
  return events;
}

export async function GET(): Promise<any> {
  // Load local events + GHL appointments
  const localEvents = loadEvents();
  const ghlEvents = await fetchGHLAppointments();
  const allEvents = [...localEvents, ...ghlEvents];

  // Sort by date
  allEvents.sort((a, b) => a.date.localeCompare(b.date));

  const today = new Date().toISOString().slice(0, 10);
  const summary = {
    total: allEvents.length,
    upcoming: allEvents.filter(e => e.date >= today && e.status !== "cancelled" && e.status !== "done").length,
    overdue: allEvents.filter(e => e.date < today && e.status === "scheduled").length,
    ghl: ghlEvents.length,
  };

  return NextResponse.json({ events: allEvents, summary });
}

export async function POST(req: NextRequest): Promise<any> {
  const body = await req.json();
  const { action } = body;

  if (action === "create") {
    const event: CalendarEvent = {
      id: "evt-" + Date.now(),
      title: body.title || "Untitled Event",
      date: body.date || new Date().toISOString().slice(0, 10),
      time: body.time,
      endTime: body.endTime,
      type: body.type || "task",
      priority: body.priority,
      assignee: body.assignee || "Sahil",
      status: "scheduled",
      description: body.description,
      source: "manual",
      client: body.client,
    };
    const events = loadEvents();
    events.push(event);
    saveEvents(events);
    return NextResponse.json({ event, total: events.length });
  }

  if (action === "update") {
    const events = loadEvents();
    const idx = events.findIndex(e => e.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    events[idx] = { ...events[idx], ...body, id: events[idx].id, source: events[idx].source };
    saveEvents(events);
    return NextResponse.json({ event: events[idx] });
  }

  if (action === "delete") {
    const events = loadEvents();
    const filtered = events.filter(e => e.id !== body.id);
    saveEvents(filtered);
    return NextResponse.json({ deleted: body.id, remaining: filtered.length });
  }

  if (action === "markDone") {
    const events = loadEvents();
    const idx = events.findIndex(e => e.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    events[idx].status = "done";
    saveEvents(events);
    return NextResponse.json({ event: events[idx] });
  }

  return NextResponse.json({ error: "Unknown action. Use: create, update, delete, markDone" }, { status: 400 });
}
