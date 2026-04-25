'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ShoppingBag, Building2, ShieldCheck, Trash2, Sparkles, Loader2, RefreshCw, AlertCircle, Receipt } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';

export function AdminDashboard({ users, items, brands, orders }: any) {
  const { locale } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'items' | 'brands' | 'orders'>('users');

  const supabase = createClient() as any;
  const setRole = async (id: string, role: string) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (error) return toast(error.message, 'error');
    router.refresh();
  };
  const setTier = async (id: string, tier: string) => {
    const { error } = await supabase.from('profiles').update({ tier }).eq('id', id);
    if (error) return toast(error.message, 'error');
    router.refresh();
  };
  const verifyBrand = async (id: string, verified: boolean) => {
    const { error } = await supabase.from('brands').update({ verified }).eq('id', id);
    if (error) return toast(error.message, 'error');
    router.refresh();
  };
  const removeItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) return toast(error.message, 'error');
    router.refresh();
  };

  const stats = [
    { Icon: Users, label: 'Users', value: users.length },
    { Icon: ShoppingBag, label: 'Items', value: items.length },
    { Icon: Building2, label: 'Brands', value: brands.length },
    { Icon: Receipt, label: 'Orders', value: orders.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-black mb-6 flex items-center gap-2">
        <ShieldCheck className="w-7 h-7 text-purple-500" /> {locale === 'ku' ? 'ئەدمین' : 'Admin'}
      </h1>

      <AIReportPanel locale={locale} />


      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ Icon, label, value }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
            <Icon className="w-5 h-5 text-purple-500 mb-2" />
            <div className="text-xs font-bold text-zinc-500">{label}</div>
            <div className="font-black text-2xl">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {(['users', 'items', 'brands', 'orders'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-black ${tab === t ? 'bg-purple-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {tab === 'users' && (
          <Table headers={['Username', 'Email', 'Role', 'Tier', 'Sales']}>
            {users.map((u: any) => (
              <tr key={u.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2 font-black">@{u.username}</td>
                <td className="px-4 py-2 text-xs">{u.email}</td>
                <td className="px-4 py-2">
                  <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-bold">
                    {['user', 'seller', 'brand', 'admin'].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select value={u.tier} onChange={(e) => setTier(u.id, e.target.value)} className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-bold">
                    {['free', 'premium', 'gold'].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 font-bold">{u.sales_count}</td>
              </tr>
            ))}
          </Table>
        )}
        {tab === 'items' && (
          <Table headers={['Title', 'Seller', 'Price', 'Status', '']}>
            {items.map((i: any) => (
              <tr key={i.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2 font-black">{i.title}</td>
                <td className="px-4 py-2 text-xs">@{i.seller?.username}</td>
                <td className="px-4 py-2 font-bold text-orange-500">{Number(i.price).toLocaleString()}</td>
                <td className="px-4 py-2 text-xs">{i.status}</td>
                <td className="px-4 py-2">
                  <button onClick={() => removeItem(i.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {tab === 'brands' && (
          <Table headers={['Name', 'Slug', 'Fee%', 'Verified', '']}>
            {brands.map((b: any) => (
              <tr key={b.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2 font-black">{b.name}</td>
                <td className="px-4 py-2 text-xs font-mono">{b.slug}</td>
                <td className="px-4 py-2 font-bold">{b.platform_fee}%</td>
                <td className="px-4 py-2">{b.verified ? '✅' : '—'}</td>
                <td className="px-4 py-2">
                  <button onClick={() => verifyBrand(b.id, !b.verified)} className="px-2 py-1 rounded bg-purple-500 text-white text-xs font-black">{b.verified ? 'Unverify' : 'Verify'}</button>
                </td>
              </tr>
            ))}
          </Table>
        )}
        {tab === 'orders' && (
          <Table headers={['ID', 'Buyer→Seller', 'Amount', 'Status']}>
            {orders.map((o: any) => (
              <tr key={o.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2 text-xs font-mono">{o.id.slice(0, 8)}</td>
                <td className="px-4 py-2 text-xs">{o.buyer_id.slice(0, 6)} → {o.seller_id.slice(0, 6)}</td>
                <td className="px-4 py-2 font-bold text-orange-500">{Number(o.amount).toLocaleString()}</td>
                <td className="px-4 py-2 text-xs">{o.status}</td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}

function AIReportPanel({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ summary?: string | null; metrics?: any; error?: string } | null>(null);

  const run = async () => {
    setLoading(true);
    const res = await fetch('/api/ai/admin-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale }),
    });
    const json = await res.json();
    setLoading(false);
    setData(json);
    setOpen(true);
  };

  return (
    <div className="bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-700 text-white rounded-3xl p-5 mb-6 relative overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center"><Sparkles className="w-6 h-6" /></div>
          <div>
            <h2 className="font-black text-lg">{locale === 'ku' ? 'یاریدەدەری AI' : 'AI Operations Assistant'}</h2>
            <p className="text-xs opacity-90 font-bold">{locale === 'ku' ? 'پوختەی ئاسانی پلاتفۆڕم — بەکارهێنەرە نوێیەکان، ناڕێکی، و مارکە چاوەڕوانیی پەسەندکردن' : 'Live platform briefing — new users, server health, brands awaiting verification'}</p>
          </div>
        </div>
        <button onClick={run} disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white text-violet-700 font-black flex items-center gap-2 hover:bg-zinc-100 disabled:opacity-50 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (data ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />)}
          {data ? (locale === 'ku' ? 'نوێکردنەوە' : 'Refresh') : (locale === 'ku' ? 'پوختە دروست بکە' : 'Generate report')}
        </button>
      </div>

      {open && data && (
        <div className="mt-4 bg-white/10 backdrop-blur rounded-2xl p-4 grid lg:grid-cols-[1fr_280px] gap-4">
          <div>
            {data.error && <div className="flex items-start gap-2 mb-2 text-amber-200 text-xs font-bold"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {data.error}</div>}
            {data.summary ? (
              <div className="prose prose-invert prose-sm max-w-none text-sm font-medium whitespace-pre-wrap leading-relaxed">{data.summary}</div>
            ) : (
              <p className="text-xs opacity-80 font-bold">{locale === 'ku' ? 'پوختە بەردەست نییە. تکایە OpenAI لە یەکخستنەکان زیاد بکە.' : 'AI summary unavailable. Ask the platform to enable OpenAI.'}</p>
            )}
          </div>
          {data.metrics && (
            <div className="bg-black/20 rounded-xl p-3 text-xs font-bold space-y-1.5">
              <Stat label="Users (total)" v={data.metrics.users.total} />
              <Stat label="New users 7d" v={data.metrics.users.new7d} />
              <Stat label="New users 30d" v={data.metrics.users.new30d} />
              <Stat label="Items" v={data.metrics.items.total} />
              <Stat label="Pending deliveries" v={data.metrics.deliveries.pending} />
              <Stat label="Brands awaiting verify" v={(data.metrics.brands.awaitingVerification || []).length} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number }) {
  return <div className="flex justify-between"><span className="opacity-80">{label}</span><span className="font-black">{v ?? 0}</span></div>;
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            {headers.map((h) => <th key={h} className="px-4 py-2 text-start font-black text-xs uppercase text-zinc-500">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
