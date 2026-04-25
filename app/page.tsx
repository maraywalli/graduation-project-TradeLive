import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { MarketplaceClient } from './_pages/MarketplaceClient';
import { BentoHomeClient } from './_pages/BentoHomeClient';
import { HomeSkeleton } from '@/components/skeletons/HomeSkeleton';

// Stream the markup instantly; the data-dependent inner component is wrapped
// in <Suspense> so the user sees a skeleton while Supabase responds.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const viewMode = cookieStore.get('view_mode')?.value === 'bento' ? 'bento' : 'classic';

  return (
    <Suspense fallback={<HomeSkeleton viewMode={viewMode} />}>
      <HomeContent viewMode={viewMode} q={sp.q} cat={sp.cat} />
    </Suspense>
  );
}

async function HomeContent({
  viewMode,
  q,
  cat,
}: {
  viewMode: 'bento' | 'classic';
  q?: string;
  cat?: string;
}) {
  const supabase = await createClient();

  // Build the items query.
  let itemsQ = supabase
    .from('items')
    .select(
      'id, title, price, currency, images, category, stock, brand_id, latitude, longitude, created_at, seller:profiles!items_seller_id_fkey(id, username, tier, avatar_url, rating)',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(60);
  if (q) itemsQ = itemsQ.ilike('title', `%${q}%`);
  if (cat && cat !== 'all') itemsQ = itemsQ.eq('category', cat);

  // Run every query in parallel (was previously items → then bento triple).
  const needsBento = viewMode === 'bento';
  const [itemsRes, eventsRes, brandsRes, coursesRes] = await Promise.all([
    itemsQ,
    needsBento
      ? supabase.from('events').select('id, title, cover_url, starts_at, organizer_id').gte('starts_at', new Date().toISOString()).order('starts_at').limit(8)
      : Promise.resolve({ data: [] as any[] }),
    needsBento
      ? supabase.from('brands').select('id, name, slug, logo_url, verified, sales_count').eq('verified', true).order('created_at', { ascending: false }).limit(12)
      : Promise.resolve({ data: [] as any[] }),
    needsBento
      ? supabase.from('courses').select('id, title, cover_url, price, instructor_id').order('created_at', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const items = itemsRes.data || [];

  // Fair feed: 4 premium/gold posts : 1 free
  const premium = items.filter((i: any) => i.seller?.tier !== 'free');
  const free = items.filter((i: any) => i.seller?.tier === 'free');
  const ordered: any[] = [];
  let pi = 0, fi = 0;
  while (pi < premium.length || fi < free.length) {
    for (let k = 0; k < 4 && pi < premium.length; k++) ordered.push(premium[pi++]);
    if (fi < free.length) ordered.push(free[fi++]);
  }

  if (needsBento) {
    return (
      <BentoHomeClient
        items={ordered.slice(0, 30)}
        events={eventsRes.data || []}
        brands={brandsRes.data || []}
        courses={coursesRes.data || []}
        initialQuery={q || ''}
        initialCategory={cat || 'all'}
      />
    );
  }

  return <MarketplaceClient initialItems={ordered} initialQuery={q || ''} initialCategory={cat || 'all'} />;
}
