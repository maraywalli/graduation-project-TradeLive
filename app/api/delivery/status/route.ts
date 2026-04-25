import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Courier transitions delivery: assigned → picked_up → delivered
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deliveryId, status } = await req.json();
  if (!deliveryId || !['picked_up', 'delivered'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const sb: any = supabase;
  const { data: d } = await sb.from('deliveries').select('id, courier_id').eq('id', deliveryId).maybeSingle();
  if (!d || d.courier_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const patch: any = { status };
  if (status === 'delivered') { patch.delivered_at = new Date().toISOString(); patch.eta_minutes = 0; }

  const { error } = await sb.from('deliveries').update(patch).eq('id', deliveryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
