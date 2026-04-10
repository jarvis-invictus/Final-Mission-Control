// lib/api.ts — Mission Control API layer (v5)
// Dashboard pulls from GHL directly (CRM backend deprecated)

/* eslint-disable @typescript-eslint/no-explicit-any */

async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

export async function getDashboard(): Promise<any> {
  const ghl = await safeFetch("/api/ghl?section=overview");
  if (ghl && !ghl.error) {
    const contacts = ghl.contacts?.items || [];
    const opps = ghl.opportunities?.items || [];
    const totalContacts = ghl.contacts?.total || 0;
    const totalOpps = ghl.opportunities?.total || 0;
    const byStage: Record<string, number> = {};
    opps.forEach((o: any) => {
      const stage = o.pipelineStageId || "unknown";
      byStage[stage] = (byStage[stage] || 0) + 1;
    });
    const nicheMap: Record<string, number> = {};
    contacts.forEach((c: any) => {
      (c.tags || []).forEach((t: string) => {
        if (["dental","ca","coaching","lawyer","education","clinic","labs","salon","gym","restaurant","pharmacy","physio"].includes(t)) {
          nicheMap[t] = (nicheMap[t] || 0) + 1;
        }
      });
    });
    const topNiches = Object.entries(nicheMap).map(([niche, count]) => ({ niche, count })).sort((a, b) => b.count - a.count);
    const won = opps.filter((o: any) => o.status === "won").length;
    return {
      summary: { total: totalContacts, hot: totalOpps, conversionRate: totalContacts > 0 ? (won / totalContacts) * 100 : 0, contactedRate: totalContacts > 0 ? (opps.length / totalContacts) * 100 : 0, dueTasks: 0 },
      byStage, topNiches, topCities: [], pipelineChart: [], recentActivities: [], dueTasks: [],
    };
  }
  return { summary: { total: 0, hot: 0, conversionRate: 0, contactedRate: 0, dueTasks: 0 }, byStage: {}, topNiches: [], topCities: [], pipelineChart: [], recentActivities: [], dueTasks: [] };
}

export async function getProspects(params: any = {}): Promise<any> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) searchParams.set(k, String(v)); });
  return safeFetch(`/api/ghl?section=contacts&${searchParams}`);
}

export async function getProspect(id: string): Promise<any> {
  return safeFetch(`/api/ghl?section=contact&contactId=${id}`);
}

export async function updateProspect(id: string, data: Record<string, unknown>): Promise<any> {
  return null;
}

export async function getActivities(prospectId?: string): Promise<any> {
  return { data: [] };
}

export async function logActivity(data: any): Promise<any> {
  return null;
}

export async function getEmailHistory(prospectId?: string): Promise<any> {
  return { data: [] };
}

export async function sendEmail(data: any): Promise<any> {
  return null;
}

export async function getEmailTemplates(): Promise<any> {
  return { data: [] };
}

export async function getTasks(prospectId?: string): Promise<any> {
  return { data: [] };
}

export async function getNotes(prospectId: string): Promise<any> {
  return { data: [] };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://187.124.99.189:8000";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

export async function supabaseQuery(table: string, params: Record<string, string> = {}): Promise<any> {
  const searchParams = new URLSearchParams(params);
  return safeFetch(`${SUPABASE_URL}/rest/v1/${table}?${searchParams}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
}

export async function getAgentStatus(): Promise<any> {
  return [
    { name: "Jarvis", ip: "172.26.0.10", port: 18790 },
    { name: "Linus", ip: "172.26.0.3", port: 18790 },
    { name: "Jordan", ip: "172.26.0.14", port: 18790 },
    { name: "Gary", ip: "172.26.0.12", port: 18790 },
    { name: "Friend", ip: "172.26.0.7", port: 18790 },
  ];
}

export function connectCRMWebSocket(onMessage: (data: { event: string; data: unknown }) => void): any {
  return null;
}
