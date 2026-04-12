import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "fs";

export const dynamic = "force-dynamic";

const APPROVALS_FILE = "/workspace/agents/elon/mc-approvals.json";

interface Approval {
  id: string;
  title: string;
  description: string;
  type: "content" | "outreach" | "feature" | "budget" | "strategy" | "access" | "asset" | "other";
  submittedBy: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  reviewedAt?: string;
  reviewNote?: string;
  priority: "high" | "medium" | "low";
  linkedTo?: string;
  // NEW ROI fields
  expectedROI?: string;
  businessImpact?: "critical" | "high" | "medium" | "low";
  estimatedCost?: string;
  timeToValue?: string;
  whatTheyNeed?: string;
  whyBlocked?: string;
}

function loadApprovals(): Approval[] {
  try {
    if (existsSync(APPROVALS_FILE)) {
      return JSON.parse(readFileSync(APPROVALS_FILE, "utf-8"));
    }
  } catch {}
  // Seed with default approvals from current state
  const seed: Approval[] = [
    {
      id: "ap-1", title: "LinkedIn Company Launch Post", description: "Announce Invictus AI on LinkedIn. Draft ready by Gary.",
      type: "content", submittedBy: "Gary", submittedAt: "2026-04-08T10:00:00Z",
      status: "pending", priority: "high", linkedTo: "/activity",
    },
    {
      id: "ap-2", title: "Dental AI Case Study Post", description: "How AI chatbot increased dental clinic bookings by 40%. Draft content ready.",
      type: "content", submittedBy: "Gary", submittedAt: "2026-04-08T12:00:00Z",
      status: "pending", priority: "medium", linkedTo: "/activity",
    },
    {
      id: "ap-3", title: "Cold Email Campaign — Dental Clinics", description: "385 emails enriched and ready. Jordan has sequences prepared. Awaiting go-signal.",
      type: "outreach", submittedBy: "Jordan", submittedAt: "2026-04-06T09:00:00Z",
      status: "pending", priority: "high", linkedTo: "/crm",
    },
    {
      id: "ap-4", title: "Demo Gallery — Hide Low-Quality Niches", description: "Archive 20+ draft niches that don't meet quality threshold. Need approval to hide from gallery.",
      type: "feature", submittedBy: "Elon", submittedAt: "2026-04-08T18:00:00Z",
      status: "pending", priority: "low", linkedTo: "/demos",
    },
    {
      id: "ap-5", title: "GHL MCP Server Installation", description: "Install 520+ tool MCP server to give agents direct write access to Go High Level CRM.",
      type: "feature", submittedBy: "Elon", submittedAt: "2026-04-08T16:00:00Z",
      status: "pending", priority: "medium",
    },
  ];
  saveApprovals(seed);
  return seed;
}

function saveApprovals(approvals: Approval[]) {
  writeFileSync(APPROVALS_FILE, JSON.stringify(approvals, null, 2));
}

export async function GET() {
  const approvals = loadApprovals();
  const stats = {
    total: approvals.length,
    pending: approvals.filter(a => a.status === "pending").length,
    approved: approvals.filter(a => a.status === "approved").length,
    rejected: approvals.filter(a => a.status === "rejected").length,
    changes: approvals.filter(a => a.status === "changes_requested").length,
  };
  return NextResponse.json({ approvals, stats, timestamp: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, title, description, type, submittedBy, priority, reviewNote, linkedTo } = body;

    const approvals = loadApprovals();

    if (action === "create") {
      const approval: Approval = {
        id: `ap-${Date.now()}`,
        title: title || "Untitled",
        description: description || "",
        type: type || "other",
        submittedBy: submittedBy || "System",
        submittedAt: new Date().toISOString(),
        status: "pending",
        priority: priority || "medium",
        linkedTo,
      };
      approvals.push(approval);
      saveApprovals(approvals);
      return NextResponse.json({ approval, total: approvals.length });
    }

    if (action === "approve" || action === "reject" || action === "changes_requested") {
      const idx = approvals.findIndex(a => a.id === id);
      if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
      approvals[idx].status = action === "changes_requested" ? "changes_requested" : action === "approve" ? "approved" : "rejected";
      approvals[idx].reviewedAt = new Date().toISOString();
      approvals[idx].reviewNote = reviewNote || "";
      saveApprovals(approvals);
      return NextResponse.json({ approval: approvals[idx] });
    }

    if (action === "delete") {
      const filtered = approvals.filter(a => a.id !== id);
      saveApprovals(filtered);
      return NextResponse.json({ deleted: id, remaining: filtered.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
