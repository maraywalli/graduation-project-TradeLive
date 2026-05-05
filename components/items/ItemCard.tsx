'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { AddToCartButton } from '@/components/cart/AddToCartButton';

export function ItemCard({ item }: { item: any }) {
  const { t, locale } = useI18n();
  const isPremium = item.seller?.tier === 'premium' || item.seller?.tier === 'gold';
  const isGold = item.seller?.tier === 'gold';
  const condLabel = (t.marketplace.condition as any)[item.condition] || item.condition;

  return (
    <Link
      href={`/items/${item.id}`}
      className="group bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-3xl overflow-hidden border border-zinc-200/50 dark:border-zinc-800/50 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {item.images?.[0] ? (
          <Image
            src={item.images[0]}
            alt={item.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-3xl font-black">
            {item.title?.[0] || '?'}
          </div>
        )}
        {isPremium && (
          <span className={`absolute top-2 ${locale === 'ku' ? 'start-2' : 'start-2'} px-2 py-0.5 rounded-full text-[10px] font-black ${
            isGold
              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-950'
              : 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
          }`}>
            {isGold ? '🔥 GOLD' : '🔥 PRO'}
          </span>
        )}
        <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-black/60 text-white backdrop-blur">
          {condLabel}
        </span>
        <div className="absolute bottom-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <AddToCartButton itemId={item.id} compact />
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-black text-sm line-clamp-1 mb-1">{item.title}</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="font-black text-orange-500 text-base">
            {Number(item.price).toLocaleString()} {item.currency}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <Link href={`/u/${item.seller?.username || 'user'}`} className="font-bold truncate hover:text-orange-500 transition-colors">
            @{item.seller?.username || 'user'}
          </Link>
          {item.seller?.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              {Number(item.seller.rating).toFixed(1)}
            </span>
          )}
        </div>
        {item.location && (
          <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{item.location}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
