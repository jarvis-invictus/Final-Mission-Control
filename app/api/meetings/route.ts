import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

export const dynamic = "force-dynamic";

const DATA_DIR = "/workspace/agents/elon";
const MEETINGS_FILE = `${DATA_DIR}/meetings.json`;

interface Meeting {
  id: string;
  title: string;
  dateTime: string;
  endTime?: string;
  attendees: string[];
  type: "call" | "zoom" | "in-person" | "whatsapp";
  prepNotes: string;
  agenda: { text: string; done: boolean }[];
  notes: string;
  actionItems: string[];
  status: "upcoming" | "past";
}

function load(): Meeting[] {
  try {
    if (existsSync(MEETINGS_FILE)) return JSON.parse(readFileSync(MEETINGS_FILE, "utf-8"));
  } catch {}
  return [];
}

function save(items: Meeting[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(MEETINGS_FILE, JSON.stringify(items, null, 2));
  } catch {}
}

export async function GET(): Promise<any> {
  const meetings = load();
  const now = new Date().toISOString();
  // Auto-move past meetings
  meetings.forEach(m => { if (m.dateTime < now && m.status === "upcoming") m.status = "past"; });
  save(meetings);
  const upcoming = meetings.filter(m => m.status === "upcoming").sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const past = meetings.filter(m => m.status === "past").sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  return NextResponse.json({ upcoming, past, total: meetings.length });
}

export async function POST(req: NextRequest): Promise<any> {
  const body = await req.json();
  const { action } = body;
  const meetings = load();

  if (action === "create") {
    const meeting: Meeting = {
      id: `m-${Date.now()}`,
      title: body.title || "Untitled Meeting",
      dateTime: body.dateTime || new Date().toISOString(),
      endTime: body.endTime,
      attendees: body.attendees || [],
      type: body.type || "call",
      prepNotes: body.prepNotes || "",
      agenda: body.agenda || [],
      notes: "",
      actionItems: [],
      status: "upcoming",
    };
    meetings.push(meeting);
    save(meetings);
    return NextResponse.json({ meeting });
  }

  if (action === "update") {
    const idx = meetings.findIndex(m => m.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    Object.assign(meetings[idx], body.updates || {});
    save(meetings);
    return NextResponse.json({ meeting: meetings[idx] });
  }

  if (action === "delete") {
    const filtered = meetings.filter(m => m.id !== body.id);
    save(filtered);
    return NextResponse.json({ deleted: body.id });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
