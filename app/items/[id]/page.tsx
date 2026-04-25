import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ItemDetailClient } from './ItemDetailClient';

// ISR: regenerate the public detail page at most every 60s. Item edits made
// through the seller dashboard will appear within a minute. This drops the
// per-request Supabase round trip from a cold serverless start.
//
// We use the admin (service-role) client here intentionally so the request
// has NO cookies attached — that keeps the page a true cacheable shared
// route. The query is read-only on a public listing column set, so this is
// safe to share across users.
export const revalidate = 60;

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: item } = await supabase
    .from('items')
    .select('*, seller:profiles!items_seller_id_fkey(id, username, full_name, avatar_url, tier, rating, sales_count, created_at), brand:brands(id, name, slug, logo_url, verified)')
    .eq('id', id)
    .maybeSingle();
  if (!item) notFound();
  return <ItemDetailClient item={item} />;
}
