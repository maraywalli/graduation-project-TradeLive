'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Truck, Plus, MapPin, Clock, X, Loader2, Navigation, PackageCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { useAuth } from '@/lib/auth/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';

const DeliveryMap = dynamic(() => import('@/components/delivery/DeliveryMap').then((m) => m.DeliveryMap), { ssr: false });
const LocationPicker = dynamic(() => import('@/components/marketplace/LocationPicker'), { ssr: false });

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
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedCartIds, setSelectedCartIds] = useState<string[]>([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [form, setForm] = useState({ drop_address: '' });
  const [dropCoords, setDropCoords] = useState<[number, number] | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/cart', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Failed to load cart');
        if (cancelled) return;
        const lines = (json.items || []).filter((line: any) => line.item);
        setCartItems(lines);
        setSelectedCartIds(lines.map((line: any) => line.id));
      } catch (e: any) {
        if (!cancelled) toast(e?.message || 'Failed to load cart', 'error');
      } finally {
        if (!cancelled) setCartLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Best-effort pickup lookup for cart items that do not already have seller
  // coordinates. Destination is chosen explicitly with the map picker.
  const geocode = async (q: string): Promise<[number, number] | null> => {
    if (!q.trim()) return null;
    try {
      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (key) {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}&language=${locale === 'ku' ? 'ku' : 'en'}`);
        const data = await res.json();
        const loc = data?.results?.[0]?.geometry?.location;
        if (loc) return [Number(loc.lat), Number(loc.lng)];
      } else {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, {
          headers: { 'Accept-Language': locale },
        });
        const data = await res.json();
        if (data?.[0]) return [Number(data[0].lat), Number(data[0].lon)];
      }
    } catch {}
    return null;
  };

  const pickupAddressFor = (line: any) => {
    const item = line.item || {};
    return String(item.location || item.description || '').trim();
  };

  const selectedLines = cartItems.filter((line) => selectedCartIds.includes(line.id));

  const toggleCartLine = (id: string) => {
    setSelectedCartIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedLines.length === 0) return toast(locale === 'ku' ? 'هیچ کاڵایەک هەڵنەبژێردراوە' : 'Select at least one cart item', 'error');
    if (!dropCoords || !form.drop_address.trim()) return toast(locale === 'ku' ? 'شوێنی گەیاندن لەسەر نەخشە دیاری بکە' : 'Pick a destination on the map', 'error');

    setSaving(true);
    const supabase = createClient();
    setGeocoding(true);
    const rows = [];
    for (const line of selectedLines) {
      const item = line.item || {};
      const pickupAddress = pickupAddressFor(line);
      if (!pickupAddress) {
        setSaving(false);
        setGeocoding(false);
        return toast(locale === 'ku' ? 'ناونیشانی کاڵا لە وەسف/شوێن نییە' : `${item.title || 'Item'} has no pickup address in its description/location`, 'error');
      }
      const pickup: [number, number] | null =
        item.latitude != null && item.longitude != null
          ? [Number(item.latitude), Number(item.longitude)]
          : await geocode(pickupAddress);
      if (!pickup) {
        setSaving(false);
        setGeocoding(false);
        return toast(locale === 'ku' ? 'شوێنی هەڵگرتنی کاڵا نەدۆزرایەوە' : `Could not locate pickup for ${item.title || 'item'}`, 'error');
      }
      const km = distanceKm(pickup, dropCoords);
      rows.push({
        user_id: user.id,
        pickup_address: `${item.title || 'Package'} - ${pickupAddress}`,
        drop_address: form.drop_address,
        pickup_lat: pickup[0], pickup_lng: pickup[1],
        drop_lat: dropCoords[0], drop_lng: dropCoords[1],
        cost: Math.round(2000 + km * 1500),
        eta_minutes: Math.max(5, Math.round(km * 8)),
      });
    }
    setGeocoding(false);
    const { error } = await supabase.from('deliveries').insert(rows);
    setSaving(false);
    if (error) return toast(error.message, 'error');
    toast(t.common.success);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black">{t.delivery.requestDelivery}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block">{locale === 'ku' ? 'کاڵاکانی سەبەتە' : 'Cart items to deliver'}</label>
              {cartItems.length > 0 && (
                <button type="button" onClick={() => setSelectedCartIds(selectedCartIds.length === cartItems.length ? [] : cartItems.map((line) => line.id))} className="text-xs font-black text-orange-500">
                  {selectedCartIds.length === cartItems.length ? (locale === 'ku' ? 'لابردنی هەموو' : 'Clear') : (locale === 'ku' ? 'هەڵبژاردنی هەموو' : 'Select all')}
                </button>
              )}
            </div>
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {cartLoading ? (
                <div className="p-4 text-center text-zinc-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : cartItems.length === 0 ? (
                <div className="p-4 text-sm font-bold text-zinc-500">{locale === 'ku' ? 'سەبەتەکەت بەتاڵە' : 'Your cart is empty'}</div>
              ) : cartItems.map((line) => {
                const item = line.item || {};
                const selected = selectedCartIds.includes(line.id);
                const pickupAddress = pickupAddressFor(line);
                return (
                  <button key={line.id} type="button" onClick={() => toggleCartLine(line.id)} className={`w-full p-3 text-start flex items-center gap-3 border-b last:border-b-0 border-zinc-200 dark:border-zinc-800 ${selected ? 'bg-orange-50 dark:bg-orange-950/20' : 'bg-white dark:bg-zinc-900'}`}>
                    <span className={`w-5 h-5 rounded-md border grid place-items-center shrink-0 ${selected ? 'bg-orange-500 border-orange-500 text-white' : 'border-zinc-300 dark:border-zinc-700'}`}>{selected ? '✓' : ''}</span>
                    <PackageCheck className="w-5 h-5 text-orange-500 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black line-clamp-1">{item.title}</span>
                      <span className={`block text-xs font-bold line-clamp-1 ${pickupAddress ? 'text-zinc-500' : 'text-red-500'}`}>
                        {pickupAddress || (locale === 'ku' ? 'ناونیشان لە وەسف/شوێن نییە' : 'No pickup address in description/location')}
                      </span>
                    </span>
                    <span className="text-xs font-black text-zinc-500">x{line.quantity}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mb-1 block">{t.delivery.drop}</label>
            <div className="flex gap-2">
              <input value={form.drop_address} onChange={(e) => setForm({ ...form, drop_address: e.target.value })} required readOnly
                placeholder={locale === 'ku' ? 'شوێنی گەیاندن لەسەر نەخشە دیاری بکە' : 'Pick your destination on the map'}
                className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <button type="button" onClick={() => setMapOpen(true)} className="px-3 rounded-xl bg-orange-500 text-white text-xs font-black flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {locale === 'ku' ? 'نەخشە' : 'Map'}
              </button>
            </div>
            {dropCoords && <div className="text-[10px] font-bold text-emerald-600 mt-1">✓ {dropCoords[0].toFixed(4)}, {dropCoords[1].toFixed(4)}</div>}
          </div>
          <button disabled={saving || cartLoading || selectedLines.length === 0 || !dropCoords} className="mt-2 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50">
            {(saving || geocoding) && <Loader2 className="w-4 h-4 animate-spin" />}
            {t.common.submit}
          </button>
        </div>
        <LocationPicker
          open={mapOpen}
          onClose={() => setMapOpen(false)}
          locale={locale}
          initial={dropCoords ? { latitude: dropCoords[0], longitude: dropCoords[1] } : null}
          onPick={(result) => {
            setDropCoords([result.latitude, result.longitude]);
            setForm({ drop_address: result.address || `${result.latitude.toFixed(5)}, ${result.longitude.toFixed(5)}` });
          }}
        />
      </form>
    </div>
  );
}
