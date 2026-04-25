'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, ShoppingBag, Calendar, Building2, GraduationCap, Truck, ArrowRight, MapPin } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { ItemCard } from '@/components/items/ItemCard';

const CATEGORIES = ['all', 'electronics', 'fashion', 'home', 'vehicles', 'beauty', 'sports', 'kids', 'other'];

// iOS 26 "liquid glass" base: thin highlight ring + specular sheen + soft tinted glow.
// Used together with a colored gradient `bg-` on the same element.
const GLASS_BASE =
  'group relative overflow-hidden rounded-[28px] backdrop-saturate-150 ' +
  'border border-white/25 ' +
  'shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),inset_0_-1px_2px_rgba(0,0,0,0.18),0_20px_40px_-20px_rgba(0,0,0,0.45)] ' +
  'transition-all duration-300 hover:-translate-y-0.5 ' +
  // top-left specular highlight
  'before:content-[""] before:absolute before:inset-0 before:rounded-[28px] before:pointer-events-none ' +
  'before:bg-[radial-gradient(120%_80%_at_15%_-10%,rgba(255,255,255,0.55),transparent_55%)] ' +
  // bottom edge gloss line
  'after:content-[""] after:absolute after:inset-x-6 after:bottom-0 after:h-px after:pointer-events-none ' +
  'after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent';

// Inner glass chip used for items inside colored cards
const CHIP_GLASS =
  'bg-white/15 backdrop-blur-xl backdrop-saturate-150 border border-white/20 rounded-2xl ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:bg-white/25 transition-colors';

