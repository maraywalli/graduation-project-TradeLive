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
  title: 'TradeLive Pro - مارکێت ئونلاین | Marketplace',
  description: 'Premium All-in-One Live Commerce & Marketplace Platform | مارکێتی ترەیدلایڤ - بازاری ئونلاین، فرۆشین و کڕین، لایڤ کۆمێرس',
  keywords: ['marketplace', 'trade live', 'live commerce', 'online store', 'مارکێت', 'ترەیدلایڤ', 'بازار', 'فرۆشین ئونلاین', 'کڕین و فرۆشین', 'لایڤ کۆمێرس'],
  openGraph: {
    type: 'website',
    locale: 'ku_IQ',
    url: 'https://tradelive.vercel.app',
    siteName: 'TradeLive Pro',
    title: 'TradeLive Pro - بازاری ترەیدلایڤ',
    description: 'مارکێتی بڕینی و فرۆشین | لایڤ کۆمێرس | Buy & Sell Online',
    images: [
      {
        url: 'https://tradelive.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'TradeLive Pro Marketplace',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeLive Pro - مارکێت',
    description: 'بازاری ئونلاین | Live Commerce Platform',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    languages: {
      'ku': 'https://tradelive.vercel.app',
      'en': 'https://tradelive.vercel.app?lang=en',
      'ar': 'https://tradelive.vercel.app?lang=ar',
    },
  },
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
