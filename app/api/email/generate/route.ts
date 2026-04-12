import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/* ============================================
   AI Email Generator — Smart template engine
   Falls back to intelligent template generation
   ============================================ */

const TEMPLATES: Record<string, Record<string, { subject: string; body: string }>> = {
  dental: {
    discovery: {
      subject: "Transform {businessName}'s patient acquisition with AI — demo inside",
      body: `Hi Dr. {recipientName},

I came across {businessName} while researching dental clinics in {city}. Your practice clearly has a strong reputation — but I noticed you don't have an online presence that matches it.

Here's the reality: 73% of patients in {city} search online before booking a dental appointment. Without a professional website, {businessName} is invisible to them.

We help dental clinics like yours get 40% more bookings with AI-powered websites. Here's a live demo: https://demo.invictus-ai.in

Would a 10-minute call work this week? I'll show you exactly how it works for clinics like {businessName}.

Best,
Team Invictus AI`,
    },
    followup: {
      subject: "Quick follow-up — {businessName}'s online presence",
      body: `Hi Dr. {recipientName},

Following up on my earlier email. I wanted to share something specific: dental clinics in {city} that launched professional websites with us saw an average of 47 new patient inquiries in their first month.

Here's the demo I built for a clinic similar to yours: https://demo.invictus-ai.in

The setup takes under 48 hours. Zero effort from your side.

Worth a quick look?

Best,
Team Invictus AI`,
    },
    value: {
      subject: "How {city} dental clinics are getting 3x more patients online",
      body: `Hi Dr. {recipientName},

Quick data point: the top 5 dental clinics in {city} by online bookings all have one thing in common — professional websites with online scheduling.

Your competitors are capturing patients that could be walking into {businessName} instead.

We make it effortless: professional website in 48 hours, fully managed, optimized for patient trust and bookings.

Want the case study from a {city} clinic we helped? Just reply "send it."

Best,
Team Invictus AI`,
    },
    breakup: {
      subject: "Last note — {businessName}",
      body: `Hi Dr. {recipientName},

I understand timing is everything. I won't take more of your time.

If {businessName} ever wants to build its online presence and capture the patients already searching for dental services in {city}, just reply to this email. The offer stands.

Wishing {businessName} continued success.

Best,
Team Invictus AI`,
    },
  },
  ca: {
    discovery: {
      subject: "How {businessName} can attract high-value clients online",
      body: `Hi {recipientName},

I noticed {businessName} doesn't have a strong online presence. In {city}, 78% of businesses search for CA firms online before making a call.

We help CA firms attract premium clients through AI-powered professional websites — complete with GST portal, tax calculator, and client login.

Our clients see 60% more inquiries within 30 days. Here's a live demo: https://ca-demo.invictus-ai.in

10 minutes for a quick walkthrough?

Best,
Team Invictus AI`,
    },
    followup: { subject: "Demo ready for {businessName} — AI-powered CA website", body: "Hi {recipientName},\n\nFollowing up — here's the demo: https://ca-demo.invictus-ai.in\n\nIncludes GST filing portal, tax calculator, and client dashboard. Everything a modern CA firm needs.\n\n5 minutes to review?\n\nBest,\nTeam Invictus AI" },
    value: { subject: "Why top CAs in {city} invest in online presence", body: "Hi {recipientName},\n\nClients searching '{city} CA firm' see your competitors first. A professional website ensures {businessName} appears credible and trustworthy.\n\nWe deliver in 48 hours, fully managed. Zero IT headaches.\n\nShall I share what we built for another {city} CA firm?\n\nBest,\nTeam Invictus AI" },
    breakup: { subject: "Closing the loop — {businessName}", body: "Hi {recipientName},\n\nNo worries if the timing isn't right. Whenever {businessName} is ready for a professional web presence, just reply here.\n\nAll the best,\nTeam Invictus AI" },
  },
  education: {
    discovery: {
      subject: "Boost {businessName}'s enrollment with AI",
      body: `Hi {recipientName},

I noticed {businessName} could benefit from a stronger online presence. 82% of parents research institutes online before enrollment.

We help coaching institutes and schools increase enrollment by 45% with AI-powered websites — course catalog, online enrollment, parent portal.

Here's a live demo: https://demo.invictus-ai.in

Quick call to discuss?

Best,
Team Invictus AI`,
    },
    followup: { subject: "Enrollment demo for {businessName}", body: "Hi {recipientName},\n\nHere's a demo we built for a coaching institute: https://demo.invictus-ai.in\n\nIncludes course catalog, online enrollment forms, and parent dashboard.\n\nWant to see how it works for {businessName}?\n\nBest,\nTeam Invictus AI" },
    value: { subject: "Parents are searching for institutes like {businessName} online", body: "Hi {recipientName},\n\n82% of parents research institutes online before enrollment. A professional website is {businessName}'s best enrollment tool.\n\nWe've helped institutes go from 50 to 200+ inquiries per month. The ROI is clear.\n\nInterested in the case study?\n\nBest,\nTeam Invictus AI" },
    breakup: { subject: "Last note — {businessName}", body: "Hi {recipientName},\n\nI'll close this thread. Whenever {businessName} is ready to boost enrollment, just reply.\n\nAll the best,\nTeam Invictus AI" },
  },
  lawyer: {
    discovery: {
      subject: "How {businessName} can attract premium clients online",
      body: `Hi Advocate {recipientName},

87% of legal clients research lawyers online before hiring. A credible website is no longer optional for {businessName}.

We help law firms attract premium clients through AI-powered professional websites — case specialties, testimonials, consultation booking.

Here's a demo: https://demo.invictus-ai.in

Would a brief call work?

Best,
Team Invictus AI`,
    },
    followup: { subject: "Legal website demo for {businessName}", body: "Hi Advocate {recipientName},\n\nHere's a demo we built: https://demo.invictus-ai.in\n\nIncludes case specialties, client testimonials, and consultation booking.\n\nCustom version for {businessName}?\n\nBest,\nTeam Invictus AI" },
    value: { subject: "Why top lawyers in {city} invest in web presence", body: "Hi Advocate {recipientName},\n\nClients searching '{city} lawyer' see your competitors first. A professional website ensures {businessName} appears credible online.\n\nWe deliver in 48 hours, fully managed.\n\nShall I share more?\n\nBest,\nTeam Invictus AI" },
    breakup: { subject: "Last note — {businessName}", body: "Hi Advocate {recipientName},\n\nI'll close this thread. When {businessName} is ready for a professional web presence, just reply.\n\nBest wishes,\nTeam Invictus AI" },
  },
};

function fillTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `[${key}]`);
}

export async function POST(req: NextRequest): Promise<any> {
  try {
    const { niche, type, recipientName, businessName, city } = await req.json();

    if (!niche || !type) {
      return NextResponse.json({ error: "niche and type required" }, { status: 400 });
    }

    const nicheTemplates = TEMPLATES[niche];
    if (!nicheTemplates) {
      return NextResponse.json({ error: `Unknown niche: ${niche}` }, { status: 400 });
    }

    const template = nicheTemplates[type];
    if (!template) {
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

    const vars = {
      recipientName: recipientName || "[Name]",
      businessName: businessName || "[Business]",
      city: city || "Pune",
    };

    return NextResponse.json({
      subject: fillTemplate(template.subject, vars),
      body: fillTemplate(template.body, vars),
      niche,
      type,
      engine: "smart-template",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
