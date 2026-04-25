'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, MapPin, ShoppingCart, MessageCircle, ArrowLeft, Loader2, Trash2, Edit, Clock, Package, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';

export function ItemDetailClient({ item }: { item: any }) {
  const { t, locale } = useI18n();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [buying, setBuying] = useState(false);
  const [preordering, setPreordering] = useState(false);
  const [hasPreorder, setHasPreorder] = useState(false);
  const isOwner = user?.id === item.seller_id;
  const stock = Number(item.stock ?? 0);
  const inStock = stock > 0;

  // Check whether the current user is already on the waitlist for this item.
  useEffect(() => {
    if (!user || isOwner || inStock) { setHasPreorder(false); return; }
    let abort = false;
    fetch('/api/preorders')
      .then((r) => r.json())
      .then((j) => {
        if (abort) return;
        const list: any[] = j.preorders || [];
        setHasPreorder(list.some((p) => p.item_id === item.id && p.status !== 'cancelled' && p.status !== 'fulfilled'));
      })
      .catch(() => {});
    return () => { abort = true; };
  }, [user?.id, item.id, isOwner, inStock]);

  const buy = async () => {
    if (!user) { router.push('/login?next=/items/' + item.id); return; }
    if (!inStock) return;
    setBuying(true);
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, quantity: 1 }),
    });
    setBuying(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return toast(j.error || (locale === 'ku' ? 'هەڵە ڕوویدا' : 'Something went wrong'), 'error');
    }
    window.dispatchEvent(new CustomEvent('cart:changed'));
    router.push('/checkout');
  };

  const preorder = async () => {
    if (!user) { router.push('/login?next=/items/' + item.id); return; }
    setPreordering(true);
    if (hasPreorder) {
      const res = await fetch(`/api/preorders?item_id=${item.id}`, { method: 'DELETE' });
      setPreordering(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return toast(j.error || 'Failed', 'error');
      }
      setHasPreorder(false);
      toast(locale === 'ku' ? 'لە لیست لابرا' : 'Removed from waitlist');
      return;
    }
    const res = await fetch('/api/preorders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: item.id, quantity: 1 }),
    });
    setPreordering(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return toast(j.error || 'Failed', 'error');
    setHasPreorder(true);
    toast(locale === 'ku' ? 'تۆ لە لیستی پێش-فەرمانگرتنیت' : "You're on the waitlist");
  };

  const messageSeller = async () => {
    if (!user) { router.push('/login'); return; }
    const ids = [user.id, item.seller_id].sort();
    router.push(`/messages?with=${item.seller_id}&item=${item.id}`);
  };

  const deleteItem = async () => {
    if (!confirm(locale === 'ku' ? 'دڵنیای؟' : 'Are you sure?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('items').delete().eq('id', item.id);
    if (error) return toast(error.message, 'error');
    toast(t.common.success);
    router.push('/');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm font-bold text-zinc-500 hover:text-orange-500">
        <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t.common.back}
      </button>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square rounded-3xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-3">
            {item.images?.[activeImage] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.images[activeImage]} alt={item.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 text-6xl font-black">{item.title?.[0]}</div>
            )}
          </div>
          {item.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {item.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 ${
                    i === activeImage ? 'border-orange-500' : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl md:text-4xl font-black mb-2">{item.title}</h1>
          <p className="text-3xl font-black text-orange-500 mb-4">
            {Number(item.price).toLocaleString()} {item.currency}
          </p>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span
              className={
                'px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ' +
                (inStock ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')
              }
            >
              <Package className="w-3 h-3" />
              {inStock
                ? (locale === 'ku' ? `${stock} لە بەردەستە` : `${stock} in stock`)
                : (locale === 'ku' ? 'نییە — پێش-فەرمانگرتن' : 'Out of stock — pre-order')}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-zinc-100 dark:bg-zinc-800">
              {(t.marketplace.condition as any)[item.condition] || item.condition}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-zinc-100 dark:bg-zinc-800">{item.category}</span>
            {item.location && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-zinc-100 dark:bg-zinc-800 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {item.location}
              </span>
            )}
            {item.brand && (
              <Link
                href={`/brands/${item.brand.slug}`}
                className="px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-500 hover:bg-orange-500/20"
              >
                {item.brand.name}
              </Link>
            )}
          </div>

          {item.description && (
            <div className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl">
              <p className="text-sm whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          {/* Seller card */}
          <Link
            href={`/u/${item.seller?.username}`}
            className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 mb-6 hover:border-orange-500"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black">
              {(item.seller?.username || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-black flex items-center gap-2">
                @{item.seller?.username}
                {item.seller?.tier === 'gold' && <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-black">GOLD</span>}
                {item.seller?.tier === 'premium' && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">PRO</span>}
              </div>
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                {item.seller?.rating > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {Number(item.seller.rating).toFixed(1)}
                  </span>
                )}
                <span>{item.seller?.sales_count || 0} {locale === 'ku' ? 'فرۆش' : 'sales'}</span>
              </div>
            </div>
          </Link>

          {isOwner ? (
            <div className="flex gap-3">
              <Link href={`/seller?edit=${item.id}`} className="flex-1 py-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-black flex items-center justify-center gap-2">
                <Edit className="w-4 h-4" /> {t.common.edit}
              </Link>
              <button onClick={deleteItem} className="px-5 py-3 rounded-xl bg-red-500 text-white font-black flex items-center justify-center gap-2 hover:bg-red-600">
                <Trash2 className="w-4 h-4" /> {t.common.delete}
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              {inStock ? (
                <button
                  onClick={buy}
                  disabled={buying}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                >
                  {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  {t.common.buy}
                </button>
              ) : (
                <button
                  onClick={preorder}
                  disabled={preordering}
                  className={
                    'flex-1 py-3 rounded-xl text-white font-black flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 ' +
                    (hasPreorder ? 'bg-emerald-600' : 'bg-amber-500')
                  }
                >
                  {preordering ? <Loader2 className="w-4 h-4 animate-spin" /> : hasPreorder ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {hasPreorder
                    ? (locale === 'ku' ? 'تۆ لە لیستی پێش-فەرمانگرتنیت — کلیک بکە بۆ لابردن' : "On waitlist — tap to leave")
                    : (locale === 'ku' ? 'پێش-فەرمانگرتن (ئاگادار دەکرێیتەوە)' : 'Pre-order (notify on restock)')}
                </button>
              )}
              <button
                onClick={messageSeller}
                className="px-5 py-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-black flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
