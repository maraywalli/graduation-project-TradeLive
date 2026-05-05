'use client';

import { useI18n } from '@/lib/i18n/provider';

export function Footer() {
  const { locale } = useI18n();
  const isKu = locale === 'ku';
  return (
    <footer className="hidden md:block border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-8 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center text-white font-black text-sm">T</div>
          <span className="font-black">TradeLive</span>
        </div>
        <div className="flex gap-6 text-sm font-bold text-slate-500">
          <span className="text-slate-500">{isKu ? 'مەرجەکان' : 'Terms'}</span>
          <span className="text-slate-500">{isKu ? 'پاراستنی زانیاری' : 'Privacy'}</span>
          <span className="text-slate-500">{isKu ? 'پەیوەندی' : 'Contact'}</span>
        </div>
        <div className="text-xs text-zinc-400">
          © 2026 TradeLive Pro
        </div>
      </div>
    </footer>
  );
}
