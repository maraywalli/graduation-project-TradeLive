'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck, AlertCircle, Crown, Truck, Star, Briefcase } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { priceForUpgrade, type UpgradeKind } from '@/lib/billing';

const META: Record<string, { icon: React.ReactNode; titleEn: string; titleKu: string; descEn: string; descKu: string }> = {
  seller:   { icon: <Briefcase className="w-7 h-7" />, titleEn: 'Become a Seller',  titleKu: 'بەرزکردنەوە بۆ فرۆشیار',  descEn: 'List items, manage your shop, accept orders.', descKu: 'بەرهەم دابنێ، کارگەکەت بەڕێوەببە و داواکاری وەربگرە.' },
  delivery: { icon: <Truck className="w-7 h-7" />,    titleEn: 'Become a Courier',  titleKu: 'بەرزکردنەوە بۆ گەیاندن', descEn: 'Pick up delivery jobs and earn fees.',          descKu: 'گەیاندن وەربگرە و قازانج بکە.' },
  gold:     { icon: <Star className="w-7 h-7" />,     titleEn: 'Gold Membership',   titleKu: 'ئەندامێتی زێڕین',         descEn: 'Better feed placement, gold badge, stats.',     descKu: 'پێشخستنی پۆست، نیشانی زێڕین، ئاماری زیاتر.' },
  premium:  { icon: <Crown className="w-7 h-7" />,    titleEn: 'Premium Membership', titleKu: 'ئەندامێتی پریمیۆم',     descEn: 'Top placement, premium badge, AI tools, priority.', descKu: 'سەرەوە لە بازاڕ، نیشانی پریمیۆم، ئامرازەکانی AI.' },
};

export function UpgradeClient({ kind, value }: { kind: 'role' | 'tier'; value: string }) {
  const { locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tx = (en: string, ku: string) => (locale === 'ku' ? ku : en);

  // Compute the price client-side from the same source of truth as the API.
  const validValue =
    (kind === 'role' && (value === 'seller' || value === 'delivery')) ||
    (kind === 'tier' && (value === 'gold' || value === 'premium'));
  const priceUsd = validValue ? priceForUpgrade({ kind, value } as UpgradeKind) : 0;

  useEffect(() => {
    if (user === null) {
      router.push(`/login?next=/billing/upgrade?kind=${kind}&value=${value}`);
    }
  }, [user, router, kind, value]);

  if (user === null) return null;

  const meta = META[value] || META.gold;

  const startPayment = async () => {
    if (!validValue) {
      setErr(tx('Invalid upgrade option', 'بژاردەی بەرزکردنەوە نادروستە'));
      return;
    }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/billing/stripe/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start payment');
      window.location.href = data.url;
    } catch (e: any) {
      setErr(e?.message || 'Network error');
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-bold text-zinc-500 hover:text-orange-500 mb-4">
        <ArrowLeft className="w-4 h-4" /> {tx('Back to profile', 'گەڕانەوە بۆ پرۆفایل')}
      </Link>

      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 text-white mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">{meta.icon}</div>
        <div className="flex-1">
          <h1 className="text-2xl font-black">{tx(meta.titleEn, meta.titleKu)}</h1>
          <p className="text-sm opacity-90 font-bold">{tx(meta.descEn, meta.descKu)}</p>
        </div>
        <div className="text-end">
          <div className="text-2xl font-black" dir="ltr">
            {priceUsd ? '$' + priceUsd.toFixed(2) : '—'}
          </div>
          <div className="text-xs font-bold opacity-80">
            {kind === 'tier' ? tx('/month', '/مانگ') : tx('one-time', 'یەک جار')}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
        <h3 className="font-black mb-2">{tx('Pay with card', 'پارەدان بە کارت')}</h3>
        <p className="text-sm text-zinc-500 font-medium mb-5">
          {tx(
            'You will be redirected to the Stripe hosted payment page to complete this upgrade securely.',
            'دەنێردرێیتە پەڕەی پارەدانی Stripe بۆ تەواوکردنی بەرزکردنەوەکە بە شێوەیەکی پارێزراو.',
          )}
        </p>

        {err && (
          <div className="mb-4 flex gap-2 items-start bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-600 dark:text-red-300">{err}</p>
          </div>
        )}

        <button
          onClick={startPayment}
          disabled={busy || !validValue}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {tx(`Pay $${priceUsd.toFixed(2)}`, `پارە بدە $${priceUsd.toFixed(2)}`)}
        </button>
        <p className="text-[10px] text-zinc-400 text-center mt-3 font-bold">
          {tx('Powered by Stripe · Secure', 'بە یارمەتی Stripe · پارێزراو')}
        </p>
      </div>
    </div>
  );
}
