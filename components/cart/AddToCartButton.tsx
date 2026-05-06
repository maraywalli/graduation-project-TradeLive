'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingBag, Check, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { toast } from '@/components/ui/Toaster';

export function AddToCartButton({ itemId, compact = false, label }: { itemId: string; compact?: boolean; label?: string }) {
  const { locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const add = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push(`/login?next=${encodeURIComponent(pathname || '/')}`); return; }
    setLoading(true);
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, quantity: 1 }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast(j.error || 'Failed', 'error');
      return;
    }
    setAdded(true);
    toast(locale === 'ku' ? 'بۆ سەبەتە زیادکرا' : 'Added to cart');
    window.dispatchEvent(new CustomEvent('cart:changed'));
    setTimeout(() => setAdded(false), 1500);
  };

  if (compact) {
    return (
      <button onClick={add} disabled={loading}
        className="p-2 rounded-lg bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow hover:bg-orange-500 hover:text-white text-orange-500 transition-all disabled:opacity-50"
        aria-label="add to cart">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : added ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button onClick={add} disabled={loading}
      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black hover:opacity-90 disabled:opacity-50">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : added ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
      {label || (locale === 'ku' ? 'بۆ سەبەتە' : 'Add to cart')}
    </button>
  );
}
