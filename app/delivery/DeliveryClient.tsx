'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Truck, Plus, MapPin, Clock, X, Loader2, Navigation } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';

const DeliveryMap = dynamic(() => import('@/components/delivery/DeliveryMap').then((m) => m.DeliveryMap), { ssr: false });

const DRIVERS = [
  { name: 'Sarbast K.', phone: '+964 750 100 1001' },
  { name: 'Rebwar A.', phone: '+964 750 100 1002' },
  { name: 'Lana M.', phone: '+964 750 100 1003' },
  { name: 'Dilshad N.', phone: '+964 750 100 1004' },
  { name: 'Karwan T.', phone: '+964 750 100 1005' },
];

// Default to Erbil
const DEFAULT_CENTER: [number, number] = [36.1911, 44.0094];

function jitter(base: [number, number], radiusKm = 4): [number, number] {
  const r = radiusKm / 111; // ~1 deg lat
  return [base[0] + (Math.random() - 0.5) * r * 2, base[1] + (Math.random() - 0.5) * r * 2];
}

function distanceKm(a: [number, number], b: [number, number]) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function DeliveryClient({ deliveries: initialDeliveries }: { deliveries: any[] }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [selectedId, setSelectedId] = useState<string | null>(initialDeliveries[0]?.id || null);
  const supabase = useRef(createClient()).current;

  // Subscribe to realtime updates so the map moves as the driver row changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('deliveries-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `user_id=eq.${user.id}` }, async () => {
        const { data } = await supabase.from('deliveries').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setDeliveries(data);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, supabase]);

  // Driver simulation: moves any "assigned" or "picked_up" delivery toward the drop point
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      for (const d of deliveries) {
        if (d.status !== 'assigned' && d.status !== 'picked_up') continue;
        if (d.driver_lat == null || d.driver_lng == null) continue;
        // Real courier is on this job — their GPS pings drive the marker, no simulation.
        if (d.courier_id) continue;
        const target: [number, number] = d.status === 'assigned' ? [d.pickup_lat, d.pickup_lng] : [d.drop_lat, d.drop_lng];
        const here: [number, number] = [d.driver_lat, d.driver_lng];
        const distance = distanceKm(here, target);
        if (distance < 0.05) {
          // Reached target
          if (d.status === 'assigned') {
            await supabase.from('deliveries').update({ status: 'picked_up', driver_lat: target[0], driver_lng: target[1] }).eq('id', d.id);
          } else {
            await supabase.from('deliveries').update({ status: 'delivered', driver_lat: target[0], driver_lng: target[1], eta_minutes: 0 }).eq('id', d.id);
          }
          continue;
        }
        // Move 10% of remaining distance per tick
        const lat = here[0] + (target[0] - here[0]) * 0.1;
        const lng = here[1] + (target[1] - here[1]) * 0.1;
        const eta = Math.max(1, Math.round(distance * 5)); // ~5 min/km
        await supabase.from('deliveries').update({ driver_lat: lat, driver_lng: lng, eta_minutes: eta }).eq('id', d.id);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [deliveries, user, supabase]);

  const startDelivery = async (d: any) => {
    const driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
    // Driver starts somewhere near the pickup
    const start = jitter([d.pickup_lat ?? DEFAULT_CENTER[0], d.pickup_lng ?? DEFAULT_CENTER[1]], 2);
    const { error } = await supabase.from('deliveries').update({
      status: 'assigned',
      driver_name: driver.name,
      driver_phone: driver.phone,
      driver_lat: start[0],
      driver_lng: start[1],
    }).eq('id', d.id);
    if (error) toast(error.message, 'error');
  };

  const cancel = async (d: any) => {
    if (!confirm(locale === 'ku' ? 'دڵنیای؟' : 'Cancel this delivery?')) return;
    const { error } = await supabase.from('deliveries').update({ status: 'cancelled' }).eq('id', d.id);
    if (error) toast(error.message, 'error');
  };

  const selected = deliveries.find((d) => d.id === selectedId) || deliveries[0] || null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Truck className="w-7 h-7 text-orange-500" /> {t.delivery.title}
        </h1>
        <button onClick={() => setShowForm(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t.delivery.requestDelivery}
        </button>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-20 text-zinc-500"><Truck className="w-16 h-16 mx-auto mb-4 opacity-30" /><p className="font-bold text-lg">{t.delivery.noDeliveries}</p></div>
      ) : (
        <div className="grid lg:grid-cols-[380px_1fr] gap-4">
          <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
            {deliveries.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={`text-start bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 transition ${
                  selected?.id === d.id ? 'border-orange-500' : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={d.status} />
                  {d.driver_name && <span className="text-xs font-bold text-zinc-500">🚴 {d.driver_name}</span>}
                </div>
                <div className="text-sm font-bold mb-1 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-1"><span className="text-zinc-500">{t.delivery.pickup}:</span> {d.pickup_address}</span>
                </div>
                <div className="text-sm font-bold flex items-start gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-1"><span className="text-zinc-500">{t.delivery.drop}:</span> {d.drop_address}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-500"><Clock className="w-3 h-3 inline mr-1" />{d.eta_minutes ?? '-'} min</span>
                  <span className="font-black text-orange-500">{Number(d.cost).toLocaleString()} {t.common.currency}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {d.status === 'requested' && (
                    <button onClick={(e) => { e.stopPropagation(); startDelivery(d); }} className="flex-1 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-black">
                      {locale === 'ku' ? 'دیاریکردنی شۆفێر' : 'Assign driver'}
                    </button>
                  )}
                  {d.status !== 'delivered' && d.status !== 'cancelled' && (
                    <button onClick={(e) => { e.stopPropagation(); cancel(d); }} className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-xs font-black">
                      {t.common.cancel}
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
            {selected ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black flex items-center gap-2"><Navigation className="w-4 h-4 text-orange-500" /> {locale === 'ku' ? 'شوێنی ڕاستەوخۆ' : 'Live tracking'}</h3>
                  <StatusBadge status={selected.status} />
                </div>
                <DeliveryMap
                  pickup={selected.pickup_lat != null ? [selected.pickup_lat, selected.pickup_lng] : null}
                  drop={selected.drop_lat != null ? [selected.drop_lat, selected.drop_lng] : null}
                  driver={selected.driver_lat != null ? [selected.driver_lat, selected.driver_lng] : null}
                  height={420}
                />
                {selected.driver_name && (
                  <div className="mt-3 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3">
                    <div>
                      <div className="font-black text-sm">🚴 {selected.driver_name}</div>
                      <div className="text-xs font-bold text-zinc-500">{selected.driver_phone}</div>
                    </div>
                    <a href={`tel:${selected.driver_phone}`} className="px-4 py-2 rounded-lg bg-orange-500 text-white text-xs font-black">
                      {locale === 'ku' ? 'پەیوەندی' : 'Call'}
                    </a>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-500 font-bold py-10 text-center">{locale === 'ku' ? 'هیچ گەیاندنێک هەڵنەبژێردراوە' : 'Select a delivery to see the map'}</p>
            )}
          </div>
        </div>
      )}

      {showForm && <DeliveryFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); router.refresh(); }} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    requested: 'bg-zinc-200 text-zinc-700',
    assigned: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-orange-100 text-orange-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${colors[status] || ''}`}>{status}</span>;
}

function DeliveryFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [form, setForm] = useState({ pickup_address: '', drop_address: '' });
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropCoords, setDropCoords] = useState<[number, number] | null>(null);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState<'pickup' | 'drop' | null>(null);

  // Use OpenStreetMap Nominatim for free address-to-coords lookup
  const geocode = async (q: string): Promise<[number, number] | null> => {
    if (!q.trim()) return null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
        headers: { 'Accept-Language': locale },
      });
      const data = await res.json();
      if (data?.[0]) return [Number(data[0].lat), Number(data[0].lon)];
    } catch {}
    return null;
  };

  const lookupPickup = async () => {
    if (!form.pickup_address.trim()) return;
    setGeocoding('pickup');
    const c = await geocode(form.pickup_address);
    setGeocoding(null);
    if (c) setPickupCoords(c);
    else toast(locale === 'ku' ? 'شوێن نەدۆزرایەوە' : 'Location not found', 'error');
  };
  const lookupDrop = async () => {
    if (!form.drop_address.trim()) return;
    setGeocoding('drop');
    const c = await geocode(form.drop_address);
    setGeocoding(null);
    if (c) setDropCoords(c);
    else toast(locale === 'ku' ? 'شوێن نەدۆزرایەوە' : 'Location not found', 'error');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    let pickup = pickupCoords || (await geocode(form.pickup_address));
    let drop = dropCoords || (await geocode(form.drop_address));
    if (!pickup) pickup = jitter(DEFAULT_CENTER, 2);
    if (!drop) drop = jitter(DEFAULT_CENTER, 4);
    const km = distanceKm(pickup, drop);
    const cost = Math.round(2000 + km * 1500);
    const eta = Math.max(5, Math.round(km * 8));
    const { error } = await supabase.from('deliveries').insert({
      user_id: user.id,
      pickup_address: form.pickup_address,
      drop_address: form.drop_address,
      pickup_lat: pickup[0], pickup_lng: pickup[1],
      drop_lat: drop[0], drop_lng: drop[1],
      cost, eta_minutes: eta,
    });
    setSaving(false);
    if (error) return toast(error.message, 'error');
    toast(t.common.success);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">{t.delivery.requestDelivery}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{t.delivery.pickup}</label>
            <div className="flex gap-2">
              <input value={form.pickup_address} onChange={(e) => { setForm({ ...form, pickup_address: e.target.value }); setPickupCoords(null); }} required
                placeholder={locale === 'ku' ? 'بۆ نموونە: هەولێر، گەڕەکی ٣٢' : 'e.g. Erbil, 32 District'}
                className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <button type="button" onClick={lookupPickup} disabled={geocoding === 'pickup'} className="px-3 rounded-xl bg-orange-500 text-white text-xs font-black flex items-center gap-1">
                {geocoding === 'pickup' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </button>
            </div>
            {pickupCoords && <div className="text-[10px] font-bold text-emerald-600 mt-1">✓ {pickupCoords[0].toFixed(4)}, {pickupCoords[1].toFixed(4)}</div>}
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{t.delivery.drop}</label>
            <div className="flex gap-2">
              <input value={form.drop_address} onChange={(e) => { setForm({ ...form, drop_address: e.target.value }); setDropCoords(null); }} required
                placeholder={locale === 'ku' ? 'بۆ نموونە: سلێمانی، گەڕەکی سالم' : 'e.g. Sulaymaniyah, Salim St'}
                className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <button type="button" onClick={lookupDrop} disabled={geocoding === 'drop'} className="px-3 rounded-xl bg-orange-500 text-white text-xs font-black flex items-center gap-1">
                {geocoding === 'drop' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
              </button>
            </div>
            {dropCoords && <div className="text-[10px] font-bold text-emerald-600 mt-1">✓ {dropCoords[0].toFixed(4)}, {dropCoords[1].toFixed(4)}</div>}
          </div>
          <button disabled={saving} className="mt-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.common.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
