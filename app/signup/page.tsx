'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { toast } from '@/components/ui/Toaster';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const { t, locale } = useI18n();
  const { refresh } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        data: { username, full_name: fullName, language: locale },
      },
    });
    if (error) {
      setLoading(false);
      toast(error.message, 'error');
      return;
    }
    // If no session was returned (email confirmation enabled), try to sign in
    // immediately. The DB trigger auto-confirms users on insert, so this should succeed.
    if (!signUpData.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setLoading(false);
        toast(signInError.message, 'error');
        return;
      }
    }
    setLoading(false);
    toast(t.common.success);
    await refresh();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-black text-2xl">
            T
          </div>
          <h1 className="text-2xl font-black">{t.auth.signUp}</h1>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label={t.auth.fullName} value={fullName} onChange={setFullName} required />
          <Field label={t.auth.username} value={username} onChange={setUsername} required pattern="^[a-zA-Z0-9_]{3,24}$" />
          <Field label={t.auth.email} value={email} onChange={setEmail} type="email" required />
          <Field label={t.auth.password} value={password} onChange={setPassword} type="password" required minLength={6} />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.auth.signUp}
          </button>
        </form>
        <p className="text-center text-sm font-bold text-zinc-500 mt-6">
          {t.auth.haveAccount}{' '}
          <Link href="/login" className="text-orange-500 hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', required, minLength, pattern,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; minLength?: number; pattern?: string }) {
  return (
    <div>
      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{label}</label>
      <input
        type={type}
        required={required}
        minLength={minLength}
        pattern={pattern}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}
