import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Courier pushes their current GPS — updates deliveries.driver_lat/lng so the
// buyer's existing Realtime subscription paints it on the map instantly.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deliveryId, lat, lng } = await req.json();
  if (!deliveryId || typeof lat !== 'number' || typeof lng !== 'number') {
    return NextResponse.json({ error: 'Missing deliveryId / lat / lng' }, { status: 400 });
  }

  const sb: any = supabase;
  // Verify this courier owns the delivery (RLS will also enforce courier role).
  const { data: d } = await sb.from('deliveries').select('id, courier_id, status, drop_lat, drop_lng').eq('id', deliveryId).maybeSingle();
  if (!d) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
  if (d.courier_id !== user.id) return NextResponse.json({ error: 'Not your delivery' }, { status: 403 });

  // Compute simple ETA using haversine to drop point @ ~30 km/h average
  let eta: number | null = null;
  if (d.drop_lat != null && d.drop_lng != null) {
    const toRad = (n: number) => (n * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(d.drop_lat - lat);
    const dLng = toRad(d.drop_lng - lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(d.drop_lat)) * Math.sin(dLng / 2) ** 2;
    const km = 2 * R * Math.asin(Math.sqrt(a));
    eta = Math.max(1, Math.round((km / 30) * 60));
  }

  const { error } = await sb.from('deliveries')
    .update({ driver_lat: lat, driver_lng: lng, eta_minutes: eta })
    .eq('id', deliveryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, eta });
}
