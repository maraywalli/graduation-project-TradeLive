'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, ShoppingBag, Star, MapPin, Filter, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { ItemCard } from '@/components/items/ItemCard';
import { createClient } from '@/lib/supabase/browser';

// Maplibre is a heavy client lib — only load it when the user opens the map view.
const ItemsMap = dynamic(() => import('@/components/marketplace/ItemsMap').then((m) => m.ItemsMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[70vh] rounded-2xl border border-zinc-200 dark:border-zinc-800 grid place-items-center text-zinc-400 font-bold text-sm">
      <MapIcon className="w-6 h-6 animate-pulse" />
    </div>
  ),
});

const CATEGORIES = ['all', 'electronics', 'fashion', 'home', 'vehicles', 'beauty', 'sports', 'kids', 'other'];

export function MarketplaceClient({
  initialItems,
  initialQuery,
  initialCategory,
}: {
  initialItems: any[];
  initialQuery: string;
  initialCategory: string;
}) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<'newest' | 'low' | 'high'>('newest');
  const [view, setView] = useState<'feed' | 'map'>(
    searchParams.get('view') === 'map' ? 'map' : 'feed',
  );

  // Keep ?view=… in the URL so the map view survives reloads and is shareable.
  const setViewAndUrl = (next: 'feed' | 'map') => {
    setView(next);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next === 'map') params.set('view', 'map'); else params.delete('view');
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/');
  };
  const [liveItems, setLiveItems] = useState<any[]>(initialItems);

  // Realtime: surface newly posted items into both feed and map views
  // without a full page refresh. Fits the live-commerce vibe of the app.
  useEffect(() => { setLiveItems(initialItems); }, [initialItems]);
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel('items:marketplace')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'items' }, (p) => {
        const row = p.new as any;
        if (row.status !== 'active') return;
        // Honour the active filter set (URL q + cat). Otherwise users on a
        // filtered view would see unrelated items pop in.
        if (initialCategory && initialCategory !== 'all' && row.category !== initialCategory) return;
        if (initialQuery && !String(row.title || '').toLowerCase().includes(initialQuery.toLowerCase())) return;
        setLiveItems((prev) => (prev.find((i) => i.id === row.id) ? prev : [row, ...prev]));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [initialCategory, initialQuery]);

  const items = useMemo(() => {
    const arr = [...liveItems];
    if (sort === 'low') arr.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === 'high') arr.sort((a, b) => Number(b.price) - Number(a.price));
    return arr;
  }, [liveItems, sort]);

  const mapItems = useMemo(
    () => items.filter((i) => typeof i.latitude === 'number' && typeof i.longitude === 'number'),
    [items],
  );

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category !== 'all') params.set('cat', category);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-8 md:p-12 mb-6 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-black mb-3">{t.marketplace.title}</h1>
          <p className="text-base md:text-lg opacity-90 mb-6 font-medium">{t.marketplace.subtitle}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={user ? '/seller' : '/login'}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-orange-600 font-black hover:bg-zinc-100 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t.marketplace.addItem}
            </Link>
            <Link
              href="/brands"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-black/30 backdrop-blur text-white font-black hover:bg-black/50 transition-colors"
            >
              {t.nav.brands} →
            </Link>
          </div>
        </div>
        <div className="absolute -end-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Search + filter bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); applyFilters(); }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-6 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.nav.search}
            className="w-full ps-10 pe-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? t.marketplace.filterAll : c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="newest">{t.marketplace.sortNewest}</option>
          <option value="low">{t.marketplace.sortPriceLow}</option>
          <option value="high">{t.marketplace.sortPriceHigh}</option>
        </select>
        <button type="submit" className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          {locale === 'ku' ? 'فلتەر' : 'Filter'}
        </button>
      </form>

      {/* View toggle: feed ↔ map */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold text-zinc-500">
          {view === 'map'
            ? `${mapItems.length} ${locale === 'ku' ? 'بەرهەم لە نەخشە' : 'items on the map'}`
            : `${items.length} ${locale === 'ku' ? 'بەرهەم' : 'items'}`}
        </div>
        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button
            onClick={() => setViewAndUrl('feed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors ${view === 'feed' ? 'bg-white dark:bg-zinc-900 text-orange-500 shadow-sm' : 'text-zinc-500'}`}
            aria-pressed={view === 'feed'}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            {locale === 'ku' ? 'پشت' : 'Feed'}
          </button>
          <button
            onClick={() => setViewAndUrl('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors ${view === 'map' ? 'bg-white dark:bg-zinc-900 text-orange-500 shadow-sm' : 'text-zinc-500'}`}
            aria-pressed={view === 'map'}
          >
            <MapIcon className="w-3.5 h-3.5" />
            {locale === 'ku' ? 'نەخشە' : 'Map'}
          </button>
        </div>
      </div>

      {view === 'map' ? (
        mapItems.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-bold text-lg">
              {locale === 'ku' ? 'هیچ بەرهەمێک شوێنی نییە' : 'No items have a location yet'}
            </p>
            <p className="text-sm font-medium opacity-70 mt-1">
              {locale === 'ku'
                ? 'لە کاتی پۆستکردندا "شوێنی منی بدۆزەرەوە" کلیک بکە بۆ نیشاندانی لێرە.'
                : 'When posting an item, tap "Use my location" to put it on the map.'}
            </p>
          </div>
        ) : (
          <ItemsMap items={mapItems} />
        )
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-bold text-lg">{t.marketplace.noItems}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
