import { notFound } from 'next/navigation';
import { createPublicClient } from '@/lib/supabase/server';
import { BrandPageClient } from './BrandPageClient';

// Per-brand storefront — cache 60s on Vercel.
// Use the cookie-less anon client so Next.js can actually cache the route.
export const revalidate = 60;

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createPublicClient();

  const { data: brand } = await supabase
    .from('brands')
    .select('*, owner:profiles!brands_owner_id_fkey(id, username, avatar_url, tier)')
    .eq('slug', slug)
    .maybeSingle();

  if (!brand) notFound();

  // Run the items lookup against the brand we just resolved.
  const { data: items } = await supabase
    .from('items')
    .select('id, title, price, currency, images, category, stock, brand_id, seller_id')
    .eq('brand_id', brand.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return <BrandPageClient brand={brand} items={items || []} />;
}
