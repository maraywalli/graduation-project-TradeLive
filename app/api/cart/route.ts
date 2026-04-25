import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });
  const { data, error } = await supabase
    .from('cart_items')
    .select('id, quantity, item:items(*, seller:profiles!items_seller_id_fkey(id, username, tier, avatar_url))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { item_id, quantity = 1 } = await req.json();
  if (!item_id) return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });

  // Upsert: if exists, increment quantity
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('item_id', item_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('cart_items')
      .insert({ user_id: user.id, item_id, quantity });
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
  if (quantity <= 0) {
    await supabase.from('cart_items').delete().eq('id', id).eq('user_id', user.id);
  } else {
    await supabase.from('cart_items').update({ quantity }).eq('id', id).eq('user_id', user.id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  if (id === '__all__') {
    await supabase.from('cart_items').delete().eq('user_id', user.id);
  } else if (id) {
    await supabase.from('cart_items').delete().eq('id', id).eq('user_id', user.id);
  }
  return NextResponse.json({ ok: true });
}
