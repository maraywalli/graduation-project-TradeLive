import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SellerDashboard } from './SellerDashboard';

export const dynamic = 'force-dynamic';

export default async function SellerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/seller');

  const [items, orders, profile, brands] = await Promise.all([
    supabase.from('items').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }),
    supabase.from('orders').select('*, item:items(title, price)').eq('seller_id', user.id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('brands').select('id, name, slug').eq('owner_id', user.id).order('name'),
  ]);

  return (
    <SellerDashboard
      items={items.data || []}
      orders={orders.data || []}
      profile={profile.data}
      brands={brands.data || []}
    />
  );
}
