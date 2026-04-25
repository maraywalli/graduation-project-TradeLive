'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Star, Crown, Package, ShoppingBag, GraduationCap, Ticket, LogOut, Edit, Loader2, Upload, Truck, Briefcase, Shield } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';

export function ProfileClient({ profile, items, orders, enrollments, tickets }: { profile: any; items: any[]; orders: any[]; enrollments: any[]; tickets: any[] }) {
  const { t, locale } = useI18n();
  const { signOut, refresh } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: profile?.full_name || '', bio: profile?.bio || '', username: profile?.username || '' });
  const [saving, setSaving] = useState(false);

  const goUpgrade = (kind: 'role' | 'tier', value: string) => {
    router.push(`/billing/upgrade?kind=${kind}&value=${value}`);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('profiles').update(form).eq('id', profile.id);
    setSaving(false);
    if (error) return toast(error.message, 'error');
    setEditing(false);
    toast(t.common.success);
    await refresh();
    router.refresh();
  };

  const uploadAvatar = async (file: File) => {
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) return toast(error.message, 'error');
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
    toast(t.common.success);
    await refresh();
    router.refresh();
  };

  if (!profile) return <div className="p-8 text-center text-zinc-500">{t.common.loading}</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header card */}
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 md:p-8 text-white mb-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row gap-5 items-center md:items-start">
          <label className="relative w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-4xl font-black overflow-hidden cursor-pointer group">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : profile.username[0].toUpperCase()}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload className="w-6 h-6" /></div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
          <div className="flex-1 text-center md:text-start">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-black">{profile.full_name || profile.username}</h1>
              {profile.tier === 'gold' && <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full font-black flex items-center gap-1"><Crown className="w-3 h-3" /> GOLD</span>}
              {profile.tier === 'premium' && <span className="text-xs bg-white text-orange-600 px-2 py-0.5 rounded-full font-black">🔥 PRO</span>}
              {profile.role === 'admin' && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full font-black">ADMIN</span>}
            </div>
            <p className="opacity-90 font-bold mb-2">@{profile.username}</p>
            {profile.bio && <p className="text-sm opacity-80">{profile.bio}</p>}
            <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-sm font-bold">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-yellow-300 text-yellow-300" /> {Number(profile.rating).toFixed(1)}</span>
              <span>{profile.sales_count} {locale === 'ku' ? 'فرۆش' : 'sales'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(!editing)} className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur font-black text-sm flex items-center gap-2"><Edit className="w-4 h-4" /> {t.common.edit}</button>
            <button onClick={async () => { await signOut(); router.push('/'); }} className="px-4 py-2 rounded-xl bg-black/30 backdrop-blur font-black text-sm flex items-center gap-2"><LogOut className="w-4 h-4" /> {t.nav.logout}</button>
          </div>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 mb-6 border border-zinc-200 dark:border-zinc-800 grid sm:grid-cols-2 gap-3">
          <Field label={t.auth.fullName} value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
          <Field label={t.auth.username} value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">Bio</label>
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3}
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <button disabled={saving} className="sm:col-span-2 py-3 rounded-xl bg-orange-500 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.common.save}
          </button>
        </form>
      )}

      {/* Subscription tier */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 mb-4 border border-zinc-200 dark:border-zinc-800">
        <h2 className="font-black text-lg mb-1 flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> {t.profile.subscription}</h2>
        <p className="text-xs font-bold text-zinc-500 mb-3">
          {locale === 'ku' ? `ئاستی ئێستا: ${profile.tier}` : `Current plan: ${profile.tier}`}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => goUpgrade('tier', 'gold')} disabled={profile.tier === 'gold'}
            className="p-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-amber-950 text-start hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="font-black mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1"><Crown className="w-4 h-4" /> GOLD</span>
              <span className="text-xs">{profile.tier === 'gold' ? (locale === 'ku' ? 'چالاک' : 'Active') : '$5/mo'}</span>
            </div>
            <div className="text-xs opacity-90 font-bold">
              {locale === 'ku'
                ? 'بۆ فرۆشیار و شۆفێری گەیاندن'
                : 'For sellers & delivery drivers'}
            </div>
            <ul className="text-[11px] font-bold opacity-80 mt-2 space-y-0.5">
              <li>• {locale === 'ku' ? 'فرۆشتنی بەرهەم' : 'Sell items'}</li>
              <li>• {locale === 'ku' ? 'وەرگرتنی کاری گەیاندن' : 'Accept delivery jobs'}</li>
              <li>• {locale === 'ku' ? 'نیشانی زێڕین' : 'Gold badge on profile'}</li>
            </ul>
          </button>
          <button onClick={() => goUpgrade('tier', 'premium')} disabled={profile.tier === 'premium'}
            className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white text-start hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="font-black mb-1 flex items-center justify-between">
              <span>🔥 PREMIUM</span>
              <span className="text-xs">{profile.tier === 'premium' ? (locale === 'ku' ? 'چالاک' : 'Active') : '$15/mo'}</span>
            </div>
            <div className="text-xs opacity-90 font-bold">
              {locale === 'ku'
                ? 'پۆستەکانت زیاتر دەبینرێن و دەتوانی براند، خول و چالاک دروست بکەیت'
                : 'Boosted posts + create brands, courses & events'}
            </div>
            <ul className="text-[11px] font-bold opacity-80 mt-2 space-y-0.5">
              <li>• {locale === 'ku' ? 'پۆستەکانت بەرزکراوە بۆ هەموو' : 'Boosted posts to everyone'}</li>
              <li>• {locale === 'ku' ? 'دروستکردنی براند' : 'Create your brand'}</li>
              <li>• {locale === 'ku' ? 'دروستکردنی خول و چالاکی' : 'Publish courses & events'}</li>
            </ul>
          </button>
        </div>
      </div>

      {/* Account role */}
      {profile.role !== 'admin' && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 mb-6 border border-zinc-200 dark:border-zinc-800">
          <h2 className="font-black text-lg mb-1 flex items-center gap-2"><Shield className="w-4 h-4 text-orange-500" /> {locale === 'ku' ? 'جۆری هەژمار' : 'Account role'}</h2>
          <p className="text-xs font-bold text-zinc-500 mb-3">
            {locale === 'ku' ? `ئێستا: ${profile.role}` : `Currently: ${profile.role}`}
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <button onClick={() => goUpgrade('role', 'seller')} disabled={profile.role === 'seller'}
              className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white text-start hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="font-black mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {locale === 'ku' ? 'فرۆشیار' : 'Seller'}</span>
                <span className="text-xs">{profile.role === 'seller' ? (locale === 'ku' ? 'چالاک' : 'Active') : '$5'}</span>
              </div>
              <div className="text-xs opacity-90 font-bold">{locale === 'ku' ? 'بەرهەم دابنێ و بفرۆشە' : 'List & sell items'}</div>
            </button>
            <button onClick={() => goUpgrade('role', 'delivery')} disabled={profile.role === 'delivery'}
              className="p-4 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-900 text-white text-start hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="font-black mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> {locale === 'ku' ? 'گەیاندن' : 'Courier'}</span>
                <span className="text-xs">{profile.role === 'delivery' ? (locale === 'ku' ? 'چالاک' : 'Active') : '$5'}</span>
              </div>
              <div className="text-xs opacity-90 font-bold">{locale === 'ku' ? 'گەیاندن وەربگرە و قازانج بکە' : 'Take delivery jobs'}</div>
            </button>
            <button onClick={async () => {
                const supabase = createClient();
                await supabase.from('profiles').update({ role: 'user' }).eq('id', profile.id);
                toast(locale === 'ku' ? 'گەڕێنرایەوە بۆ بەکارهێنەری ئاسایی' : 'Switched to regular user');
                await refresh(); router.refresh();
              }} disabled={profile.role === 'user'}
              className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-start hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              <div className="font-black mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1"><User className="w-4 h-4" /> {locale === 'ku' ? 'بەکارهێنەر' : 'User'}</span>
                <span className="text-xs">{profile.role === 'user' ? (locale === 'ku' ? 'چالاک' : 'Active') : (locale === 'ku' ? 'بەخۆڕایی' : 'Free')}</span>
              </div>
              <div className="text-xs opacity-90 font-bold">{locale === 'ku' ? 'تەنها کڕین و بینین' : 'Browse & buy only'}</div>
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title={t.profile.myItems} icon={<Package className="w-4 h-4" />} count={items.length} href="/seller">
          {items.slice(0, 5).map((i) => (
            <Link key={i.id} href={`/items/${i.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">{i.images?.[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={i.images[0]} alt="" className="w-full h-full object-cover" />}</div>
              <div className="flex-1 min-w-0"><div className="font-black text-sm truncate">{i.title}</div></div>
              <div className="font-black text-orange-500 text-sm">{Number(i.price).toLocaleString()}</div>
            </Link>
          ))}
        </Section>

        <Section title={t.profile.purchases} icon={<ShoppingBag className="w-4 h-4" />} count={orders.length}>
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="p-2 rounded-lg flex items-center justify-between text-sm">
              <span className="font-bold truncate">{o.item?.title || 'Order'}</span>
              <span className="font-black text-orange-500">{Number(o.amount).toLocaleString()}</span>
            </div>
          ))}
        </Section>

        <Section title={t.profile.myCourses} icon={<GraduationCap className="w-4 h-4" />} count={enrollments.length} href="/courses">
          {enrollments.slice(0, 5).map((e) => (
            <div key={e.id} className="p-2 rounded-lg text-sm font-bold">{e.course?.title} <span className="text-zinc-500">{e.progress}%</span></div>
          ))}
        </Section>

        <Section title={t.events.myTickets} icon={<Ticket className="w-4 h-4" />} count={tickets.length} href="/events">
          {tickets.slice(0, 5).map((t0) => (
            <div key={t0.id} className="p-2 rounded-lg text-sm font-bold">{t0.event?.title}</div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, count, href, children }: { title: string; icon: React.ReactNode; count: number; href?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-black flex items-center gap-2">{icon} {title} <span className="text-zinc-400">({count})</span></h2>
        {href && <Link href={href} className="text-xs font-bold text-orange-500">→</Link>}
      </div>
      <div className="flex flex-col gap-1">{count > 0 ? children : <p className="text-xs font-bold py-3 text-center text-[#0000ff]">—</p>}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}
