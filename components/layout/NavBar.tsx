'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, ShoppingBag, Bell, Menu, X, Globe, LogOut, Sun, Moon, LayoutGrid, List } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';

export function NavBar() {
  const { t, locale, toggle } = useI18n();
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [viewMode, setViewMode] = useState<'classic' | 'bento'>('classic');

  // Read cookies on mount
  useEffect(() => {
    const themeCookie = document.cookie.match(/theme=(dark|light)/)?.[1] as 'dark' | 'light' | undefined;
    const vmCookie = document.cookie.match(/view_mode=(bento|classic)/)?.[1] as 'classic' | 'bento' | undefined;
    setTheme(themeCookie || 'light');
    setViewMode(vmCookie || 'classic');
  }, []);

  // Cart count: cached + subscribe + on demand refetch
  useEffect(() => {
    if (!user) { setCartCount(0); return; }
    const sb = createClient();
    const fetchCount = async () => {
      const { count } = await sb.from('cart_items').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      const newCount = count || 0;
      setCartCount(newCount);
      localStorage.setItem('cart_count', newCount.toString());
    };
    // Load from cache first
    const cached = localStorage.getItem('cart_count');
    if (cached) setCartCount(parseInt(cached) || 0);
    // Then fetch fresh
    fetchCount();
    const ch = sb.channel('cart-count').on('postgres_changes',
      { event: '*', schema: 'public', table: 'cart_items', filter: `user_id=eq.${user.id}` }, fetchCount).subscribe();
    const h = () => fetchCount();
    window.addEventListener('cart:changed', h);
    return () => { sb.removeChannel(ch); window.removeEventListener('cart:changed', h); };
  }, [user]);

  const role = (profile as any)?.role;
  const links = [
    { href: '/', label: t.nav.marketplace },
    { href: '/brands', label: t.nav.brands },
    { href: '/events', label: t.nav.events },
    { href: '/courses', label: t.nav.courses },
    ...(role === 'delivery' || role === 'admin'
      ? [{ href: '/courier', label: locale === 'ku' ? 'گەیاندن' : 'Courier' }]
      : []),
    { href: '/delivery', label: t.nav.delivery },
  ];

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/?q=${encodeURIComponent(search)}`);
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    fetch('/api/theme', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: next }) });
  };

  const toggleView = async () => {
    const next = viewMode === 'bento' ? 'classic' : 'bento';
    setViewMode(next);
    document.cookie = `view_mode=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    await fetch('/api/view-mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: next }) });
    if (pathname === '/') router.refresh();
    else router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-orange-500/30">T</div>
          <span className="text-xl font-black hidden sm:inline">TradeLive</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                pathname === l.href
                  ? 'text-orange-500 bg-orange-50 dark:bg-orange-950/30'
                  : 'text-zinc-800 dark:text-zinc-100 hover:text-orange-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}>
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} className="hidden md:flex flex-1 max-w-sm relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.nav.search}
            className="w-full ps-10 pe-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </form>

        <div className="flex items-center gap-1.5">
          <button onClick={toggleView} title={viewMode === 'bento' ? 'Classic view' : 'Bento view'}
            className={`p-2 rounded-lg text-sm font-bold ${viewMode === 'bento' ? 'bg-orange-500 text-white' : 'text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
            {viewMode === 'bento' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>

          <button onClick={toggleTheme} title="Toggle theme"
            className="p-2 rounded-lg text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button onClick={toggle} title="Switch language"
            className="hidden sm:flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <Globe className="w-4 h-4" />{locale === 'ku' ? 'EN' : 'کوردی'}
          </button>

          <Link href="/cart" className="relative p-2 rounded-lg text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="cart">
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link href="/messages" aria-label="messages"
                className="hidden sm:block p-2 rounded-lg text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Bell className="w-5 h-5" />
              </Link>
              <Link href="/profile" className="flex items-center gap-2 p-1.5 pe-3 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-bold">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-xs overflow-hidden">
                  {profile?.avatar_url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : (profile?.username || user.email || '?')[0].toUpperCase()}
                </div>
                <span className="hidden md:inline">{profile?.username || 'profile'}</span>
              </Link>
              <button onClick={async () => { await signOut(); router.push('/'); }} title={t.nav.logout}
                className="hidden sm:flex p-2 rounded-lg text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 rounded-lg text-sm font-bold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">{t.nav.login}</Link>
              <Link href="/signup" className="hidden sm:inline-block px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90">{t.nav.signup}</Link>
            </>
          )}

          <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-lg text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Menu">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <nav className="px-4 py-3 flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-bold ${pathname === l.href ? 'text-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                {l.label}
              </Link>
            ))}
            <button onClick={() => { toggle(); setOpen(false); }}
              className="px-3 py-2.5 rounded-lg text-sm font-bold text-start text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2">
              <Globe className="w-4 h-4" />{locale === 'ku' ? 'English' : 'کوردی'}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
