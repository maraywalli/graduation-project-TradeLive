'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2, Plus, Minus, Loader2, ArrowRight, CreditCard, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { toast } from '@/components/ui/Toaster';

export function CartClient() {
  const { t, locale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    const res = await fetch('/api/cart');
    const json = await res.json();
    setItems(json.items || []);
    setLoading(false);
  };

  useEffect(() => {
    // Server gate in app/cart/page.tsx already redirects unauth users.
    // Only react once the client auth provider has finished hydrating to
    // avoid a redirect race for valid logged-in users on hard refresh.
    if (authLoading) return;
    if (!user) { router.push('/login?next=/cart'); return; }
    refresh();
  }, [user, authLoading, router]);

  const setQty = async (id: string, q: number) => {
    setBusy(id);
    await fetch('/api/cart', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, quantity: q }) });
    setBusy(null);
    await refresh();
    window.dispatchEvent(new CustomEvent('cart:changed'));
  };
  const remove = async (id: string) => {
    setBusy(id);
    await fetch('/api/cart', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setBusy(null);
    await refresh();
    window.dispatchEvent(new CustomEvent('cart:changed'));
  };
  const clear = async () => {
    if (!confirm(locale === 'ku' ? 'سەبەتە بە تەواوی بسڕەوە؟' : 'Empty the entire cart?')) return;
    await fetch('/api/cart', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: '__all__' }) });
    await refresh();
    window.dispatchEvent(new CustomEvent('cart:changed'));
  };

  const subtotal = items.reduce((s, ci) => s + Number(ci.item?.price || 0) * ci.quantity, 0);
  const currency = items[0]?.item?.currency || t.common.currency;

  if (loading) return <div className="p-12 text-center text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <ShoppingBag className="w-7 h-7 text-orange-500" /> {locale === 'ku' ? 'سەبەتەی کڕین' : 'Shopping cart'}
        </h1>
        {items.length > 0 && (
          <button onClick={clear} className="text-sm font-bold text-red-500 hover:text-red-600">{locale === 'ku' ? 'سڕینەوەی هەموو' : 'Clear all'}</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-bold text-lg mb-4">{locale === 'ku' ? 'سەبەتەکەت بەتاڵە' : 'Your cart is empty'}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-orange-500 text-white font-black">
            {locale === 'ku' ? 'بگەڕێرەوە بۆ بازاڕ' : 'Browse marketplace'} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <div className="flex flex-col gap-3">
            {items.map((ci) => (
              <div key={ci.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                <Link href={`/items/${ci.item.id}`} className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0">
                  {ci.item?.images?.[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={ci.item.images[0]} alt="" className="w-full h-full object-cover" />}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/items/${ci.item.id}`} className="font-black text-sm line-clamp-1 hover:text-orange-500">{ci.item.title}</Link>
                  <p className="text-xs font-bold text-zinc-500">@{ci.item?.seller?.username}</p>
                  <p className="font-black text-orange-500 mt-1">{Number(ci.item.price).toLocaleString()} {ci.item.currency}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button disabled={busy === ci.id} onClick={() => setQty(ci.id, ci.quantity - 1)} className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"><Minus className="w-3 h-3" /></button>
                  <span className="font-black w-7 text-center">{ci.quantity}</span>
                  <button disabled={busy === ci.id} onClick={() => setQty(ci.id, ci.quantity + 1)} className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"><Plus className="w-3 h-3" /></button>
                </div>
                {ci.item?.seller?.id && (
                  <Link
                    href={`/messages?with=${ci.item.seller.id}`}
                    title={locale === 'ku' ? 'نامە بنێرە بۆ فرۆشیار' : 'Message seller'}
                    aria-label={locale === 'ku' ? 'نامە بنێرە بۆ فرۆشیار' : 'Message seller'}
                    className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Link>
                )}
                <button disabled={busy === ci.id} onClick={() => remove(ci.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <aside className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 h-fit sticky top-20">
            <h2 className="font-black mb-4">{locale === 'ku' ? 'پوختە' : 'Order summary'}</h2>
            <div className="flex justify-between text-sm font-bold mb-2"><span>{locale === 'ku' ? 'کۆ' : 'Subtotal'}</span><span>{subtotal.toLocaleString()} {currency}</span></div>
            <div className="flex justify-between text-sm font-bold mb-2"><span>{locale === 'ku' ? 'گەیاندن' : 'Shipping'}</span><span className="text-emerald-500">{locale === 'ku' ? 'بێبەرامبەر' : 'Free'}</span></div>
            <div className="border-t border-zinc-200 dark:border-zinc-800 my-3" />
            <div className="flex justify-between font-black text-lg mb-4"><span>{locale === 'ku' ? 'گشتی' : 'Total'}</span><span className="text-orange-500">{subtotal.toLocaleString()} {currency}</span></div>
            <Link href="/checkout" className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 hover:opacity-90">
              <CreditCard className="w-4 h-4" /> {locale === 'ku' ? 'پارەدان' : 'Checkout'}
            </Link>
            <p className="text-[11px] text-zinc-400 text-center mt-3 font-bold">💳 Visa · Mastercard · Amex</p>
          </aside>
        </div>
      )}
    </div>
  );
}
