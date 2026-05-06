'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, Star, Package, Building2, ShoppingCart, Bell, Loader2, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { toast } from '@/components/ui/Toaster';

export function BrandPageClient({ brand, items }: { brand: any; items: any[] }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isOwner = user?.id === brand.owner_id;

  const inStock = items.filter((i) => Number(i.stock ?? 0) > 0).length;
  const outOfStock = items.length - inStock;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link href="/brands" className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-zinc-500 hover:text-orange-500">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t.common.back}
      </Link>

      {/* Brand header */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 mb-6 flex flex-col md:flex-row gap-5 items-start">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black text-4xl overflow-hidden shrink-0">
          {brand.logo_url
            ? // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
            : brand.name?.[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2 flex-wrap">
            {brand.name}
            {brand.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-blue-500/10 text-blue-500">
                <ShieldCheck className="w-3.5 h-3.5" /> {locale === 'ku' ? 'پشتڕاستکراوە' : 'Verified'}
              </span>
            )}
            {isOwner && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-orange-500/10 text-orange-500">
                {locale === 'ku' ? 'تۆ خاوەنیت' : 'You own this'}
              </span>
            )}
          </h1>
          <p className="text-sm font-bold text-zinc-500 mt-1">
            @{brand.owner?.username}
            {brand.owner?.tier === 'gold' && <span className="ms-2 text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-black">GOLD</span>}
            {brand.owner?.tier === 'premium' && <span className="ms-2 text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">PRO</span>}
          </p>
          {brand.description && <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-3 whitespace-pre-wrap">{brand.description}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <Stat label={t.brands.platformFee} value={`${brand.platform_fee}%`} />
            <Stat label={locale === 'ku' ? 'فرۆش' : 'Sales'} value={brand.sales_count ?? 0} />
            <Stat label={locale === 'ku' ? 'هەڵسەنگاندن' : 'Rating'} value={Number(brand.rating || 0).toFixed(1)} icon={<Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />} />
            <Stat label={locale === 'ku' ? 'بەرهەم' : 'Products'} value={items.length} icon={<Package className="w-3.5 h-3.5" />} />
          </div>
        </div>
        {isOwner && (
          <Link href="/seller" className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm shrink-0 hover:opacity-90">
            {locale === 'ku' ? 'بەرهەم زیاد بکە' : 'Add product'}
          </Link>
        )}
      </div>

      {/* Products */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          {locale === 'ku' ? 'بەرهەمەکان' : 'Products'}
          <span className="text-sm font-bold text-zinc-500">({items.length})</span>
        </h2>
        {items.length > 0 && (
          <div className="text-xs font-bold text-zinc-500 flex gap-3">
            <span className="text-emerald-500">{inStock} {locale === 'ku' ? 'لە بەردەستدایە' : 'in stock'}</span>
            {outOfStock > 0 && <span className="text-amber-500">{outOfStock} {locale === 'ku' ? 'پێش-فەرمانگرتن' : 'pre-order'}</span>}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-zinc-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">{locale === 'ku' ? 'هیچ بەرهەمێک تا ئێستا نییە' : 'No products yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              brandSlug={brand.slug}
              ownItem={item.seller_id === user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Product card with inline Buy / Pre-order action so customers don't have to
 * navigate to the item detail page just to add a single product to their cart
 * or join the waitlist. The card image + title still link to the detail page
 * for the full description / images.
 */
function ProductCard({
  item,
  brandSlug,
  ownItem,
}: {
  item: any;
  brandSlug: string;
  ownItem: boolean;
}) {
  const { locale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const stock = Number(item.stock ?? 0);
  const inStock = stock > 0;

  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push(`/login?next=/brands/${encodeURIComponent(brandSlug)}`);
      return;
    }
    if (ownItem) {
      toast(locale === 'ku' ? 'ئەمە بەرهەمی خۆتە' : "This is your own product", 'error');
      return;
    }
    setLoading(true);
    try {
      if (inStock) {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: item.id, quantity: 1 }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Failed');
        toast(locale === 'ku' ? 'زیادکرا بۆ سەبەتە' : 'Added to cart');
      } else {
        const res = await fetch('/api/preorders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_id: item.id, quantity: 1 }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Failed');
        toast(locale === 'ku' ? 'لیستی چاوەڕوانی زیادکرا' : 'Joined waitlist');
      }
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err: any) {
      toast(err.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 transition flex flex-col">
      <Link href={`/items/${item.id}`} className="block">
        <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative">
          {item.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-400 text-3xl font-black">{item.title?.[0]}</div>
          )}
          <span
            className={
              'absolute top-2 end-2 text-[10px] font-black px-2 py-1 rounded-full ' +
              (inStock ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')
            }
          >
            {inStock
              ? `${stock} ${locale === 'ku' ? 'لە بەردەست' : 'in stock'}`
              : (locale === 'ku' ? 'پێش-فەرمانگرتن' : 'Pre-order')}
          </span>
        </div>
        <div className="p-3 pb-2">
          <div className="font-black text-sm truncate">{item.title}</div>
          <div className="font-black text-orange-500 text-sm mt-0.5">
            {Number(item.price).toLocaleString()} {item.currency}
          </div>
        </div>
      </Link>

      <div className="px-3 pb-3 mt-auto">
        <button
          onClick={handleAction}
          disabled={loading || authLoading || ownItem}
          className={
            'w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition disabled:opacity-50 ' +
            (inStock
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/20')
          }
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : done ? (
            <Check className="w-3.5 h-3.5" />
          ) : inStock ? (
            <ShoppingCart className="w-3.5 h-3.5" />
          ) : (
            <Bell className="w-3.5 h-3.5" />
          )}
          {ownItem
            ? (locale === 'ku' ? 'بەرهەمی خۆت' : 'Your product')
            : done
            ? (locale === 'ku' ? 'کرا!' : 'Done!')
            : inStock
            ? (locale === 'ku' ? 'کڕین' : 'Add to cart')
            : (locale === 'ku' ? 'پێش-فەرمان' : 'Pre-order')}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-2.5 text-center">
      <div className="text-[10px] text-zinc-500 font-bold mb-0.5">{label}</div>
      <div className="font-black text-sm flex items-center justify-center gap-1">{icon}{value}</div>
    </div>
  );
}
