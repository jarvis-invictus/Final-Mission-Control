import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GHL_KEY = process.env.GHL_API_KEY || "pit-b67e8052-7423-4cc9-abbe-3a5cd5b89df8";
const GHL_LOC = process.env.GHL_LOCATION_ID || "AVBEYuMBQNnuxogWO6YQ";
const BASE = "https://services.leadconnectorhq.com";

async function ghlFetch(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  if (!url.searchParams.has("locationId") && !url.searchParams.has("location_id")) {
    url.searchParams.set("locationId", GHL_LOC);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${GHL_KEY}`,
      Version: "2021-07-28",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { error: `GHL API ${res.status}: ${text.slice(0, 200)}`, status: res.status };
  }
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") || "overview";

  try {
    switch (section) {
      case "overview": {
        // Fetch everything in parallel
        const [contacts, pipelines, opportunities, conversations, calendars] = await Promise.all([
          ghlFetch("/contacts/", { locationId: GHL_LOC, limit: "100" }).catch(() => ({})),
          ghlFetch("/opportunities/pipelines", { locationId: GHL_LOC }).catch(() => ({})),
          ghlFetch("/opportunities/search", { location_id: GHL_LOC, limit: "100" }).catch(() => ({})),
          ghlFetch("/conversations/search", { locationId: GHL_LOC, limit: "50" }).catch(() => ({})),
          ghlFetch("/calendars/", { locationId: GHL_LOC }).catch(() => ({})),
        ]);

        return NextResponse.json({
          contacts: {
            total: contacts?.meta?.total ?? contacts?.contacts?.length ?? 0,
            items: (contacts?.contacts || []).slice(0, 20).map((c: any) => ({
              id: c.id,
              name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.name || c.companyName || "Unknown",
              email: c.email,
              phone: c.phone,
              tags: c.tags || [],
              dateAdded: c.dateAdded,
              source: c.source,
              companyName: c.companyName,
            })),
          },
          pipelines: {
            total: pipelines?.pipelines?.length ?? 0,
            items: (pipelines?.pipelines || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              stages: (p.stages || []).map((s: any) => ({ id: s.id, name: s.name, position: s.position })),
            })),
          },
          opportunities: {
            total: opportunities?.meta?.total ?? opportunities?.opportunities?.length ?? 0,
            items: (opportunities?.opportunities || []).slice(0, 20).map((o: any) => ({
              id: o.id,
              name: o.name,
              status: o.status,
              monetaryValue: o.monetaryValue,
              pipelineId: o.pipelineId,
              pipelineStageId: o.pipelineStageId,
              assignedTo: o.assignedTo,
              contact: o.contact,
              dateAdded: o.dateAdded,
              lastStatusChangeAt: o.lastStatusChangeAt,
            })),
          },
          conversations: {
            total: conversations?.total ?? conversations?.conversations?.length ?? 0,
            items: (conversations?.conversations || []).slice(0, 20).map((c: any) => ({
              id: c.id,
              contactName: c.contactName || c.fullName,
              contactId: c.contactId,
              type: c.type,
              lastMessageType: c.lastMessageType,
              lastMessageBody: c.lastMessageBody?.slice(0, 100),
              lastMessageDate: c.lastMessageDate || c.dateUpdated,
              unreadCount: c.unreadCount,
            })),
          },
          calendars: {
            total: calendars?.calendars?.length ?? 0,
            items: (calendars?.calendars || []).map((cal: any) => ({
              id: cal.id,
              name: cal.name,
              description: cal.description,
              slug: cal.slug,
              isActive: cal.isActive,
            })),
          },
          locationId: GHL_LOC,
          timestamp: new Date().toISOString(),
        }, {
          headers: { "Cache-Control": "public, max-age=30" },
        });
      }

      case "contacts": {
        const limit = searchParams.get("limit") || "100";
        const data = await ghlFetch("/contacts/", { locationId: GHL_LOC, limit });
        return NextResponse.json(data);
      }

      case "pipelines": {
        const data = await ghlFetch("/opportunities/pipelines", { locationId: GHL_LOC });
        return NextResponse.json(data);
      }

      case "opportunities": {
        const pipelineId = searchParams.get("pipelineId") || "";
        const params: Record<string, string> = { location_id: GHL_LOC, limit: "100" };
        if (pipelineId) params.pipeline_id = pipelineId;
        const data = await ghlFetch("/opportunities/search", params);
        return NextResponse.json(data);
      }

      case "conversations": {
        const data = await ghlFetch("/conversations/search", { locationId: GHL_LOC, limit: "50" });
        return NextResponse.json(data);
      }

      case "calendars": {
        const data = await ghlFetch("/calendars/", { locationId: GHL_LOC });
        return NextResponse.json(data);
      }

      case "appointments": {
        const calendarId = searchParams.get("calendarId") || "";
        const startTime = searchParams.get("startTime") || new Date(Date.now() - 30 * 86400000).toISOString();
        const endTime = searchParams.get("endTime") || new Date(Date.now() + 30 * 86400000).toISOString();
        const params: Record<string, string> = { locationId: GHL_LOC, startTime, endTime };
        if (calendarId) params.calendarId = calendarId;
        const data = await ghlFetch("/calendars/events", params);
        return NextResponse.json(data);
      }

      case "tags": {
        const data = await ghlFetch("/tags/", { locationId: GHL_LOC });
        return NextResponse.json(data);
      }

      case "report": {
        /* Build a report from multiple GHL endpoints */
        const [contacts, opps, convos, cals] = await Promise.all([
          ghlFetch("/contacts/", { locationId: GHL_LOC, limit: "100" }),
          ghlFetch(`/opportunities/search`, { location_id: GHL_LOC, limit: "100" }),
          ghlFetch("/conversations/search", { locationId: GHL_LOC, limit: "100" }),
          ghlFetch("/calendars/", { locationId: GHL_LOC }),
        ]);
        const contactList = contacts?.contacts || [];
        const oppList = opps?.opportunities || [];
        const wonDeals = oppList.filter((o: any) => o.status === "won");
        const openDeals = oppList.filter((o: any) => o.status === "open");
        const totalValue = oppList.reduce((s: number, o: any) => s + (o.monetaryValue || 0), 0);
        const wonValue = wonDeals.reduce((s: number, o: any) => s + (o.monetaryValue || 0), 0);

        /* Tag distribution */
        const tagCounts: Record<string, number> = {};
        contactList.forEach((c: any) => {
          (c.tags || []).forEach((t: string) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
        });

        return NextResponse.json({
          summary: {
            totalContacts: contactList.length,
            totalOpportunities: oppList.length,
            openDeals: openDeals.length,
            wonDeals: wonDeals.length,
            totalPipelineValue: totalValue,
            wonValue,
            totalConversations: convos?.total || 0,
            totalCalendars: cals?.calendars?.length || 0,
          },
          tagDistribution: Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count),
          dealsByStage: oppList.reduce((acc: Record<string, number>, o: any) => {
            const stage = o.pipelineStageId || "unknown";
            acc[stage] = (acc[stage] || 0) + 1;
            return acc;
          }, {}),
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[ghl API] Error:", err);
    return NextResponse.json({ error: "GHL API failed" }, { status: 500 });
  }
}

/* ================================================================ */
/*  POST — Write operations to GHL                                    */
/* ================================================================ */

async function ghlPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GHL_KEY}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { error: `GHL API ${res.status}: ${text.slice(0, 300)}`, status: res.status };
  }
  return res.json();
}

async function ghlPut(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${GHL_KEY}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { error: `GHL API ${res.status}: ${text.slice(0, 300)}`, status: res.status };
  }
  return res.json();
}

async function ghlDelete(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${GHL_KEY}`,
      Version: "2021-07-28",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { error: `GHL API ${res.status}: ${text.slice(0, 300)}`, status: res.status };
  }
  // Some DELETE endpoints return empty body
  const text = await res.text();
  return text ? JSON.parse(text) : { success: true };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      /* ----- CONTACTS ----- */
      case "createContact": {
        const { firstName, lastName, email, phone, companyName, tags, source } = body;
        const result = await ghlPost("/contacts/", {
          locationId: GHL_LOC,
          firstName, lastName, email, phone,
          companyName, tags, source: source || "Mission Control",
        });
        return NextResponse.json(result);
      }

      case "updateContact": {
        const { contactId, ...fields } = body;
        delete fields.action;
        const result = await ghlPut(`/contacts/${contactId}`, fields);
        return NextResponse.json(result);
      }

      case "deleteContact": {
        const result = await ghlDelete(`/contacts/${body.contactId}`);
        return NextResponse.json(result);
      }

      case "addContactTag": {
        const result = await ghlPost(`/contacts/${body.contactId}/tags`, {
          tags: body.tags,
        });
        return NextResponse.json(result);
      }

      case "addContactNote": {
        const result = await ghlPost(`/contacts/${body.contactId}/notes`, {
          body: body.note,
          userId: body.userId,
        });
        return NextResponse.json(result);
      }

      /* ----- OPPORTUNITIES ----- */
      case "createOpportunity": {
        const { name, pipelineId, pipelineStageId, monetaryValue, contactId, status } = body;
        const result = await ghlPost("/opportunities/", {
          locationId: GHL_LOC,
          name, pipelineId, pipelineStageId,
          monetaryValue: monetaryValue || 0,
          contactId, status: status || "open",
        });
        return NextResponse.json(result);
      }

      case "updateOpportunity": {
        const { opportunityId, ...fields } = body;
        delete fields.action;
        const result = await ghlPut(`/opportunities/${opportunityId}`, fields);
        return NextResponse.json(result);
      }

      case "deleteOpportunity": {
        const result = await ghlDelete(`/opportunities/${body.opportunityId}`);
        return NextResponse.json(result);
      }

      /* ----- CONVERSATIONS / MESSAGES ----- */
      case "sendMessage": {
        const { contactId, message, type: msgType } = body;
        const result = await ghlPost("/conversations/messages", {
          contactId,
          type: msgType || "SMS",
          message,
        });
        return NextResponse.json(result);
      }

      /* ----- CALENDARS ----- */
      case "createCalendar": {
        const { name, description, slotDuration, slotInterval, eventType } = body;
        const result = await ghlPost("/calendars/", {
          locationId: GHL_LOC,
          name,
          description,
          calendarType: eventType || "round_robin",
          slotDuration: slotDuration || 30,
          slotDurationUnit: "mins",
          slotInterval: slotInterval || 30,
          slotIntervalUnit: "mins",
          autoConfirm: true,
          isActive: true,
        });
        return NextResponse.json(result);
      }

      /* ----- APPOINTMENTS ----- */
      case "bookAppointment": {
        const { calendarId, contactId, startTime, endTime, title: apptTitle } = body;
        const result = await ghlPost("/calendars/events/appointments", {
          calendarId,
          locationId: GHL_LOC,
          contactId,
          startTime,
          endTime,
          title: apptTitle || "Appointment",
          appointmentStatus: "confirmed",
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[ghl POST] Error:", err);
    return NextResponse.json({ error: "GHL write operation failed" }, { status: 500 });
  }
}
