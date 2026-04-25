'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Building2, Calendar, GraduationCap, User } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const items = [
    { href: '/', label: t.nav.marketplace, Icon: Home },
    { href: '/brands', label: t.nav.brands, Icon: Building2 },
    { href: '/events', label: t.nav.events, Icon: Calendar },
    { href: '/courses', label: t.nav.courses, Icon: GraduationCap },
    { href: '/profile', label: t.nav.profile, Icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-stretch justify-around h-16">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-xs font-bold ${
                active ? 'text-orange-500' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'fill-orange-500/20' : ''}`} />
              <span className="truncate max-w-[60px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
