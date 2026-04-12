import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/11LxlWxq23IQb7s1b8bWxOHtQPHXBq_WWx0p2E_ModqA/export?format=csv&gid=0";
const N8N_API_URL = process.env.N8N_API_URL || "http://n8n-gu79-n8n-1:5678";
const N8N_API_KEY = process.env.N8N_API_KEY || "";

// Cache spreadsheet data in memory for 5 min
let cachedTemplates: any[] | null = null;
let cacheTime = 0;
const workflowCache = new Map<string, any>(); // fileId → parsed workflow data

// Extract Google Drive file ID from URL
function driveFileId(url: string): string | null {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// Download + parse a workflow JSON from Drive
async function fetchWorkflow(fileId: string): Promise<any | null> {
  if (workflowCache.has(fileId)) return workflowCache.get(fileId);
  try {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Parse out the useful bits
    const nodes: any[] = data.nodes || [];
    const nodeTypes = [...new Set(nodes.map((n: any) => n.type as string))].filter(t => !t.includes("stickyNote"));
    const credentials = [...new Set(nodes.flatMap((n: any) => Object.keys(n.credentials || {})))];
    const triggers = nodes.filter((n: any) => n.type?.includes("Trigger") || n.type?.includes("trigger")).map((n: any) => n.type);
    const integrations = [...new Set(nodeTypes.map((t: string) => {
      const parts = t.split(".");
      const last = parts[parts.length - 1];
      return last.replace(/([A-Z])/g, " $1").replace(/trigger$/i, "").trim();
    }))].filter(Boolean).slice(0, 15);

    const result = {
      name: data.name,
      nodeCount: nodes.length,
      nodeTypes,
      credentials,
      triggers,
      integrations,
      raw: data,
    };
    workflowCache.set(fileId, result);
    return result;
  } catch {
    return null;
  }
}

function parseCSV(csv: string): any[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let inQuotes = false;
    let current = "";
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"' && !inQuotes) { inQuotes = true; continue; }
      if (line[j] === '"' && inQuotes) {
        if (line[j + 1] === '"') { current += '"'; j++; }
        else { inQuotes = false; }
        continue;
      }
      if (line[j] === "," && !inQuotes) { values.push(current); current = ""; continue; }
      current += line[j];
    }
    values.push(current);
    if (values.length > 0 && values[0].trim()) {
      const obj: any = {};
      headers.forEach((h, idx) => { obj[h] = (values[idx] || "").trim(); });
      rows.push(obj);
    }
  }
  return rows;
}

function categorize(template: any): { category: string; niche: string; complexity: string } {
  const text = `${template.name} ${template.title} ${template.description}`.toLowerCase();
  let category = "automation";
  if (/lead|outreach|prospect|crm|contact/.test(text)) category = "lead-gen";
  else if (/onboard|intake|welcome|setup/.test(text)) category = "onboarding";
  else if (/follow.?up|reminder|sequence|drip/.test(text)) category = "follow-up";
  else if (/report|analytic|dashboard|insight/.test(text)) category = "reporting";
  else if (/agent|ai|gpt|openai|llm|chat/.test(text)) category = "ai-agent";
  else if (/social|youtube|tiktok|instagram|content|post/.test(text)) category = "content";
  let niche = "all";
  if (/dental|clinic|patient|appointment/.test(text)) niche = "dental";
  else if (/ca\b|tax|gst|itr|accounting|finance/.test(text)) niche = "ca";
  else if (/educat|coaching|student|enroll|course/.test(text)) niche = "education";
  else if (/law|legal|case|lawyer|advocate/.test(text)) niche = "lawyer";
  let complexity = "medium";
  if (/simple|basic|quick|easy|starter/.test(text)) complexity = "simple";
  else if (/advanced|complex|enterprise|parallel|multi/.test(text)) complexity = "advanced";
  return { category, niche, complexity };
}

