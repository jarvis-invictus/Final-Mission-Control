import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

export const dynamic = "force-dynamic";

const DATA_DIR = "/app/data";
const SEND_LOG = DATA_DIR + "/email-send-log.json";

// Postal SMTP config
const SMTP_HOST = "172.26.0.14";
const SMTP_PORT = 25;

// SMTP credentials per sender address
const SMTP_CREDS: Record<string, { user: string; pass: string }> = {
  // invictusai.site
  "contact@invictusai.site":  { user: "RC4yC51uAUs951W6mQdLeZtq", pass: "RC4yC51uAUs951W6mQdLeZtq" },
  "support@invictusai.site":  { user: "ndUMZFVpp1zHoWK0o12hQ2Pp", pass: "ndUMZFVpp1zHoWK0o12hQ2Pp" },
  "info@invictusai.site":     { user: "0NqemACuSOtu7zaPTocoDrKs", pass: "0NqemACuSOtu7zaPTocoDrKs" },
  // invictusai.online
  "contact@invictusai.online": { user: "5G51zfT3IOUAIRU7BeJKdpb3", pass: "5G51zfT3IOUAIRU7BeJKdpb3" },
  "support@invictusai.online": { user: "I9NyGftMQMiCGApTIKNiEBBQ", pass: "I9NyGftMQMiCGApTIKNiEBBQ" },
  "info@invictusai.online":    { user: "30IsWoghi7WZJIt3i30qhddz", pass: "30IsWoghi7WZJIt3i30qhddz" },
  // invictusai.tech
  "contact@invictusai.tech":  { user: "ufjOOadwoJHpdMafmwJvTHvD", pass: "ufjOOadwoJHpdMafmwJvTHvD" },
  "support@invictusai.tech":  { user: "3qIvkOJV17iKWds3eeiZxE6o", pass: "3qIvkOJV17iKWds3eeiZxE6o" },
  "info@invictusai.tech":     { user: "dCPgpxr0h511Vrx1l8ApzMUZ", pass: "dCPgpxr0h511Vrx1l8ApzMUZ" },
  // invictus-ai.in (main domain)
  "contact@invictus-ai.in":   { user: "2F32gKZf3CmhxbaDf6gtdikX", pass: "2F32gKZf3CmhxbaDf6gtdikX" },
};

// Default credential for unknown senders
const DEFAULT_CRED = { user: "VeWPn1G8RqDRhtMoL42pKiD2", pass: "VeWPn1G8RqDRhtMoL42pKiD2" };

interface SendLogEntry {
  id: string;
  from: string;
  to: string;
  subject: string;
  status: "sent" | "failed";
  error?: string;
  timestamp: string;
  type: "test" | "warmup" | "outreach";
}

function loadLog(): SendLogEntry[] {
  try {
    if (existsSync(SEND_LOG)) return JSON.parse(readFileSync(SEND_LOG, "utf-8"));
  } catch {}
  return [];
}

function saveLog(entries: SendLogEntry[]): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(SEND_LOG, JSON.stringify(entries, null, 2));
  } catch {}
}

function appendLog(entry: SendLogEntry): void {
  const log = loadLog();
  log.unshift(entry);
  // Keep last 500 entries
  saveLog(log.slice(0, 500));
}

