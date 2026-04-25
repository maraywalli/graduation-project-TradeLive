import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CourierClient } from './CourierClient';

export const dynamic = 'force-dynamic';

export default async function CourierPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/courier');

  const { data: profile } = await (supabase as any).from('profiles').select('id, role').eq('id', user.id).maybeSingle();
  if (!profile || (profile.role !== 'delivery' && profile.role !== 'admin')) {
    redirect('/billing/upgrade?kind=role&value=delivery');
  }

  const sb: any = supabase;
  const [{ data: open }, { data: mine }] = await Promise.all([
    sb.from('deliveries').select('*').eq('status', 'requested').is('courier_id', null).order('created_at', { ascending: false }).limit(50),
    sb.from('deliveries').select('*').eq('courier_id', user.id).neq('status', 'delivered').neq('status', 'cancelled').order('created_at', { ascending: false }),
  ]);

  return <CourierClient open={open || []} mine={mine || []} courierId={user.id} />;
}
