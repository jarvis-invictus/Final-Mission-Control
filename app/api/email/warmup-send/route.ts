import { NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

export const dynamic = "force-dynamic";

const DATA_DIR = "/app/data";
const WARMUP_STATE_FILE = DATA_DIR + "/warmup-state.json";
const SEND_LOG_FILE = DATA_DIR + "/email-send-log.json";
const SMTP_HOST = "172.26.0.14";
const SMTP_PORT = 25;

// SMTP creds per sender
const SMTP_CREDS: Record<string, string> = {
  "contact@invictusai.site": "RC4yC51uAUs951W6mQdLeZtq",
  "contact@invictusai.online": "5G51zfT3IOUAIRU7BeJKdpb3",
  "contact@invictusai.tech": "ufjOOadwoJHpdMafmwJvTHvD",
  "support@invictusai.site": "ndUMZFVpp1zHoWK0o12hQ2Pp",
  "support@invictusai.online": "I9NyGftMQMiCGApTIKNiEBBQ",
  "support@invictusai.tech": "3qIvkOJV17iKWds3eeiZxE6o",
  "info@invictusai.site": "0NqemACuSOtu7zaPTocoDrKs",
  "info@invictusai.online": "30IsWoghi7WZJIt3i30qhddz",
  "info@invictusai.tech": "dCPgpxr0h511Vrx1l8ApzMUZ",
};

// Natural email templates — business conversations
const TEMPLATES = [
  { subject: "Quick question about the project timeline", body: "Hi,\n\nThanks for sending over the project brief yesterday. I went through the requirements and I think we can have the first draft ready by Thursday.\n\nOne thing I wanted to clarify — should we prioritize the mobile layout or the desktop version first?\n\nLet me know your thoughts.\n\nBest regards" },
  { subject: "Following up on our discussion", body: "Hi,\n\nJust finished reviewing the competitor analysis you shared. Really interesting findings — especially the point about local SEO being underutilized.\n\nI think we should discuss this in our next sync. Are you available tomorrow afternoon?\n\nCheers" },
  { subject: "Re: next steps for the website project", body: "Hi,\n\nWanted to follow up on the client feedback from last week. I have made the adjustments to the design — new color scheme and updated service descriptions.\n\nCan you take a quick look and let me know if it is ready to share?\n\nThanks" },
  { subject: "Thoughts on the new client onboarding flow?", body: "Hi,\n\nI was going through our client onboarding process and had a few ideas to streamline it. Right now it takes about 3 days from signup to first deliverable — I think we can cut that down significantly.\n\nWould love to brainstorm on this when you have a moment.\n\nBest" },
  { subject: "Re: meeting notes from today", body: "Hi,\n\nGood points raised in today's call. I have noted down the action items:\n\n1. Update the pricing page with the new packages\n2. Finalize the demo site for the next niche\n3. Schedule follow-up with the client\n\nLet me know if I missed anything.\n\nRegards" },
  { subject: "Saw this and thought of our project", body: "Hi,\n\nJust saw a great case study about how a coaching institute grew their enrollment by 40% with a professional website and SEO. Their approach to content marketing was really effective.\n\nMight be worth looking at for our education vertical.\n\nBest" },
  { subject: "Quick update on the market research", body: "Hi,\n\nHope your week is going well. Just wanted to share a quick update — we finished the market analysis and the results are pretty encouraging.\n\nI will put together a summary and share it by end of week.\n\nTalk soon" },
  { subject: "Interesting podcast about AI in business", body: "Hi,\n\nListened to a great podcast about how service businesses are adopting AI tools. The host made some really good points about automation for appointment scheduling.\n\nThought you might find it useful given what we are working on.\n\nCheers" },
  { subject: "Design feedback for the landing page", body: "Hi,\n\nI reviewed the latest version of the landing page mockup. Overall it looks solid. A few suggestions:\n\n- The call-to-action button could be more prominent\n- Maybe add a testimonials section above the fold\n- The mobile view needs some spacing adjustments\n\nLet me know your thoughts on these.\n\nBest" },
  { subject: "Re: client presentation next week", body: "Hi,\n\nJust confirming that the client presentation is set for next Tuesday at 3 PM. I will prepare the deck with the latest analytics and case studies.\n\nCould you review the pricing section before then? Want to make sure we are aligned.\n\nThanks" },
  { subject: "Great news about the pilot program", body: "Hi,\n\nWanted to share some positive feedback from the pilot program — the client mentioned they saw a 25% increase in online inquiries within the first two weeks.\n\nThis is exactly the kind of result we can use in our outreach materials.\n\nBest" },
  { subject: "Thoughts on expanding to a new city?", body: "Hi,\n\nI have been looking at the data for nearby cities and there seems to be a real opportunity. The competition is low and demand for professional web presence is growing.\n\nShould we discuss this in our next strategy session?\n\nCheers" },
];

interface WarmupState {
  status: string;
  startedAt: string | null;
  targetEmails: string[];
  senderDomains: string[];
  dailySchedule: { day: number; limit: number }[];
}

interface SendLogEntry {
  id: string; from: string; to: string; subject: string;
  status: "sent" | "failed"; error?: string; timestamp: string;
  type: string;
}

function loadState(): WarmupState | null {
  try {
    if (existsSync(WARMUP_STATE_FILE)) return JSON.parse(readFileSync(WARMUP_STATE_FILE, "utf-8"));
  } catch {}
  return null;
}

function loadLog(): SendLogEntry[] {
  try {
    if (existsSync(SEND_LOG_FILE)) return JSON.parse(readFileSync(SEND_LOG_FILE, "utf-8"));
  } catch {}
  return [];
}

function saveLog(log: SendLogEntry[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SEND_LOG_FILE, JSON.stringify(log, null, 2));
  } catch {}
}