// Send email via raw SMTP using net socket (no nodemailer needed)
async function sendViaSMTP(from: string, to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
  const cred = SMTP_CREDS[from] || DEFAULT_CRED;
  return new Promise((resolve) => {
    const net = require("net");
    const client = new net.Socket();
    let step = 0;
    let response = "";
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        client.destroy();
        resolve({ success: false, error: "SMTP timeout (15s)" });
      }
    }, 15000);

    function done(success: boolean, error?: string) {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      try { client.destroy(); } catch {}
      resolve({ success, error });
    }

    // Build raw email
    const date = new Date().toUTCString();
    const messageId = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "@invictus-ai.in";
    const rawEmail = [
      "From: " + from,
      "To: " + to,
      "Subject: " + subject,
      "Date: " + date,
      "Message-ID: <" + messageId + ">",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");

    client.connect(SMTP_PORT, SMTP_HOST, () => {});

    client.on("data", (data: Buffer) => {
      response = data.toString();
      const code = parseInt(response.substring(0, 3));

      if (step === 0 && code === 220) {
        step = 1;
        client.write("EHLO invictus-ai.in\r\n");
      } else if (step === 1 && code === 250) {
        step = 2;
        const authStr = Buffer.from("\0" + cred.user + "\0" + cred.pass).toString("base64");
        client.write("AUTH PLAIN " + authStr + "\r\n");
      } else if (step === 2 && code === 235) {
        step = 3;
        client.write("MAIL FROM:<" + from + ">\r\n");
      } else if (step === 3 && code === 250) {
        step = 4;
        client.write("RCPT TO:<" + to + ">\r\n");
      } else if (step === 4 && code === 250) {
        step = 5;
        client.write("DATA\r\n");
      } else if (step === 5 && code === 354) {
        step = 6;
        client.write(rawEmail + "\r\n.\r\n");
      } else if (step === 6 && code === 250) {
        step = 7;
        client.write("QUIT\r\n");
        done(true);
      } else if (code >= 400) {
        done(false, "SMTP error " + code + ": " + response.trim());
      }
    });

    client.on("error", (err: Error) => {
      done(false, "Connection error: " + err.message);
    });

    client.on("close", () => {
      if (!resolved) done(false, "Connection closed unexpectedly");
    });
  });
}

// Available sender addresses
const SENDERS: Record<string, string> = {
  "contact@invictus-ai.in": "Invictus AI",
  "contact@invictusai.site": "Invictus AI",
  "contact@invictusai.online": "Invictus AI",
  "contact@invictusai.tech": "Invictus AI",
  "support@invictusai.site": "Invictus AI Support",
  "support@invictusai.online": "Invictus AI Support",
  "support@invictusai.tech": "Invictus AI Support",
  "info@invictusai.site": "Invictus AI",
  "info@invictusai.online": "Invictus AI",
  "info@invictusai.tech": "Invictus AI",
};

export async function GET(): Promise<any> {
  const log = loadLog();
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = log.filter(e => e.timestamp.startsWith(today)).length;
  const todaySent = log.filter(e => e.timestamp.startsWith(today) && e.status === "sent").length;
  const todayFailed = log.filter(e => e.timestamp.startsWith(today) && e.status === "failed").length;

  return NextResponse.json({
    log: log.slice(0, 50),
    stats: {
      total: log.length,
      todayTotal: todayCount,
      todaySent,
      todayFailed,
    },
    senders: Object.keys(SENDERS),
  });
}

export async function POST(req: NextRequest): Promise<any> {
  const body = await req.json();
  const { action } = body;

  if (action === "send") {
    const from = body.from || "jordan@invictus-ai.in";
    const to = body.to;
    const subject = body.subject || "Test Email from Invictus AI";
    const emailBody = body.body || "This is a test email sent from Invictus AI Mission Control.\n\nTimestamp: " + new Date().toISOString();
    const type = body.type || "test";

    if (!to) return NextResponse.json({ error: "Missing 'to' address" }, { status: 400 });
    if (!SENDERS[from] && !from.endsWith("@invictus-ai.in") && !from.endsWith("@invictusai.site") && !from.endsWith("@invictusai.online") && !from.endsWith("@invictusai.tech")) {
      return NextResponse.json({ error: "Invalid sender domain" }, { status: 400 });
    }

    const result = await sendViaSMTP(from, to, subject, emailBody);

    const entry: SendLogEntry = {
      id: "e-" + Date.now(),
      from,
      to,
      subject,
      status: result.success ? "sent" : "failed",
      error: result.error,
      timestamp: new Date().toISOString(),
      type: type as "test" | "warmup" | "outreach",
    };
    appendLog(entry);

    return NextResponse.json({
      success: result.success,
      error: result.error,
      entry,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
