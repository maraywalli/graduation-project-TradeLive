'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { toast } from '@/components/ui/Toaster';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { t } = useI18n();
  const { refresh } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast(t.common.success);
    await refresh();
    router.push(next);
    router.refresh();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-black text-2xl">
            T
          </div>
          <h1 className="text-2xl font-black">{t.auth.signIn}</h1>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{t.auth.email}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{t.auth.password}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.auth.signIn}
          </button>
        </form>
        <p className="text-center text-sm font-bold text-zinc-500 mt-6">
          {t.auth.noAccount}{' '}
          <Link href="/signup" className="text-orange-500 hover:underline">
            {t.auth.signUp}
          </Link>
        </p>
      </div>
    </div>
  );
}
