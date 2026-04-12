import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = join(process.cwd(), "data");
const FULFILLMENT_FILE = join(DATA_DIR, "fulfillment.json");

// ============ TYPES ============
interface FulfillmentTask {
  name: string;
  status: "pending" | "in-progress" | "done" | "blocked";
  assignedTo: string;
  dueDate: string;
  completedDate?: string;
  notes?: string;
}

interface PaymentRecord {
  date: string;
  amount: number;
  type: "setup" | "monthly" | "addon";
  method: string;
  reference: string;
  status: "completed" | "pending" | "overdue" | "refunded";
}

interface FulfillmentRecord {
  id: string;
  clientName: string;
  businessName: string;
  niche: string;
  tier: "starter" | "growth" | "scale";
  stage: "onboarding" | "building" | "review" | "revisions" | "golive" | "live" | "paused";
  contactEmail: string;
  contactPhone: string;
  ghlContactId?: string;
  tasks: FulfillmentTask[];
  payments: PaymentRecord[];
  startDate: string;
  targetLiveDate: string;
  actualLiveDate?: string;
  assignedTo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ============ HELPERS ============
function loadData(): FulfillmentRecord[] {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FULFILLMENT_FILE)) {
    writeFileSync(FULFILLMENT_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    return JSON.parse(readFileSync(FULFILLMENT_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveData(data: FulfillmentRecord[]) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FULFILLMENT_FILE, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return `ful_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultTasks(tier: string): FulfillmentTask[] {
  const baseTasks: FulfillmentTask[] = [
    { name: "Agreement signed", status: "pending", assignedTo: "Jordan", dueDate: "", notes: "" },
    { name: "Payment collected (setup)", status: "pending", assignedTo: "Jordan", dueDate: "", notes: "" },
    { name: "Onboarding form completed", status: "pending", assignedTo: "Jeff", dueDate: "", notes: "" },
    { name: "Onboarding call conducted", status: "pending", assignedTo: "Jeff", dueDate: "", notes: "" },
    { name: "Assets collected (logo, photos, content)", status: "pending", assignedTo: "Jeff", dueDate: "", notes: "" },
    { name: "Website template selected", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
    { name: "Website customization complete", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
    { name: "SEO fundamentals implemented", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
    { name: "Internal QA passed", status: "pending", assignedTo: "Jeff", dueDate: "", notes: "" },
    { name: "Client review session", status: "pending", assignedTo: "Jeff", dueDate: "", notes: "" },
    { name: "Revisions implemented", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
    { name: "Final approval received", status: "pending", assignedTo: "Jeff", dueDate: "", notes: "" },
    { name: "Domain configured + SSL", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
    { name: "Deployed to production", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
    { name: "Google Analytics installed", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
    { name: "Training call conducted", status: "pending", assignedTo: "Jeff", dueDate: "", notes: "" },
    { name: "Final payment collected", status: "pending", assignedTo: "Jordan", dueDate: "", notes: "" },
    { name: "Handover documentation sent", status: "pending", assignedTo: "Jeff", dueDate: "", notes: "" },
  ];

  if (tier === "growth" || tier === "scale") {
    baseTasks.push(
      { name: "GHL CRM pipeline configured", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
      { name: "Booking calendar set up", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
      { name: "Lead notification automations", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
      { name: "Appointment reminder automations", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
      { name: "Review request automation", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
      { name: "Google Business Profile optimized", status: "pending", assignedTo: "Gary", dueDate: "", notes: "" },
    );
  }

  if (tier === "scale") {
    baseTasks.push(
      { name: "Social media profiles set up", status: "pending", assignedTo: "Gary", dueDate: "", notes: "" },
      { name: "10 social media posts designed", status: "pending", assignedTo: "Steve", dueDate: "", notes: "" },
      { name: "Content calendar created", status: "pending", assignedTo: "Gary", dueDate: "", notes: "" },
      { name: "Custom n8n workflows built", status: "pending", assignedTo: "Linus", dueDate: "", notes: "" },
      { name: "Competitor monitoring set up", status: "pending", assignedTo: "Warren", dueDate: "", notes: "" },
    );
  }

  return baseTasks;
}

// ============ GET ============
export async function GET(req: NextRequest): Promise<any> {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const stage = searchParams.get("stage");
    const niche = searchParams.get("niche");
    
    let records = loadData();
    
    if (id) {
      const record = records.find(r => r.id === id);
      if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(record);
    }
    
    if (stage) records = records.filter(r => r.stage === stage);
    if (niche) records = records.filter(r => r.niche === niche);
    
    // Calculate stats
    const stats = {
      total: records.length,
      byStage: {} as Record<string, number>,
      byNiche: {} as Record<string, number>,
      byTier: {} as Record<string, number>,
      totalRevenue: 0,
      pendingPayments: 0,
    };
    
    records.forEach(r => {
      stats.byStage[r.stage] = (stats.byStage[r.stage] || 0) + 1;
      stats.byNiche[r.niche] = (stats.byNiche[r.niche] || 0) + 1;
      stats.byTier[r.tier] = (stats.byTier[r.tier] || 0) + 1;
      r.payments.forEach(p => {
        if (p.status === "completed") stats.totalRevenue += p.amount;
        if (p.status === "pending" || p.status === "overdue") stats.pendingPayments += p.amount;
      });
    });
    
    return NextResponse.json({ records, stats });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load fulfillment data" }, { status: 500 });
  }
}

// ============ POST — Create or Update ============
export async function POST(req: NextRequest): Promise<any> {
  try {
    const body = await req.json();
    const records = loadData();
    
    if (body.id) {
      // Update existing
      const idx = records.findIndex(r => r.id === body.id);
      if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
      
      records[idx] = {
        ...records[idx],
        ...body,
        updatedAt: new Date().toISOString(),
      };
      saveData(records);
      return NextResponse.json({ success: true, record: records[idx] });
    } else {
      // Create new
      const now = new Date();
      const targetLive = new Date(now);
      targetLive.setDate(targetLive.getDate() + (body.tier === "scale" ? 21 : body.tier === "growth" ? 14 : 10));
      
      const newRecord: FulfillmentRecord = {
        id: generateId(),
        clientName: body.clientName || "",
        businessName: body.businessName || "",
        niche: body.niche || "other",
        tier: body.tier || "starter",
        stage: "onboarding",
        contactEmail: body.contactEmail || "",
        contactPhone: body.contactPhone || "",
        ghlContactId: body.ghlContactId || "",
        tasks: getDefaultTasks(body.tier || "starter"),
        payments: [],
        startDate: now.toISOString().split("T")[0],
        targetLiveDate: body.targetLiveDate || targetLive.toISOString().split("T")[0],
        assignedTo: body.assignedTo || "Jeff",
        notes: body.notes || "",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      
      records.push(newRecord);
      saveData(records);
      return NextResponse.json({ success: true, record: newRecord }, { status: 201 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Failed to save fulfillment data" }, { status: 500 });
  }
}

// ============ DELETE ============
export async function DELETE(req: NextRequest): Promise<any> {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    
    const records = loadData();
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    records.splice(idx, 1);
    saveData(records);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
