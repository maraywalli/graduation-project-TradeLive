import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from '@/lib/ai-free';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Gather real platform metrics
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sinceWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsers, newUsers, newUsersWeek,
    totalItems, newItems,
    totalOrders, paidOrders, recentOrders,
    totalBrands, unverifiedBrands,
    pendingDeliveries, completedDeliveries,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sinceWeek),
    supabase.from('items').select('*', { count: 'exact', head: true }),
    supabase.from('items').select('*', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('amount').eq('status', 'paid'),
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', sinceWeek),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('id, name, owner_id, created_at').eq('verified', false).order('created_at', { ascending: false }).limit(10),
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).in('status', ['requested', 'assigned', 'picked_up']),
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
  ]);

  const revenue = (paidOrders.data || []).reduce((s, o: any) => s + Number(o.amount || 0), 0);
  const metrics = {
    users: { total: totalUsers.count, new30d: newUsers.count, new7d: newUsersWeek.count },
    items: { total: totalItems.count, new30d: newItems.count },
    orders: { total: totalOrders.count, recent7d: recentOrders.count, paidRevenueIqd: revenue },
    brands: { total: totalBrands.count, awaitingVerification: unverifiedBrands.data || [] },
    deliveries: { pending: pendingDeliveries.count, completed: completedDeliveries.count },
  };

  let body: any = {};
  try { body = await req.json(); } catch {}
  const lang = body.locale === 'ku' ? 'Kurdish (Sorani script)' : 'English';

  const prompt = `You are TradeLive Pro's operations analyst. Write a concise admin briefing in ${lang} based ONLY on these real metrics:

${JSON.stringify(metrics, null, 2)}

Structure:
1. **Headline** (1 sentence)
2. **Growth** — users this week vs month, item supply.
3. **Revenue & orders** — totals, momentum.
4. **Brands awaiting verification** — list each by name with the date and ask the admin to review.
5. **Deliveries** — pending vs completed.
6. **Action items** — bullet list of 3-5 concrete next steps.

Keep it crisp, ~180 words. No preamble.`;

  try {
    const summary = await generateText({ prompt });
    return NextResponse.json({ metrics, summary });
  } catch (e: any) {
    return NextResponse.json({ metrics, summary: null, error: e?.message || 'AI failed' });
  }
}
