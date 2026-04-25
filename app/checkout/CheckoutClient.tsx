'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ShieldCheck, ArrowLeft, AlertCircle, ShoppingBag } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';

type CartLine = {
  id: string;
  quantity: number;
  item: {
    id: string;
    title: string;
    price: number;
    currency: string;
    images: string[] | null;
  };
};

export function CheckoutClient() {
  const { locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const tx = (en: string, ku: string) => (locale === 'ku' ? ku : en);

  const [lines, setLines] = useState<CartLine[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load cart for the order summary
  useEffect(() => {
    if (user === null) { router.push('/login?next=/checkout'); return; }
    if (!user) return;
    const sb = createClient();
    sb.from('cart_items')
      .select('id, quantity, item:items(id, title, price, currency, images)')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setLines((data as any) || []);
        setLoading(false);
      });
  }, [user, router]);

  const totalIqd = (lines || []).reduce(
    (s, l) => s + Number(l.item.price) * l.quantity,
    0,
  );

  const startPayment = async () => {
    setPaying(true);
    setErr(null);
    try {
      const res = await fetch('/api/checkout/stripe/intent', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start payment');
      // Redirect to Stripe-hosted Checkout
      window.location.href = data.url;
    } catch (e: any) {
      setErr(e?.message || 'Network error');
      setPaying(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/cart" className="inline-flex items-center gap-1 text-sm font-bold text-zinc-500 hover:text-orange-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> {tx('Back to cart', 'گەڕانەوە بۆ سەبەتە')}
      </Link>

      <h1 className="text-2xl md:text-3xl font-black mb-6 flex items-center gap-2">
        <ShoppingBag className="w-7 h-7 text-orange-500" />
        {tx('Secure checkout', 'پارەدانی پارێزراو')}
      </h1>

      {loading && (
        <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" /></div>
      )}

      {!loading && lines && lines.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="font-bold mb-3">{tx('Your cart is empty.', 'سەبەتەکەت بەتاڵە.')}</p>
          <Link href="/marketplace" className="inline-block px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold">
            {tx('Browse marketplace', 'بازاڕ ببینە')}
          </Link>
        </div>
      )}

      {!loading && lines && lines.length > 0 && (
        <div className="grid lg:grid-cols-[1fr_300px] gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-black mb-4">{tx('Order summary', 'پوختەی داواکاری')}</h3>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {lines.map((l) => {
                const img = l.item.images?.[0];
                return (
                  <li key={l.id} className="py-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0 relative">
                      {img && (
                        <Image src={img} alt={l.item.title} fill sizes="56px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{l.item.title}</p>
                      <p className="text-xs text-zinc-500 font-bold">
                        <span dir="ltr">{l.quantity} × {Number(l.item.price).toLocaleString()} IQD</span>
                      </p>
                    </div>
                    <div className="font-black text-sm" dir="ltr">
                      {(Number(l.item.price) * l.quantity).toLocaleString()} IQD
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <aside className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 h-fit">
            <h3 className="font-black mb-3">{tx('Total', 'کۆ')}</h3>
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-sm font-bold text-zinc-500">{tx('Amount', 'بڕ')}</span>
              <span className="text-2xl font-black text-orange-500" dir="ltr">
                {totalIqd.toLocaleString()} IQD
              </span>
            </div>

            {err && (
              <div className="mb-3 flex gap-2 items-start bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-600 dark:text-red-300">{err}</p>
              </div>
            )}

            <button
              onClick={startPayment}
              disabled={paying}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {paying
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ShieldCheck className="w-4 h-4" />}
              {tx('Pay with card', 'پارەدان بە کارت')}
            </button>
            <p className="text-[10px] text-zinc-400 text-center mt-3 font-bold flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              {tx('Secure payment powered by Stripe', 'پارەدانی پارێزراو بە Stripe')}
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
