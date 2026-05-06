import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, quantity, item:items(*, seller:profiles!items_seller_id_fkey(id, username, tier, avatar_url))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (data || []).filter((line: any) => line.item) });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { item_id, quantity = 1 } = await req.json();
  const qty = Math.max(1, Number.parseInt(String(quantity), 10) || 1);
  if (!item_id) return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });

  // Upsert: if exists, increment quantity
  const { data: existing, error: existingError } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('item_id', item_id)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + qty })
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({ user_id: user.id, item_id, quantity: qty });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, quantity } = await req.json();
  if (!id || quantity == null) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  const qty = Number.parseInt(String(quantity), 10);
  if (Number.isNaN(qty)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  if (qty <= 0) {
    const { error } = await supabase.from('cart_items').delete().eq('id', id).eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from('cart_items').update({ quantity: qty }).eq('id', id).eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  let error;
  if (id === '__all__') {
    ({ error } = await supabase.from('cart_items').delete().eq('user_id', user.id));
  } else if (id) {
    ({ error } = await supabase.from('cart_items').delete().eq('id', id).eq('user_id', user.id));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
