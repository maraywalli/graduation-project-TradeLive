import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST  multipart/form-data { file: File }
// Server-side upload using the service-role key. This bypasses storage RLS,
// so legitimate authenticated users can always upload regardless of how
// (or whether) the bucket policies are configured. We still verify the user
// is signed-in via the request cookies before accepting anything.
export async function POST(req: Request) {
  try {
    const supa = await createClient();
    const { data: { user }, error: authErr } = await supa.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const admin = createAdminClient();
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin
      .storage
      .from('item-images')
      .upload(path, buf, { contentType: file.type, upsert: false });
    if (upErr) {
      console.error('[items/upload] storage error', upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data } = admin.storage.from('item-images').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (e: any) {
    console.error('[items/upload] error', e);
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 });
  }
}
