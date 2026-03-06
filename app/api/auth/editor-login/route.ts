import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const DEFAULT_EDITOR_CODE = 'review-demo';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const name = String(body.name ?? '').trim() || 'Editorial Reviewer';
    const code = String(body.editor_code ?? '').trim();

    if (!email || !code) {
      return NextResponse.json({ error: 'email and editor_code are required' }, { status: 400 });
    }

    const expectedCode = process.env.EDITOR_ACCESS_CODE ?? DEFAULT_EDITOR_CODE;
    if (code !== expectedCode) {
      return NextResponse.json({ error: 'Invalid editor access code' }, { status: 401 });
    }

    return NextResponse.json({
      data: {
        id: randomUUID(),
        email,
        name,
        role: 'editor',
        session_token: randomUUID()
      },
      mode: process.env.EDITOR_ACCESS_CODE ? 'env' : 'demo-default'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
