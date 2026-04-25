import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { I18nProvider } from '@/lib/i18n/provider';
import { AuthProvider } from '@/lib/auth/provider';
import { Toaster } from '@/components/ui/Toaster';
import { NavBar } from '@/components/layout/NavBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import type { Locale } from '@/lib/i18n/dictionaries';
import './globals.css';

export const metadata: Metadata = {
  title: 'TradeLive Pro',
  description: 'Premium All-in-One Live Commerce & Marketplace Platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = (cookieStore.get('locale')?.value as Locale) || 'ku';
  const themeCookie = cookieStore.get('theme')?.value || 'dark';
  const dir = localeCookie === 'ku' ? 'rtl' : 'ltr';

  return (
    <html lang={localeCookie} dir={dir} className={themeCookie === 'light' ? '' : 'dark'} suppressHydrationWarning>
      <body className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50">
        <I18nProvider initialLocale={localeCookie}>
          <AuthProvider>
            <NavBar />
            <main className="pb-24 md:pb-8 min-h-[calc(100vh-4rem)]">{children}</main>
            <BottomNav />
            <Footer />
            <Toaster />
          </AuthProvider>
        </I18nProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
