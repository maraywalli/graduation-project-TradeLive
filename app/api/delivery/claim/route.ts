import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Courier claims an unassigned delivery.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || (profile.role !== 'delivery' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Courier role required' }, { status: 403 });
  }

  const { deliveryId } = await req.json();
  if (!deliveryId) return NextResponse.json({ error: 'Missing deliveryId' }, { status: 400 });

  const sb: any = supabase;
  const { data: existing } = await sb.from('deliveries').select('id, courier_id, status').eq('id', deliveryId).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.courier_id) return NextResponse.json({ error: 'Already claimed' }, { status: 409 });
  if (existing.status !== 'requested') return NextResponse.json({ error: 'Not available' }, { status: 409 });

  const { error } = await sb.from('deliveries').update({
    courier_id: user.id,
    status: 'assigned',
    assigned_at: new Date().toISOString(),
    driver_name: 'Courier',
  }).eq('id', deliveryId).is('courier_id', null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
