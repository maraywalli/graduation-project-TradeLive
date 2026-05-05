import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST() {
  return NextResponse.json({ error: 'AI features are disabled' }, { status: 404 });
}
