import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DeliveryClient } from './DeliveryClient';

export const dynamic = 'force-dynamic';

export default async function DeliveryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/delivery');
  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return <DeliveryClient deliveries={deliveries || []} />;
}
