'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, Ticket as TicketIcon, Plus, X, Loader2, QrCode, Upload } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';
import { uploadImageFast } from '@/lib/upload-fast';

export function EventsClient({ events, myTickets }: { events: any[]; myTickets: any[] }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showQr, setShowQr] = useState<any>(null);
  const [tab, setTab] = useState<'all' | 'mine'>('all');

  const buyTicket = async (event: any) => {
    if (!user) { router.push('/login?next=/events'); return; }
    const supabase = createClient();
    const { error } = await supabase.from('tickets').insert({ event_id: event.id, user_id: user.id });
    if (error) return toast(error.message, 'error');
    await supabase.from('events').update({ tickets_sold: event.tickets_sold + 1 }).eq('id', event.id);
    toast(t.events.ticketBought);
    router.refresh();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Calendar className="w-7 h-7 text-orange-500" /> {t.events.title}
        </h1>
        {user && (
          <button onClick={() => setShowForm(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center gap-2">
            <Plus className="w-4 h-4" /> {locale === 'ku' ? 'بۆنە' : 'New event'}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-xl font-black text-sm ${tab === 'all' ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
          {locale === 'ku' ? 'هەموو' : 'All Events'}
        </button>
        {user && (
          <button onClick={() => setTab('mine')} className={`px-4 py-2 rounded-xl font-black text-sm ${tab === 'mine' ? 'bg-orange-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            {t.events.myTickets} ({myTickets.length})
          </button>
        )}
      </div>

      {tab === 'all' ? (
        events.length === 0 ? (
          <Empty icon={<Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />} text={t.events.noEvents} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e) => (
              <div key={e.id} className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <div className="aspect-[16/9] bg-gradient-to-br from-orange-400 to-red-600 relative">
                  {e.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.cover_url} alt={e.title} className="w-full h-full object-cover" />
                  ) : (
                    <Calendar className="w-12 h-12 text-white/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-black mb-2">{e.title}</h3>
                  <div className="text-xs font-bold text-zinc-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3" />
                    {/* dir=ltr stops the date getting visually re-ordered when the page is RTL */}
                    <span dir="ltr">
                      {new Date(e.starts_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                      {' · '}
                      {new Date(e.starts_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit', minute: '2-digit', hour12: false,
                      })}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-zinc-500 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" /> {e.venue}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-black text-orange-500">
                      {Number(e.ticket_price).toLocaleString()} {t.common.currency}
                    </div>
                    <div className="text-xs font-bold text-zinc-500">
                      {e.tickets_sold}/{e.total_tickets}
                    </div>
                  </div>
                  <button
                    onClick={() => buyTicket(e)}
                    disabled={e.tickets_sold >= e.total_tickets}
                    className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {e.tickets_sold >= e.total_tickets ? t.events.sold : t.events.buyTicket}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        myTickets.length === 0 ? (
          <Empty icon={<TicketIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />} text={locale === 'ku' ? 'هیچ بلیتت نییە' : 'No tickets yet'} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myTickets.map((t0) => (
              <div key={t0.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-black mb-1">{t0.event?.title}</h3>
                <div className="text-xs font-bold text-zinc-500 mb-3 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {t0.event?.venue}
                </div>
                <button onClick={() => setShowQr(t0)} className="w-full py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 font-black flex items-center justify-center gap-2">
                  <QrCode className="w-4 h-4" /> {locale === 'ku' ? 'پیشاندانی QR' : 'Show QR'}
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {showForm && <EventFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />}

      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQr(null)}>
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-zinc-900 dark:text-white mb-3">{showQr.event?.title}</h3>
            <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/validate/${showQr.qr_code}`} size={240} />
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-3 break-all max-w-[240px] mx-auto">
              {typeof window !== 'undefined' ? `${window.location.origin}/events/validate/${showQr.qr_code}` : showQr.qr_code}
            </p>
            <div className="mt-4 grid gap-3">
              <a
                href={`${typeof window !== 'undefined' ? window.location.origin : ''}/events/validate/${showQr.qr_code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full justify-center py-3 rounded-xl bg-orange-500 text-white font-black hover:bg-orange-600"
              >
                {locale === 'ku' ? 'بەرەو پەڕەی تۆمارکردن بڕۆ' : 'Open validation page'}
              </a>
              <button onClick={() => setShowQr(null)} className="py-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-black">
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="text-center py-20 text-zinc-500">{icon}<p className="font-bold text-lg">{text}</p></div>;
}

function EventFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', venue: '', starts_at: '', ticket_price: '0', total_tickets: '100', cover_url: '' });
  const [coverPreview, setCoverPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadCover = async (file: File) => {
    const preview = URL.createObjectURL(file);
    setCoverPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return preview;
    });
    setUploading(true);
    try {
      const url = await uploadImageFast(file);
      URL.revokeObjectURL(preview);
      setCoverPreview('');
      setForm((f) => ({ ...f, cover_url: url }));
      toast(locale === 'ku' ? 'وێنە بارکرا' : 'Cover uploaded', 'success');
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
    const { error } = await supabase.from('events').insert({
      organizer_id: user.id,
      title: form.title,
      description: form.description || null,
      cover_url: form.cover_url || null,
      venue: form.venue,
      starts_at: new Date(form.starts_at).toISOString(),
      ticket_price: Number(form.ticket_price),
      total_tickets: Number(form.total_tickets),
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
          <h2 className="text-xl font-black">{locale === 'ku' ? 'بۆنەی نوێ' : 'New event'}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">
              {locale === 'ku' ? 'وێنەی بۆنە' : 'Event cover'}
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-bold cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {locale === 'ku' ? 'وێنە بارکە' : 'Upload cover'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
            </label>
            {(coverPreview || form.cover_url) && (
              <div className="mt-3 rounded-2xl overflow-hidden w-full h-40 bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview || form.cover_url} alt="Event cover" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <Field label={t.common.title} value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Field label={t.common.description} value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
          <Field label={locale === 'ku' ? 'شوێن' : 'Venue'} value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} required />
          <Field label={locale === 'ku' ? 'کاتی دەستپێک' : 'Start date'} type="datetime-local" value={form.starts_at} onChange={(v) => setForm({ ...form, starts_at: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label={locale === 'ku' ? 'نرخی بلیت' : 'Ticket price'} type="number" value={form.ticket_price} onChange={(v) => setForm({ ...form, ticket_price: v })} required />
            <Field label={locale === 'ku' ? 'کۆی بلیتەکان' : 'Total tickets'} type="number" value={form.total_tickets} onChange={(v) => setForm({ ...form, total_tickets: v })} required />
          </div>
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
