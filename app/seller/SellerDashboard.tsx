'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Package, ShoppingBag, DollarSign, Star, Edit, Trash2, X, Upload, Loader2, Sparkles, Wand2, Clock, MapPin } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';
import LocationPicker from '@/components/marketplace/LocationPicker';

const CATEGORIES = ['electronics', 'fashion', 'home', 'vehicles', 'beauty', 'sports', 'kids', 'other'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'used'];

export function SellerDashboard({ items, orders, profile, brands }: { items: any[]; orders: any[]; profile: any; brands: any[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const editId = sp.get('edit');
  const editItem = items.find((i) => i.id === editId);
  const [showForm, setShowForm] = useState(!!editItem);

  const totalRevenue = orders
    .filter((o) => o.status === 'paid' || o.status === 'delivered' || o.status === 'shipped')
    .reduce((s, o) => s + Number(o.amount), 0);

  const stats = [
    { Icon: Package, label: locale === 'ku' ? 'بەرهەمەکان' : 'Items', value: items.length },
    { Icon: ShoppingBag, label: locale === 'ku' ? 'داواکارییەکان' : 'Orders', value: orders.length },
    { Icon: DollarSign, label: locale === 'ku' ? 'داهات' : 'Revenue', value: `${totalRevenue.toLocaleString()} ${t.common.currency}` },
    { Icon: Star, label: locale === 'ku' ? 'هەڵسەنگاندن' : 'Rating', value: Number(profile?.rating || 0).toFixed(1) },
  ];

  const deleteItem = async (id: string) => {
    if (!confirm(locale === 'ku' ? 'دڵنیای؟' : 'Delete this item?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) return toast(error.message, 'error');
    toast(t.common.success);
    router.refresh();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black">{t.nav.seller}</h1>
        <button
          onClick={() => { setShowForm(true); router.replace('/seller'); }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center gap-2 hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> {t.marketplace.addItem}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(({ Icon, label, value }) => (
          <div key={label} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
            <Icon className="w-5 h-5 text-orange-500 mb-2" />
            <div className="text-xs font-bold text-zinc-500 mb-1">{label}</div>
            <div className="font-black text-xl">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title={locale === 'ku' ? 'بەرهەمەکانم' : 'My items'}>
          {items.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8 font-bold">{t.marketplace.noItems}</p>
          ) : items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="w-14 h-14 rounded-lg bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">
                {item.images?.[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={item.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm truncate">{item.title}</div>
                <div className="text-xs text-zinc-500 font-bold">{Number(item.price).toLocaleString()} {item.currency} · {item.status}</div>
              </div>
              <button onClick={() => { router.replace(`/seller?edit=${item.id}`); setShowForm(true); }} className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => deleteItem(item.id)} className="p-2 rounded-lg hover:bg-red-100 text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </Section>

        <Section title={locale === 'ku' ? 'داواکارییەکان' : 'Orders'}>
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8 font-bold">{locale === 'ku' ? 'هیچ داواکارییەک نییە' : 'No orders yet'}</p>
          ) : orders.map((o) => (
            <OrderRow key={o.id} order={o} onChange={() => router.refresh()} />
          ))}
        </Section>
      </div>

      {/* Pre-order waitlist for the seller's items */}
      <div className="mt-6">
        <PreorderInbox />
      </div>

      {showForm && (
        <ItemFormModal
          item={editItem}
          brands={brands}
          onClose={() => { setShowForm(false); router.replace('/seller'); }}
          onSaved={() => { setShowForm(false); router.replace('/seller'); router.refresh(); }}
        />
      )}
    </div>
  );
}

function PreorderInbox() {
  const { locale } = useI18n();
  const [list, setList] = useState<any[] | null>(null);

  useEffect(() => {
    let abort = false;
    fetch('/api/preorders?seller=1')
      .then((r) => r.json())
      .then((j) => { if (!abort) setList(j.preorders || []); })
      .catch(() => { if (!abort) setList([]); });
    return () => { abort = true; };
  }, []);

  if (list === null) return null;
  if (list.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
      <h2 className="font-black text-lg mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-amber-500" />
        {locale === 'ku' ? 'لیستی پێش-فەرمانگرتن' : 'Pre-order waitlist'}
        <span className="text-sm font-bold text-zinc-500">({list.length})</span>
      </h2>
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">
              {p.item?.images?.[0] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.item.images[0]} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm truncate">{p.item?.title}</div>
              <div className="text-xs font-bold text-zinc-500">
                {locale === 'ku' ? 'بڕ' : 'Qty'}: {p.quantity} · {p.status}
                {Number(p.item?.stock ?? 0) > 0 && (
                  <span className="ms-2 text-emerald-500">
                    {locale === 'ku' ? `لە بەردەستە (${p.item.stock})` : `Restocked (${p.item.stock})`}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
      <h2 className="font-black text-lg mb-4">{title}</h2>
      <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">{children}</div>
    </div>
  );
}

function OrderRow({ order, onChange }: { order: any; onChange: () => void }) {
  const { locale } = useI18n();
  const setStatus = async (status: string) => {
    const supabase = createClient();
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (error) return toast(error.message, 'error');
    onChange();
  };
  return (
    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="font-black text-sm truncate">{order.item?.title || (locale === 'ku' ? 'بەرهەم' : 'Item')}</div>
        <div className="font-black text-orange-500 text-sm">{Number(order.amount).toLocaleString()}</div>
      </div>
      <select
        value={order.status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700"
      >
        {['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
      </select>
    </div>
  );
}

function ItemFormModal({ item, brands, onClose, onSaved }: { item?: any; brands: any[]; onClose: () => void; onSaved: () => void }) {
  const { t, locale } = useI18n();
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    price: item?.price?.toString() || '',
    category: item?.category || 'other',
    condition: item?.condition || 'new',
    location: item?.location || '',
    images: (item?.images || []) as string[],
    latitude: (item?.latitude ?? null) as number | null,
    longitude: (item?.longitude ?? null) as number | null,
    brand_id: (item?.brand_id ?? '') as string,
    stock: (item?.stock?.toString() ?? '1') as string,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Server-side upload — bypasses storage RLS so authenticated users can
  // always upload regardless of bucket-policy state. Each file is compressed
  // client-side first (a typical 5 MB phone photo becomes ~150–250 KB),
  // which is the difference between a 30s upload over a slow connection and
  // a 1–2s one. Concurrency is capped at 2 so a user uploading 10 huge phone
  // photos doesn't OOM mobile Safari decoding them all into canvases at
  // once. Each request is also bounded by a 60s timeout.
  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const fileArr = Array.from(files);
    const urls: string[] = [];
    const CONCURRENCY = 2;
    for (let i = 0; i < fileArr.length; i += CONCURRENCY) {
      const batch = fileArr.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map((file) => uploadOne(file, locale)));
      for (const u of batchResults) if (u) urls.push(u);
    }
    if (urls.length) setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
  };

  // Capture device location (with the user's consent) so the item shows up
  // on the marketplace map.
  const captureLocation = () => {
    if (!('geolocation' in navigator)) {
      toast(locale === 'ku' ? 'وێبگەرەکەت پشتگیری نییە' : 'Geolocation not supported', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setLocating(false);
        toast(locale === 'ku' ? 'شوێن وەرگیرا' : 'Location captured');
      },
      (err) => {
        setLocating(false);
        toast(err.message || (locale === 'ku' ? 'دۆزینەوەی شوێن سەرکەوتوو نەبوو' : 'Could not get location'), 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      setSaving(false);
      console.error('[item-form] auth error', authErr);
      toast(authErr?.message || (locale === 'ku' ? 'سەرەتا چوونە ژوورەوە' : 'Please sign in'), 'error');
      return;
    }
    const payload: any = {
      title: form.title,
      description: form.description || null,
      price: Number(form.price),
      category: form.category,
      condition: form.condition,
      location: form.location || null,
      latitude: form.latitude,
      longitude: form.longitude,
      images: form.images,
      brand_id: form.brand_id || null,
      stock: Math.max(0, Math.floor(Number(form.stock) || 0)),
    };
    let res;
    if (item) {
      res = await supabase.from('items').update(payload).eq('id', item.id);
    } else {
      res = await supabase.from('items').insert({ ...payload, seller_id: user.id });
    }
    setSaving(false);
    if (res.error) {
      // Surface the real error in the console for debugging.
      console.error('[item-form] save error', res.error);
      if (res.error.message?.includes('FREE_POST_LIMIT')) {
        toast(
          locale === 'ku'
            ? 'سنووری ٥ پۆست بۆ مانگ پڕبوویەوە. بۆ بێ سنوور بچۆ بۆ Gold یان Premium.'
            : 'Free plan limit reached (5 posts/month). Upgrade to Gold or Premium for unlimited posts.',
          'error',
        );
        return;
      }
      return toast(res.error.message || (res.error as any).hint || 'Save failed', 'error');
    }
    toast(t.common.success);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form onSubmit={submit} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">{item ? t.common.edit : t.marketplace.addItem}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <Field label={t.common.title} value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{t.common.description}</label>
              <AIDescriptionButton form={form} setForm={setForm} locale={locale} />
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              placeholder={locale === 'ku' ? 'بنووسە یان دوگمەی AI داگرە بۆ نووسینی خۆکار' : 'Type or click AI to auto-fill'}
              className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t.common.price} type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required />
            <Field
              label={locale === 'ku' ? 'بڕی کۆگا' : 'Stock'}
              type="number"
              value={form.stock}
              onChange={(v) => setForm({ ...form, stock: v })}
            />
            <Field label={t.common.location} value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          </div>
          {brands.length > 0 && (
            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
                {locale === 'ku' ? 'مارکە (ئیختیاری)' : 'Brand (optional)'}
              </label>
              <select
                value={form.brand_id}
                onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">{locale === 'ku' ? '— هیچ مارکێک —' : '— No brand —'}</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500 mt-1 font-medium">
                {locale === 'ku'
                  ? 'بەرهەمەکەت لەسەر پەڕەی مارکەکەت پیشان دەدرێت.'
                  : 'Listing this under a brand makes it appear on that brand’s page.'}
              </p>
            </div>
          )}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                {form.latitude != null
                  ? (locale === 'ku' ? 'گۆڕینی شوێن' : 'Change location')
                  : (locale === 'ku' ? 'هەڵبژاردنی شوێن لەسەر نەخشە' : 'Pick on map')}
              </button>
              <button
                type="button"
                onClick={captureLocation}
                disabled={locating}
                className="py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>📍</span>}
                {locale === 'ku' ? 'شوێنی من' : 'Use my GPS'}
              </button>
            </div>
            {form.latitude != null && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white truncate">
                  {form.location || (locale === 'ku' ? 'شوێنی هەڵبژێردراو' : 'Selected location')}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {form.latitude.toFixed(5)}, {form.longitude?.toFixed(5)}
                </div>
              </div>
            )}
            <p className="text-[10px] text-zinc-500 mt-1 font-medium">
              {locale === 'ku'
                ? 'بەرهەمەکەت لە نەخشەی بازاڕ پیشان دەدرێت.'
                : 'Adding a location places your item on the marketplace map.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t.common.category} value={form.category} onChange={(v) => setForm({ ...form, category: v })} options={CATEGORIES} />
            <Select label={t.common.condition} value={form.condition} onChange={(v) => setForm({ ...form, condition: v })} options={CONDITIONS} labels={(t.marketplace.condition as any)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{t.common.image}</label>
              <AIStudioImageButton form={form} setForm={setForm} locale={locale} />
            </div>
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {locale === 'ku' ? 'وێنە بارکە' : 'Upload images'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
            </label>
            {form.images.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {form.images.map((url, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                      className="absolute top-0.5 end-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.common.save}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Upload one (compressed) image. Returns the public URL on success, or null
 * on failure (after surfacing a toast). Hard-bounded by a 60s timeout so a
 * stuck connection can never freeze the form.
 */
async function uploadOne(file: File, locale: string): Promise<string | null> {
  try {
    const compressed = await compressImage(file).catch(() => file);
    const fd = new FormData();
    fd.append('file', compressed);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    const res = await fetch('/api/items/upload', {
      method: 'POST',
      body: fd,
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      console.error('[upload] failed', json);
      toast(json.error || `Upload failed (${res.status})`, 'error');
      return null;
    }
    return json.url as string;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      toast(locale === 'ku' ? 'بارکردن کاتی بەسەرچوو' : 'Upload timed out — try a smaller image', 'error');
    } else {
      console.error('[upload] exception', e);
      toast(e?.message || 'Upload failed', 'error');
    }
    return null;
  }
}

/**
 * Resize+re-encode an image client-side before upload.
 *
 * Why: phone photos are routinely 4–8 MB straight from the camera. Sending
 * them over Replit's tunnelled dev preview (or any slow uplink) is the #1
 * cause of "upload hangs". Re-encoding to JPEG @ 1600px max on the longest
 * edge typically cuts the payload to 150–300 KB with no visible quality
 * loss for marketplace thumbnails. Falls back to the original file if the
 * browser can't decode it (e.g. HEIC on some devices) — the server-side
 * upload route still accepts the original.
 */
async function compressImage(file: File, maxEdge = 1600, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // Tiny images skip the round-trip entirely.
  if (file.size < 200 * 1024) return file;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Read failed'));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Decode failed'));
    im.src = dataUrl;
  });

  const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) return file;
  // Only swap when we actually saved bytes — avoids re-encoding tiny JPEGs
  // larger than the original.
  if (blob.size >= file.size) return file;
  const ext = 'jpg';
  const baseName = (file.name.replace(/\.[^.]+$/, '') || 'image').slice(0, 60);
  return new File([blob], `${baseName}.${ext}`, { type: 'image/jpeg' });
}

function AIDescriptionButton({ form, setForm, locale }: { form: any; setForm: (f: any) => void; locale: string }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!form.title?.trim()) {
      toast(locale === 'ku' ? 'سەرەتا ناونیشانێک بنووسە' : 'Add a title first', 'error');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/ai/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title, notes: form.description, category: form.category, condition: form.condition, locale }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return toast(json.error || 'AI failed', 'error');
    setForm({ ...form, description: json.description });
    toast(locale === 'ku' ? 'وەسف دروستکرا' : 'Description generated');
  };
  return (
    <button type="button" onClick={run} disabled={busy}
      className="text-[10px] font-black px-2 py-1 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white flex items-center gap-1 hover:opacity-90 disabled:opacity-50">
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {locale === 'ku' ? 'AI وەسف' : 'AI describe'}
    </button>
  );
}

function AIStudioImageButton({ form, setForm, locale }: { form: any; setForm: (f: any) => void; locale: string }) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [pct, setPct] = useState(0);

  const onPick = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setStage(locale === 'ku' ? 'بارکردنی مۆدێل' : 'Loading model');
    setPct(0);
    try {
      const { generateStudioShot } = await import('@/lib/studio-shot');
      const blob = await generateStudioShot(file, (s, p) => { setStage(s); setPct(p); });
      const fd = new FormData();
      fd.append('image', blob, 'studio.jpg');
      const res = await fetch('/api/ai/generate-product-image', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setForm({ ...form, images: [...form.images, json.url] });
      toast(locale === 'ku' ? 'وێنەی ستۆدیۆ زیادکرا' : 'Studio shot added');
    } catch (e: any) {
      toast(e.message || 'Studio shot failed', 'error');
    } finally {
      setBusy(false);
      setStage('');
      setPct(0);
    }
  };

  return (
    <label className="text-[10px] font-black px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center gap-1 hover:opacity-90 cursor-pointer">
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
      {busy ? `${stage} ${pct}%` : (locale === 'ku' ? 'AI ستۆدیۆ' : 'AI studio shot')}
      <input type="file" accept="image/*" className="hidden" disabled={busy}
        onChange={(e) => { const f = e.target.files?.[0]; onPick(f || null); e.target.value=''; }} />
    </label>
  );
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, labels }: { label: string; value: string; onChange: (v: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <div>
      <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        {options.map((o) => <option key={o} value={o}>{labels?.[o] || o}</option>)}
      </select>
    </div>
  );
}
