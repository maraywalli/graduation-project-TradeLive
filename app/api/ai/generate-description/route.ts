import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from '@/lib/ai-free';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { title = '', notes = '', category = '', condition = '', locale = 'en' } = body;

  if (!title.trim() && !notes.trim()) {
    return NextResponse.json({ error: 'Provide a title or rough notes' }, { status: 400 });
  }

  const lang = locale === 'ku' ? 'Kurdish (Sorani script)' : 'English';
  const prompt = `You are a marketplace copywriter. Write a polished product description in ${lang} for the listing below.
Title: ${title}
Category: ${category}
Condition: ${condition}
Seller notes: ${notes}

Rules:
- 60-110 words.
- Lead with the strongest benefit.
- Mention condition naturally.
- Include 3-5 short bullet-style highlights using "•".
- End with a brief call to action.
- Output the description text only — no preamble, no markdown headings.`;

  try {
    const text = await generateText({ prompt });
    return NextResponse.json({ description: text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'AI failed' }, { status: 500 });
  }
}
