import { createPublicClient } from '@/lib/supabase/server';
import { BrandsClient } from './BrandsClient';

// Brand catalog rarely changes — cache for 60s on Vercel.
// Use the cookie-less anon client so Next.js can actually cache the route.
export const revalidate = 60;

export default async function BrandsPage() {
  const supabase = createPublicClient();
  const { data: brands } = await supabase
    .from('brands')
    .select('*, owner:profiles!brands_owner_id_fkey(username)')
    .order('verified', { ascending: false })
    .order('sales_count', { ascending: false });
  return <BrandsClient brands={brands || []} />;
}
