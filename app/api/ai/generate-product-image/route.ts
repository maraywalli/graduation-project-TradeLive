import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Receives a finished studio-shot image (already processed in the browser by
// `lib/studio-shot.ts`) and stores it in the seller's item-images bucket.
export async function POST(req: Request) {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'Missing image' }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${user.id}/studio-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from('item-images').upload(path, buf, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data } = supabase.storage.from('item-images').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