function getWarmupDay(state: WarmupState): number {
  if (!state.startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 86400000)) + 1;
}

function getDailyLimit(state: WarmupState, day: number): number {
  const entry = state.dailySchedule.find(s => s.day === day);
  return entry ? entry.limit : day > 21 ? 50 : 5;
}

async function sendViaSMTP(from: string, to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
  const credKey = SMTP_CREDS[from];
  if (!credKey) return { success: false, error: "No SMTP credential for " + from };

  return new Promise((resolve) => {
    const net = require("net");
    const client = new net.Socket();
    let step = 0;
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; client.destroy(); resolve({ success: false, error: "SMTP timeout" }); }
    }, 15000);

    function done(success: boolean, error?: string) {
      if (resolved) return;
      resolved = true; clearTimeout(timeout);
      try { client.destroy(); } catch {}
      resolve({ success, error });
    }

    const date = new Date().toUTCString();
    const msgId = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "@invictusai.site";
    const raw = ["From: " + from, "To: " + to, "Subject: " + subject, "Date: " + date,
      "Message-ID: <" + msgId + ">", "MIME-Version: 1.0", "Content-Type: text/plain; charset=utf-8", "", body].join("\r\n");

    client.connect(SMTP_PORT, SMTP_HOST, () => {});
    client.on("data", (data: Buffer) => {
      const code = parseInt(data.toString().substring(0, 3));
      if (step === 0 && code === 220) { step = 1; client.write("EHLO invictusai.site\r\n"); }
      else if (step === 1 && code === 250) { step = 2; client.write("AUTH PLAIN " + Buffer.from("\0" + credKey + "\0" + credKey).toString("base64") + "\r\n"); }
      else if (step === 2 && code === 235) { step = 3; client.write("MAIL FROM:<" + from + ">\r\n"); }
      else if (step === 3 && code === 250) { step = 4; client.write("RCPT TO:<" + to + ">\r\n"); }
      else if (step === 4 && code === 250) { step = 5; client.write("DATA\r\n"); }
      else if (step === 5 && code === 354) { step = 6; client.write(raw + "\r\n.\r\n"); }
      else if (step === 6 && code === 250) { step = 7; client.write("QUIT\r\n"); done(true); }
      else if (code >= 400) { done(false, "SMTP " + code + ": " + data.toString().trim()); }
    });
    client.on("error", (err: Error) => done(false, err.message));
    client.on("close", () => { if (!resolved) done(false, "Connection closed"); });
  });
}

export async function GET(): Promise<any> {
  const state = loadState();
  if (!state || state.status !== "active") {
    return NextResponse.json({ sent: 0, message: "Warmup not active" });
  }

  const day = getWarmupDay(state);
  const limit = getDailyLimit(state, day);
  const log = loadLog();
  const today = new Date().toISOString().slice(0, 10);
  const todayWarmup = log.filter(e => e.timestamp.startsWith(today) && e.type === "warmup");
  const remaining = Math.max(0, limit - todayWarmup.length);

  if (remaining <= 0) {
    return NextResponse.json({ sent: 0, message: "Daily limit reached (" + limit + ")", day, limit });
  }

  // Send remaining warmup emails
  const senders = state.senderDomains;
  const targets = state.targetEmails;
  let sentCount = 0;
  const results: any[] = [];

  for (let i = 0; i < remaining; i++) {
    // Pick sender and target — rotate through them, ensure cross-domain
    const sender = senders[(todayWarmup.length + i) % senders.length];
    const target = targets[(todayWarmup.length + i) % targets.length];
    const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];

    // Add random delay between sends (1-5 seconds)
    if (i > 0) await new Promise(r => setTimeout(r, 1000 + Math.random() * 4000));

    const result = await sendViaSMTP(sender, target, template.subject, template.body);

    const entry: SendLogEntry = {
      id: "w-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      from: sender, to: target, subject: template.subject,
      status: result.success ? "sent" : "failed",
      error: result.error, timestamp: new Date().toISOString(), type: "warmup",
    };

    const currentLog = loadLog();
    currentLog.unshift(entry);
    saveLog(currentLog.slice(0, 500));

    if (result.success) sentCount++;
    results.push({ from: sender, to: target, subject: template.subject, status: entry.status });
  }

  return NextResponse.json({
    sent: sentCount,
    failed: remaining - sentCount,
    day,
    limit,
    results,
    message: "Warmup batch complete: " + sentCount + "/" + remaining + " sent",
  });
}
