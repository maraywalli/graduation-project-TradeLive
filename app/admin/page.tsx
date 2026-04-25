import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AdminDashboard } from './AdminDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = (await createClient()) as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') notFound();

  const [users, items, brands, orders] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('items').select('id, title, price, status, seller:profiles!items_seller_id_fkey(username)').order('created_at', { ascending: false }).limit(100),
    supabase.from('brands').select('*').order('created_at', { ascending: false }),
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  return (
    <AdminDashboard
      users={users.data || []}
      items={items.data || []}
      brands={brands.data || []}
      orders={orders.data || []}
    />
  );
}