async function fetchSpreadsheetTemplates(): Promise<any[]> {
  const now = Date.now();
  if (cachedTemplates && (now - cacheTime) < 300000) return cachedTemplates;

  try {
    const res = await fetch(SPREADSHEET_URL, {
      headers: { "User-Agent": "InvictusMC/1.0" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error("Spreadsheet fetch failed");
    const csv = await res.text();
    const rows = parseCSV(csv);
    const templates = rows.map((row, idx) => {
      const { category, niche, complexity } = categorize(row);
      return {
        id: `sheet_${idx + 1}`,
        name: row.name || row.title || `Template ${idx + 1}`,
        title: row.title || row.name,
        description: row.description?.slice(0, 300) || "",
        creator: row.creator || "Community",
        youtubeUrl: row.youtube_url || "",
        templateUrl: row.template_url || "",
        category,
        niche,
        complexity,
        source: "spreadsheet",
      };
    }).filter(t => t.name && t.name.length > 2);

    cachedTemplates = templates;
    cacheTime = now;
    return templates;
  } catch (err) {
    console.error("[n8n API] Spreadsheet fetch error:", err);
    return [];
  }
}

async function getDeployedWorkflows(): Promise<string[]> {
  try {
    const res = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=100`, {
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((w: any) => w.name);
  } catch {
    return [];
  }
}

// ============ GET — list templates + n8n status ============
export async function GET(req: NextRequest): Promise<any> {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section");

  // Detail: parse workflow JSON from Drive
  if (section === "detail") {
    const templateUrl = searchParams.get("templateUrl") || "";
    const fileId = driveFileId(templateUrl);
    if (!fileId) return NextResponse.json({ error: "No Drive file ID in URL" }, { status: 400 });
    const workflow = await fetchWorkflow(fileId);
    if (!workflow) return NextResponse.json({ error: "Failed to fetch workflow" }, { status: 500 });
    return NextResponse.json(workflow);
  }

  if (section === "status") {
    // Get n8n workflow count
    try {
      const res = await fetch(`${N8N_API_URL}/api/v1/workflows?limit=100`, {
        headers: { "X-N8N-API-KEY": N8N_API_KEY },
      });
      const data = res.ok ? await res.json() : { data: [] };
      const workflows = data.data || [];
      return NextResponse.json({
        connected: true,
        workflowCount: workflows.length,
        activeCount: workflows.filter((w: any) => w.active).length,
        n8nUrl: "https://n8n.invictus-ai.in",
        workflows: workflows.slice(0, 10).map((w: any) => ({
          id: w.id, name: w.name, active: w.active,
          updatedAt: w.updatedAt,
        })),
      });
    } catch {
      return NextResponse.json({ connected: false, workflowCount: 0, n8nUrl: "https://n8n.invictus-ai.in" });
    }
  }

  // Default: return all templates from spreadsheet
  const [templates, deployed] = await Promise.all([
    fetchSpreadsheetTemplates(),
    getDeployedWorkflows(),
  ]);

  const templatesWithStatus = templates.map(t => ({
    ...t,
    isDeployed: deployed.some(d => d.toLowerCase().includes(t.name.toLowerCase().slice(0, 20))),
  }));

  return NextResponse.json({
    templates: templatesWithStatus,
    total: templates.length,
    categories: [...new Set(templates.map(t => t.category))],
    niches: [...new Set(templates.map(t => t.niche))],
    n8nUrl: "https://n8n.invictus-ai.in",
    n8nConnected: !!N8N_API_KEY,
  });
}

// ============ POST — deploy a template to n8n ============
export async function POST(req: NextRequest): Promise<any> {
  try {
    const body = await req.json();
    const { action, templateId, templateName, templateUrl } = body;

    if (action === "deploy") {
      if (!templateUrl) {
        return NextResponse.json({ error: "templateUrl required for deploy" }, { status: 400 });
      }

      // For Google Drive links — we create a minimal starter workflow
      // since we can't download the .n8n file directly from Drive without auth
      // We create a named workflow in n8n with a note pointing to the template
      const workflowPayload = {
        name: templateName || `Template ${templateId}`,
        nodes: [
          {
            parameters: {
              content: `# ${templateName}\n\n**Template URL:** ${templateUrl}\n\nTo use this template:\n1. Download the .n8n file from the link above\n2. In n8n: Settings → Import workflow\n3. Or copy the workflow JSON and paste it here\n\n**Auto-imported by Invictus Mission Control**`,
              height: 300, width: 500,
            },
            id: "note-1",
            name: "Setup Instructions",
            type: "n8n-nodes-base.stickyNote",
            typeVersion: 1,
            position: [0, 0],
          },
          {
            parameters: {},
            id: "start-1",
            name: "Manual Trigger",
            type: "n8n-nodes-base.manualTrigger",
            typeVersion: 1,
            position: [250, 0],
          },
        ],
        connections: {},
        settings: { executionOrder: "v1" },
        tags: [{ name: "invictus-mc" }, { name: "template" }],
      };

      const deployRes = await fetch(`${N8N_API_URL}/api/v1/workflows`, {
        method: "POST",
        headers: {
          "X-N8N-API-KEY": N8N_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflowPayload),
      });

      if (!deployRes.ok) {
        const err = await deployRes.text();
        return NextResponse.json({ error: `n8n deploy failed: ${err}` }, { status: 500 });
      }

      const result = await deployRes.json();
      return NextResponse.json({
        success: true,
        workflowId: result.id,
        workflowName: result.name,
        n8nUrl: `https://n8n.invictus-ai.in/workflow/${result.id}`,
        message: "Workflow created in n8n with setup instructions. Open n8n to import the full template.",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
