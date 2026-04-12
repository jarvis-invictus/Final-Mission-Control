import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const WA_TOKEN = process.env.WA_ACCESS_TOKEN || 'EAANd1ZBuQMYsBRIZCcZCRqJjJSycWaBZC5z7sZATIEYZBJ8uLDPD0pZBZC4LPGmbfjZB8mLowiJWGb7LBoJi8rGMR3euZBselTR0r7UKcScNJOxwF7v6ShF6ayLDk6aOWy0Qs6cbxwYfJluVJ2f09B8Rt2kQd7HAjxETHNZCANfDl3zbtImzK09pqRP4bZC6dbusPAZDZD';
const PHONE_NUMBER_ID = process.env.WA_PHONE_ID || '1070125329516825';
const WABA_ID = process.env.WA_WABA_ID || '1489144202555937';
const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

interface WAMessage {
  messaging_product: string;
  to: string;
  type: string;
  text?: { body: string };
  template?: { name: string; language: { code: string }; components?: unknown[] };
}

async function waFetch(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  return res.json();
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get('section') || 'status';

  if (section === 'status') {
    const phoneData = await waFetch(`${BASE_URL}/${PHONE_NUMBER_ID}`);
    const wabaData = await waFetch(`${BASE_URL}/${WABA_ID}`);
    return NextResponse.json({
      status: 'connected',
      phone_number_id: PHONE_NUMBER_ID,
      waba_id: WABA_ID,
      phone: phoneData,
      waba: wabaData,
      platform_url: 'https://wa-invictus.in',
    });
  }

  if (section === 'templates') {
    const data = await waFetch(`${BASE_URL}/${WABA_ID}/message_templates?limit=50`);
    return NextResponse.json(data);
  }

  if (section === 'phone') {
    const data = await waFetch(`${BASE_URL}/${PHONE_NUMBER_ID}`);
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: 'Unknown section' }, { status: 400 });
}

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json();
  const { action } = body;

  if (action === 'send_text') {
    const { to, message } = body;
    if (!to || !message) {
      return NextResponse.json({ error: 'to and message required' }, { status: 400 });
    }
    const waMessage: WAMessage = {
      messaging_product: 'whatsapp',
      to: to.replace(/[^0-9]/g, ''),
      type: 'text',
      text: { body: message },
    };
    const result = await waFetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      body: JSON.stringify(waMessage),
    });
    return NextResponse.json(result);
  }

  if (action === 'send_template') {
    const { to, template_name, language_code, components } = body;
    if (!to || !template_name) {
      return NextResponse.json({ error: 'to and template_name required' }, { status: 400 });
    }
    const waMessage: WAMessage = {
      messaging_product: 'whatsapp',
      to: to.replace(/[^0-9]/g, ''),
      type: 'template',
      template: {
        name: template_name,
        language: { code: language_code || 'en' },
        ...(components ? { components } : {}),
      },
    };
    const result = await waFetch(`${BASE_URL}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      body: JSON.stringify(waMessage),
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
