'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useI18n } from '@/lib/i18n/provider';

function ReturnInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { locale } = useI18n();
  const [state, setState] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  const orderRef = sp.get('orderRef') || '';
  const status = sp.get('status') || 'fail';

  useEffect(() => {
    if (!orderRef) { setState('error'); setMessage(locale === 'ku' ? 'ژمارەی داواکاری بزر بوو' : 'Missing order reference'); return; }
    if (status !== 'success') { setState('failed'); return; }
    let cancelled = false;
    (async () => {
      try {
        // Retry up to 3× to absorb 202 "still processing" responses from
        // concurrent finalizers.
        let lastErr = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await fetch('/api/checkout/stripe/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderRef }),
          });
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (res.ok) {
            setState('success');
            window.dispatchEvent(new CustomEvent('cart:changed'));
            return;
          }
          if (res.status === 202) {
            await new Promise((r) => setTimeout(r, 800));
            lastErr = data?.message || 'Still processing';
            continue;
          }
          setState('error');
          setMessage(data?.error || `HTTP ${res.status}`);
          return;
        }
        setState('error');
        setMessage(lastErr || 'Payment is taking longer than expected');
      } catch (e: any) {
        if (cancelled) return;
        setState('error');
        setMessage(e?.message || 'Network error');
      }
    })();
    return () => { cancelled = true; };
  }, [orderRef, status, locale]);

  const isRtl = locale === 'ku';
  const tx = (en: string, ku: string) => (locale === 'ku' ? ku : en);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-100">
        {state === 'loading' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <h1 className="text-xl font-bold">{tx('Verifying payment…', 'پشتڕاستکردنەوەی پارەدان…')}</h1>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center text-3xl">✓</div>
            <h1 className="text-2xl font-bold text-green-400">{tx('Payment successful', 'پارەدان سەرکەوتوو بوو')}</h1>
            <p className="text-zinc-400 mt-2">{tx('Your order has been placed.', 'داواکارییەکەت تۆمارکرا.')}</p>
            <div className="flex gap-2 mt-6">
              <button onClick={() => router.push('/profile')} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg">
                {tx('View orders', 'بینینی داواکارییەکان')}
              </button>
              <button onClick={() => router.push('/marketplace')} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 py-2.5 rounded-lg">
                {tx('Continue shopping', 'بەردەوام بە')}
              </button>
            </div>
          </>
        )}
        {state === 'failed' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center text-3xl">✕</div>
            <h1 className="text-2xl font-bold text-red-400">{tx('Payment failed', 'پارەدان سەرکەوتوو نەبوو')}</h1>
            <p className="text-zinc-400 mt-2">{tx('No charge was made. You can try again.', 'هیچ پارەیەک نەکێشرایەوە. دەتوانیت دووبارە هەوڵبدەیتەوە.')}</p>
            <button onClick={() => router.push('/cart')} className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg">
              {tx('Back to cart', 'گەڕانەوە بۆ سەبەتە')}
            </button>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center text-3xl">!</div>
            <h1 className="text-2xl font-bold text-amber-400">{tx('Something went wrong', 'هەڵەیەک ڕوویدا')}</h1>
            <p className="text-zinc-400 mt-2 text-sm break-words">{message}</p>
            <button onClick={() => router.push('/cart')} className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg">
              {tx('Back', 'گەڕانەوە')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ReturnInner />
    </Suspense>
  );
}
