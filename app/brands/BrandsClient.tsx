'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Plus, ShieldCheck, Star, X, Loader2, Upload } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';
import { uploadImageFast } from '@/lib/upload-fast';

export function BrandsClient({ brands }: { brands: any[] }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Building2 className="w-7 h-7 text-orange-500" /> {t.brands.title}
        </h1>
        {user && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t.brands.registerBrand}
          </button>
        )}
      </div>

      {brands.length === 0 ? (
        <div className="text-center py-20 text-zinc-500"><Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" /><p className="font-bold text-lg">{locale === 'ku' ? 'هیچ مارکێک نییە' : 'No brands yet'}</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/brands/${b.slug}`}
              className="block bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 hover:border-orange-500 hover:shadow-lg transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black text-xl overflow-hidden">
                  {b.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" />
                  ) : b.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black flex items-center gap-1 truncate">
                    {b.name}
                    {b.verified && <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />}
                  </h3>
                  <p className="text-xs font-bold text-zinc-500 truncate">@{b.owner?.username}</p>
                </div>
              </div>
              {b.description && <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-3 line-clamp-2">{b.description}</p>}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label={t.brands.platformFee} value={`${b.platform_fee}%`} />
                <Stat label={locale === 'ku' ? 'فرۆش' : 'Sales'} value={b.sales_count} />
                <Stat label={locale === 'ku' ? 'هەڵسەنگاندن' : 'Rating'} value={Number(b.rating).toFixed(1)} icon={<Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && <BrandFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  return (
    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2">
      <div className="text-zinc-500 font-bold mb-0.5">{label}</div>
      <div className="font-black flex items-center justify-center gap-1">{icon}{value}</div>
    </div>
  );
}

function BrandFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', slug: '', description: '', platform_fee: '5', logo_url: '' });
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    const preview = URL.createObjectURL(file);
    setLogoPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return preview;
    });
    setUploading(true);
    try {
      const url = await uploadImageFast(file, { maxEdge: 900, quality: 0.8 });
      URL.revokeObjectURL(preview);
      setLogoPreview('');
      setForm((f) => ({ ...f, logo_url: url }));
      toast(locale === 'ku' ? 'وێنە بارکرا' : 'Logo uploaded', 'success');
    } catch (err: any) {
      toast(err?.name === 'AbortError' ? (locale === 'ku' ? 'بارکردن کاتی بەسەرچوو' : 'Upload timed out') : (err?.message || 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const fee = Math.max(1, Math.min(10, Number(form.platform_fee)));
    const { error } = await supabase.from('brands').insert({
      owner_id: user.id,
      name: form.name,
      slug,
      description: form.description || null,
      platform_fee: fee,
      logo_url: form.logo_url || null,
    });
    setSaving(false);
    if (error) return toast(error.message, 'error');
    toast(t.common.success);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={submit} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">{t.brands.registerBrand}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
              {locale === 'ku' ? 'شعار / وێنەی مارکە' : 'Brand logo'}
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {locale === 'ku' ? 'وێنە بارکە' : 'Upload logo'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </label>
            {(logoPreview || form.logo_url) && (
              <div className="mt-3 rounded-2xl overflow-hidden w-28 h-28 bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview || form.logo_url} alt="Brand logo" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <Field label={locale === 'ku' ? 'ناوی مارکە' : 'Brand name'} value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label="Slug (URL)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
          <Field label={t.common.description} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Field label={`${t.brands.platformFee} (1-10%)`} type="number" value={form.platform_fee} onChange={(v) => setForm({ ...form, platform_fee: v })} required />
          <button disabled={saving || uploading} className="mt-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.common.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
    </div>
  );
}
