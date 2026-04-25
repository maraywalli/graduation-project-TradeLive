import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/preorders          → list current user's preorders
// GET /api/preorders?seller=1 → list preorders against the current user's items
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const sellerView = url.searchParams.get('seller') === '1';

  let q = supabase
    .from('preorders')
    .select('*, item:items(id, title, images, price, currency, stock, seller_id)')
    .order('created_at', { ascending: false });

  if (sellerView) {
    // Restrict to items I own — RLS enforces this server-side, but filtering
    // here keeps the response small.
    const { data: myItems } = await supabase.from('items').select('id').eq('seller_id', user.id);
    const ids = (myItems || []).map((i) => i.id);
    if (ids.length === 0) return NextResponse.json({ preorders: [] });
    q = q.in('item_id', ids);
  } else {
    q = q.eq('user_id', user.id);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preorders: data || [] });
}

// POST /api/preorders { item_id, quantity?, note? } → join the waitlist
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const itemId = String(body.item_id || '');
  const quantity = Math.max(1, Math.min(99, Number(body.quantity) || 1));
  const note = body.note ? String(body.note).slice(0, 500) : null;
  if (!itemId) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

  const { data: item } = await supabase
    .from('items')
    .select('id, seller_id, stock, status')
    .eq('id', itemId)
    .maybeSingle();
  if (!item || item.status !== 'active') return NextResponse.json({ error: 'Item not available' }, { status: 404 });
  if (item.seller_id === user.id) {
    return NextResponse.json({ error: "You can't pre-order your own item" }, { status: 400 });
  }
  // Pre-orders are only meaningful when the item is out of stock — when it's
  // available, the buyer should use the regular cart/checkout flow.
  if (Number(item.stock ?? 0) > 0) {
    return NextResponse.json({ error: 'Item is in stock — please buy it directly' }, { status: 400 });
  }

  // Upsert by (user_id, item_id) — if the buyer already joined the waitlist,
  // bump their quantity/note instead of erroring.
  const { data, error } = await supabase
    .from('preorders')
    .upsert(
      { user_id: user.id, item_id: itemId, quantity, note, status: 'waiting' },
      { onConflict: 'user_id,item_id' },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preorder: data });
}

// DELETE /api/preorders?item_id=... → leave the waitlist
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const itemId = url.searchParams.get('item_id');
  if (!itemId) return NextResponse.json({ error: 'item_id required' }, { status: 400 });

  const { error } = await supabase
    .from('preorders')
    .delete()
    .eq('user_id', user.id)
    .eq('item_id', itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
