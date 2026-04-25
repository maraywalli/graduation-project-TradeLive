'use client';

import { useI18n } from '@/lib/i18n/provider';

export function Footer() {
  const { locale } = useI18n();
  const isKu = locale === 'ku';
  return (
    <footer className="hidden md:block border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-8 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white font-black text-sm">T</div>
          <span className="font-black">TradeLive</span>
        </div>
        <div className="flex gap-6 text-sm font-bold text-zinc-500">
          <a href="#" className="hover:text-orange-500">{isKu ? 'مەرجەکان' : 'Terms'}</a>
          <a href="#" className="hover:text-orange-500">{isKu ? 'پاراستنی زانیاری' : 'Privacy'}</a>
          <a href="#" className="hover:text-orange-500">{isKu ? 'پەیوەندی' : 'Contact'}</a>
        </div>
        <div className="text-xs text-zinc-400">
          © 2026 TradeLive Pro
        </div>
      </div>
    </footer>
  );
}
