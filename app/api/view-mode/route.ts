import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const { mode } = await req.json();
  const c = await cookies();
  c.set('view_mode', mode === 'bento' ? 'bento' : 'classic', { path: '/', maxAge: 60 * 60 * 24 * 365 });
  return NextResponse.json({ ok: true });
}
