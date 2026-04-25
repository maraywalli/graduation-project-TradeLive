'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { dictionaries, type Locale, type Dictionary } from './dictionaries';

type Ctx = {
  locale: Locale;
  t: Dictionary;
  setLocale: (l: Locale) => void;
  toggle: () => void;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  children,
  initialLocale = 'ku',
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('locale')) as Locale | null;
    if (saved && (saved === 'ku' || saved === 'en')) setLocaleState(saved);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const dict = dictionaries[locale];
    document.documentElement.lang = locale;
    document.documentElement.dir = dict.dir;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', l);
      document.cookie = `locale=${l}; path=/; max-age=31536000`;
    }
  };

  const toggle = () => setLocale(locale === 'ku' ? 'en' : 'ku');

  return (
    <I18nContext.Provider value={{ locale, t: dictionaries[locale] as Dictionary, setLocale, toggle }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
