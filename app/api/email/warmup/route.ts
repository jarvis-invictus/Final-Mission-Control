import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

export const dynamic = "force-dynamic";

const DATA_DIR = "/app/data";
const WARMUP_STATE_FILE = DATA_DIR + "/warmup-state.json";
const SEND_LOG_FILE = DATA_DIR + "/email-send-log.json";

interface WarmupState {
  status: "idle" | "active" | "paused" | "complete";
  startedAt: string | null;
  pausedAt: string | null;
  targetEmails: string[];  // emails to warm up TO (inter-domain + personal)
  senderDomains: string[]; // from addresses
  dailySchedule: { day: number; limit: number }[];
  notes: string;
}

interface SendLogEntry {
  id: string; from: string; to: string; subject: string;
  status: "sent" | "failed"; error?: string; timestamp: string;
  type: "test" | "warmup" | "outreach";
}

const DEFAULT_STATE: WarmupState = {
  status: "idle",
  startedAt: null,
  pausedAt: null,
  targetEmails: [
    "sahilbagul2003@gmail.com",
    "sahilbagul7641@gmail.com",
    "joyboy7641@gmail.com",
    "movieskatta7641@gmail.com",
    "devil26122003@gmail.com",
    "morerakesh803@gmail.com",
    "alexaunse@gmail.com",
    "sahil.bagul@nmiet.edu.in",
    "jarvis.invictus.ai@gmail.com",
    "clinicops09@gmail.com",
  ],
  senderDomains: [
    "contact@invictus-ai.in",
    "contact@invictusai.site",
    "contact@invictusai.online",
    "contact@invictusai.tech",
    "support@invictusai.site",
    "support@invictusai.online",
    "support@invictusai.tech",
    "info@invictusai.site",
    "info@invictusai.online",
    "info@invictusai.tech",
  ],
  dailySchedule: [
    { day: 1, limit: 2 }, { day: 2, limit: 3 }, { day: 3, limit: 5 },
    { day: 4, limit: 5 }, { day: 5, limit: 8 }, { day: 6, limit: 8 }, { day: 7, limit: 10 },
    { day: 8, limit: 12 }, { day: 9, limit: 15 }, { day: 10, limit: 15 },
    { day: 11, limit: 18 }, { day: 12, limit: 20 }, { day: 13, limit: 20 }, { day: 14, limit: 25 },
    { day: 15, limit: 30 }, { day: 16, limit: 30 }, { day: 17, limit: 35 },
    { day: 18, limit: 40 }, { day: 19, limit: 40 }, { day: 20, limit: 45 }, { day: 21, limit: 50 },
  ],
  notes: "",
};

function loadState(): WarmupState {
  try {
    if (existsSync(WARMUP_STATE_FILE)) {
      const data = JSON.parse(readFileSync(WARMUP_STATE_FILE, "utf-8"));
      return { ...DEFAULT_STATE, ...data };
    }
  } catch {}
  return { ...DEFAULT_STATE };
}

function saveState(state: WarmupState): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(WARMUP_STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

function loadSendLog(): SendLogEntry[] {
  try {
    if (existsSync(SEND_LOG_FILE)) return JSON.parse(readFileSync(SEND_LOG_FILE, "utf-8"));
  } catch {}
  return [];
}

function getWarmupDay(state: WarmupState): number {
  if (!state.startedAt) return 0;
  const start = new Date(state.startedAt);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000)) + 1;
}

function getDailyLimit(state: WarmupState, day: number): number {
  const entry = state.dailySchedule.find(s => s.day === day);
  if (entry) return entry.limit;
  if (day > 21) return 50; // Post-warmup
  return 5; // Default
}

export async function GET(): Promise<any> {
  const state = loadState();
  const log = loadSendLog();
  const currentDay = getWarmupDay(state);
  const dailyLimit = getDailyLimit(state, currentDay);

  // Count today's warmup sends
  const today = new Date().toISOString().slice(0, 10);
  const todayWarmup = log.filter(e => e.timestamp.startsWith(today) && e.type === "warmup");
  const todayTest = log.filter(e => e.timestamp.startsWith(today) && e.type === "test");
  const todaySent = todayWarmup.filter(e => e.status === "sent").length;
  const todayFailed = todayWarmup.filter(e => e.status === "failed").length;

  // Build daily summary for the log table
  const dailySummary: { day: number; date: string; limit: number; sent: number; failed: number; status: string }[] = [];
  if (state.startedAt) {
    const start = new Date(state.startedAt);
    const maxDay = Math.min(currentDay, 21);
    for (let d = 1; d <= maxDay; d++) {
      const dayDate = new Date(start.getTime() + (d - 1) * 86400000);
      const dateStr = dayDate.toISOString().slice(0, 10);
      const dayLogs = log.filter(e => e.timestamp.startsWith(dateStr) && e.type === "warmup");
      dailySummary.push({
        day: d,
        date: dateStr,
        limit: getDailyLimit(state, d),
        sent: dayLogs.filter(e => e.status === "sent").length,
        failed: dayLogs.filter(e => e.status === "failed").length,
        status: d < currentDay ? "done" : d === currentDay ? "active" : "pending",
      });
    }
  }

  return NextResponse.json({
    state: {
      ...state,
      currentDay,
      dailyLimit,
      todaySent,
      todayFailed,
      todayTestCount: todayTest.length,
      remainingToday: Math.max(0, dailyLimit - todaySent),
      isComplete: currentDay > 21 && state.status === "active",
    },
    dailySummary,
    recentLog: log.filter(e => e.type === "warmup" || e.type === "test").slice(0, 30),
  });
}

export async function POST(req: NextRequest): Promise<any> {
  const body = await req.json();
  const { action } = body;
  const state = loadState();

  if (action === "start") {
    if (state.status === "active") {
      return NextResponse.json({ error: "Warmup already active" }, { status: 400 });
    }
    state.status = "active";
    state.startedAt = state.startedAt || new Date().toISOString();
    state.pausedAt = null;
    if (body.targetEmails) state.targetEmails = body.targetEmails;
    saveState(state);
    return NextResponse.json({ success: true, message: "Warmup started", state });
  }

  if (action === "pause") {
    state.status = "paused";
    state.pausedAt = new Date().toISOString();
    saveState(state);
    return NextResponse.json({ success: true, message: "Warmup paused" });
  }

  if (action === "stop") {
    state.status = "idle";
    state.startedAt = null;
    state.pausedAt = null;
    saveState(state);
    return NextResponse.json({ success: true, message: "Warmup stopped and reset" });
  }

  if (action === "updateTargets") {
    if (body.targetEmails) state.targetEmails = body.targetEmails;
    if (body.senderDomains) state.senderDomains = body.senderDomains;
    saveState(state);
    return NextResponse.json({ success: true, message: "Targets updated" });
  }

  return NextResponse.json({ error: "Unknown action. Use: start, pause, stop, updateTargets" }, { status: 400 });
}