export function BentoHomeClient({
  items, events, brands, courses,
  initialQuery, initialCategory,
}: {
  items: any[]; events: any[]; brands: any[]; courses: any[];
  initialQuery: string; initialCategory: string;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<'newest' | 'low' | 'high'>('newest');

  const sortedItems = useMemo(() => {
    const arr = [...items];
    if (sort === 'low') arr.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sort === 'high') arr.sort((a, b) => Number(b.price) - Number(a.price));
    return arr;
  }, [items, sort]);

  const apply = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category !== 'all') params.set('cat', category);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-3 py-3 relative">
      {/* Ambient color blobs that the frosted glass refracts over */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-10 w-[480px] h-[480px] rounded-full bg-orange-500/30 blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[420px] h-[420px] rounded-full bg-fuchsia-500/25 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-blue-500/25 blur-[140px]" />
      </div>

      <div className="grid grid-cols-12 gap-3 auto-rows-[minmax(140px,auto)]">
        {/* MARKETPLACE — wide left column */}
        <section
          className={`${GLASS_BASE} col-span-12 md:col-span-8 lg:col-span-9 row-span-4 flex flex-col bg-white/60 dark:bg-zinc-900/55 backdrop-blur-2xl`}
        >
          <div className="relative z-10 p-4 border-b border-white/30 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-lg flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-orange-500" /> {t.marketplace.title}</h2>
              <Link href="/seller" className="text-xs font-black text-orange-500 hover:text-orange-600">{t.marketplace.addItem} →</Link>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); apply(); }} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.nav.search}
                  className="w-full ps-10 pe-3 py-2 bg-white/70 dark:bg-zinc-800/60 border border-white/40 dark:border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="px-2 py-2 bg-white/70 dark:bg-zinc-800/60 border border-white/40 dark:border-white/10 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? t.marketplace.filterAll : c}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as any)}
                className="px-2 py-2 bg-white/70 dark:bg-zinc-800/60 border border-white/40 dark:border-white/10 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="newest">{t.marketplace.sortNewest}</option>
                <option value="low">{t.marketplace.sortPriceLow}</option>
                <option value="high">{t.marketplace.sortPriceHigh}</option>
              </select>
              <button type="submit" className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold flex items-center gap-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_20px_-6px_rgba(249,115,22,0.6)]">
                <Filter className="w-3 h-3" />
              </button>
            </form>
          </div>
          <div className="relative z-10 flex-1 overflow-y-auto p-4 max-h-[calc(100vh-12rem)]">
            {sortedItems.length === 0 ? (
              <div className="text-center py-20 text-zinc-500"><ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" /><p className="font-bold">{t.marketplace.noItems}</p></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sortedItems.map((item) => <ItemCard key={item.id} item={item} />)}
              </div>
            )}
          </div>
        </section>

        {/* EVENTS */}
        <Link
          href="/events"
          style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.85),rgba(192,38,211,0.85))' }}
          className={`${GLASS_BASE} col-span-6 md:col-span-4 lg:col-span-3 row-span-2 text-white p-5 backdrop-blur-2xl hover:shadow-[0_30px_60px_-20px_rgba(168,85,247,0.55)]`}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 font-black"><Calendar className="w-5 h-5" /> {t.events.title}</div>
              <span className="text-xs font-black bg-white/25 backdrop-blur px-2 py-0.5 rounded-full border border-white/20">{events.length}</span>
            </div>
            <div className="space-y-2 mt-2 max-h-[260px] overflow-y-auto pr-1">
              {events.length === 0 ? <p className="text-xs font-bold opacity-80">{t.events.noEvents}</p> : events.slice(0, 4).map((e) => (
                <div key={e.id} className={`${CHIP_GLASS} p-2.5`}>
                  <div className="text-xs font-black line-clamp-1">{e.title}</div>
                  <div className="text-[10px] opacity-80 font-bold mt-0.5 flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{e.venue}</div>
                  <div className="text-[10px] opacity-80 font-bold">{new Date(e.starts_at).toLocaleDateString(locale === 'ku' ? 'ku' : 'en-US')}</div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-3 right-3 text-xs font-black opacity-90 group-hover:opacity-100 flex items-center gap-1">{t.events.buyTicket} <ArrowRight className="w-3 h-3" /></div>
          </div>
        </Link>

        {/* BRANDS */}
        <Link
          href="/brands"
          style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.85),rgba(79,70,229,0.85))' }}
          className={`${GLASS_BASE} col-span-6 md:col-span-4 lg:col-span-3 text-white p-5 backdrop-blur-2xl hover:shadow-[0_30px_60px_-20px_rgba(59,130,246,0.55)]`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-black mb-3"><Building2 className="w-5 h-5" /> {t.brands.title}</div>
            <div className="flex -space-x-2 mb-2">
              {brands.slice(0, 6).map((b) => (
                <div key={b.id} className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-xl border-2 border-white/50 flex items-center justify-center text-xs font-black overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                  {b.logo_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.logo_url} alt="" className="w-full h-full object-cover" /> : (b.name?.[0] || '?').toUpperCase()}
                </div>
              ))}
            </div>
            <div className="text-xs font-bold opacity-90">{brands.length} {locale === 'ku' ? 'مارکە' : 'verified brands'}</div>
          </div>
        </Link>

        {/* COURSES */}
        <Link
          href="/courses"
          style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.85),rgba(20,184,166,0.85))' }}
          className={`${GLASS_BASE} col-span-6 md:col-span-4 lg:col-span-3 text-white p-5 backdrop-blur-2xl hover:shadow-[0_30px_60px_-20px_rgba(16,185,129,0.55)]`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-black mb-3"><GraduationCap className="w-5 h-5" /> {t.courses.title}</div>
            <div className="space-y-1 max-h-[100px] overflow-y-auto">
              {courses.slice(0, 3).map((c) => (
                <div key={c.id} className="text-xs font-bold line-clamp-1 opacity-90">• {c.title}</div>
              ))}
            </div>
            <div className="absolute bottom-3 right-3 text-xs font-black opacity-90 group-hover:opacity-100 flex items-center gap-1">{t.courses.enroll} <ArrowRight className="w-3 h-3" /></div>
          </div>
        </Link>

        {/* DELIVERY */}
        <Link
          href="/delivery"
          style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.85),rgba(234,88,12,0.9))' }}
          className={`${GLASS_BASE} col-span-6 md:col-span-4 lg:col-span-3 text-white p-5 backdrop-blur-2xl hover:shadow-[0_30px_60px_-20px_rgba(245,158,11,0.55)]`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-black mb-2"><Truck className="w-5 h-5" /> {t.delivery.title}</div>
            <p className="text-xs font-bold opacity-90 mb-2">{locale === 'ku' ? 'گەیاندنی خێرا بە شوێنپێهەڵگری ڕاستەوخۆ' : 'Fast delivery with live tracking'}</p>
            <div className="absolute bottom-3 right-3 text-xs font-black opacity-90 group-hover:opacity-100 flex items-center gap-1">{t.delivery.requestDelivery} <ArrowRight className="w-3 h-3" /></div>
          </div>
        </Link>

        {/* CART SHORTCUT */}
        <Link
          href="/cart"
          style={{ background: 'linear-gradient(135deg,rgba(39,39,42,0.75),rgba(9,9,11,0.85))' }}
          className={`${GLASS_BASE} col-span-12 md:col-span-4 lg:col-span-3 text-white p-5 backdrop-blur-2xl hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-black mb-2"><ShoppingBag className="w-5 h-5 text-orange-400" /> {locale === 'ku' ? 'سەبەتە' : 'Your cart'}</div>
            <p className="text-xs font-bold opacity-70 mb-2">{locale === 'ku' ? 'تەواوکردنی پارەدان بە کارتی Visa/Mastercard' : 'Checkout with Visa or Mastercard'}</p>
            <div className="absolute bottom-3 right-3 text-xs font-black opacity-90 group-hover:opacity-100 flex items-center gap-1">{locale === 'ku' ? 'بینین' : 'View'} <ArrowRight className="w-3 h-3" /></div>
          </div>
        </Link>
      </div>
    </div>
  );
}
