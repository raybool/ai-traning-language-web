// src/app/appi/logs/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('[REMOTE LOG]', JSON.stringify(body, null, 2));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Log route error', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
