import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const INDEX_FILE = '/workspace/docs/INDEX.json';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const agent = searchParams.get('agent') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    if (!fs.existsSync(INDEX_FILE)) {
      return NextResponse.json({
        error: 'Index not yet generated. Run build-doc-index.js first.',
        generated: null,
        total: 0,
        docs: [],
      }, { status: 404 });
    }

    const raw = fs.readFileSync(INDEX_FILE, 'utf8');
    const index = JSON.parse(raw);

    let docs = index.docs || [];

    // Filter
    if (q) {
      const ql = q.toLowerCase();
      docs = docs.filter((d: any) =>
        d.filename.toLowerCase().includes(ql) ||
        d.preview.toLowerCase().includes(ql) ||
        d.path.toLowerCase().includes(ql)
      );
    }
    if (category) {
      docs = docs.filter((d: any) => d.category === category);
    }
    if (agent) {
      docs = docs.filter((d: any) => d.agent === agent);
    }

    const total = docs.length;
    const paginated = docs.slice(offset, offset + limit);

    return NextResponse.json({
      generated: index.generated,
      total,
      categories: index.categories,
      offset,
      limit,
      docs: paginated,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
