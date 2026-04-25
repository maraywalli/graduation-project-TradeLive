'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';

function ReturnInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { locale } = useI18n();
  const { refresh } = useAuth();
  const [state, setState] = useState<'loading' | 'success' | 'failed' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const orderRef = sp.get('orderRef') || '';
  const sessionId = sp.get('session_id') || '';
  const status = sp.get('status') || 'fail';
  const tx = (en: string, ku: string) => (locale === 'ku' ? ku : en);

  useEffect(() => {
    if (status !== 'success' || !orderRef || !sessionId) {
      setState(status === 'success' ? 'error' : 'failed');
      if (status === 'success' && (!orderRef || !sessionId)) setMessage(tx('Missing order reference', 'ژمارەی داواکاری بزر بوو'));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        let lastErr = '';
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await fetch('/api/billing/stripe/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, orderRef }),
          });
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (res.ok) {
            setState('success');
            await refresh();
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
        setMessage(lastErr || 'Upgrade is taking longer than expected');
      } catch (e: any) {
        if (cancelled) return;
        setState('error');
        setMessage(e?.message || 'Network error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderRef, sessionId, status]);

  const isRtl = locale === 'ku';
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-100">
        {state === 'loading' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <h1 className="text-xl font-bold">{tx('Activating upgrade…', 'چالاککردنی بەرزکردنەوە…')}</h1>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center text-3xl">✓</div>
            <h1 className="text-2xl font-bold text-green-400">{tx('Upgrade activated', 'بەرزکردنەوە چالاککرا')}</h1>
            <p className="text-zinc-400 mt-2">{tx('Your account has been upgraded.', 'هەژمارەکەت بەرزکرایەوە.')}</p>
            <button onClick={() => router.push('/profile')} className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg">
              {tx('Go to profile', 'بڕۆ بۆ پرۆفایل')}
            </button>
          </>
        )}
        {(state === 'failed' || state === 'error') && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center text-3xl">{state === 'error' ? '!' : '✕'}</div>
            <h1 className="text-2xl font-bold text-red-400">
              {state === 'error' ? tx('Something went wrong', 'هەڵەیەک ڕوویدا') : tx('Payment failed', 'پارەدان سەرکەوتوو نەبوو')}
            </h1>
            {message && <p className="text-zinc-400 mt-2 text-sm break-words">{message}</p>}
            <button onClick={() => router.push('/profile')} className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg">
              {tx('Back to profile', 'گەڕانەوە بۆ پرۆفایل')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function BillingReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <ReturnInner />
    </Suspense>
  );
}
