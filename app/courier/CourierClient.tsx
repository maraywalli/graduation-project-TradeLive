'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Truck, MapPin, Navigation, Play, Square, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { createClient } from '@/lib/supabase/browser';
import { toast } from '@/components/ui/Toaster';

const DeliveryMap = dynamic(() => import('@/components/delivery/DeliveryMap').then((m) => m.DeliveryMap), { ssr: false });

export function CourierClient({ open: openInit, mine: mineInit, courierId }: { open: any[]; mine: any[]; courierId: string }) {
  const { locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(openInit);
  const [mine, setMine] = useState(mineInit);
  const [tracking, setTracking] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<{ lat: number; lng: number; at: number } | null>(null);
  const watchId = useRef<number | null>(null);
  const supabase = useRef(createClient()).current;

  // Realtime: keep both lists fresh as deliveries change
  useEffect(() => {
    const refetch = async () => {
      const [o, m] = await Promise.all([
        supabase.from('deliveries').select('*').eq('status', 'requested').is('courier_id', null).order('created_at', { ascending: false }).limit(50),
        supabase.from('deliveries').select('*').eq('courier_id', courierId).neq('status', 'delivered').neq('status', 'cancelled').order('created_at', { ascending: false }),
      ]);
      setOpen(o.data || []);
      setMine(m.data || []);
    };
    const ch = supabase.channel('courier-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, refetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [courierId, supabase]);

  const claim = async (id: string) => {
    const r = await fetch('/api/delivery/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId: id }) });
    const j = await r.json();
    if (!r.ok) return toast(j.error || 'Failed', 'error');
    toast(locale === 'ku' ? 'وەرگیرا!' : 'Claimed!');
  };

  const setStatus = async (id: string, status: 'picked_up' | 'delivered') => {
    const r = await fetch('/api/delivery/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId: id, status }) });
    const j = await r.json();
    if (!r.ok) return toast(j.error || 'Failed', 'error');
    if (status === 'delivered') stopTracking();
  };

  const startTracking = (id: string) => {
    if (!navigator.geolocation) return toast('GPS not supported', 'error');
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    setTracking(id);
    watchId.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLastPing({ lat, lng, at: Date.now() });
        await fetch('/api/delivery/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryId: id, lat, lng }) });
      },
      (err) => toast(`GPS error: ${err.message}`, 'error'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  };

  const stopTracking = () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setTracking(null);
    setLastPing(null);
  };

  useEffect(() => () => stopTracking(), []);

  const activeJob = mine.find((d) => d.id === tracking) || mine[0] || null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
          <Truck className="w-7 h-7 text-orange-500" /> {locale === 'ku' ? 'داشبۆردی گەیاندن' : 'Courier dashboard'}
        </h1>
        {tracking && (
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-black flex items-center gap-2">
            <Wifi className="w-3 h-3 animate-pulse" /> {locale === 'ku' ? 'GPS چالاکە' : 'GPS live'}
            {lastPing && <span className="opacity-70">{lastPing.lat.toFixed(4)}, {lastPing.lng.toFixed(4)}</span>}
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-[380px_1fr] gap-4">
        <div className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          {/* My active jobs */}
          <div>
            <h2 className="font-black text-sm mb-2 text-zinc-500 uppercase">{locale === 'ku' ? 'کارەکانی من' : 'My jobs'} ({mine.length})</h2>
            {mine.length === 0 && <p className="text-xs text-zinc-400 py-2">{locale === 'ku' ? 'هیچ کارێک نییە' : 'No active jobs'}</p>}
            {mine.map((d) => (
              <div key={d.id} className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border-2 mb-2 ${tracking === d.id ? 'border-emerald-500' : 'border-zinc-200 dark:border-zinc-800'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={d.status} />
                  <span className="text-xs font-black text-orange-500">{Number(d.cost).toLocaleString()} IQD</span>
                </div>
                <Row icon={<MapPin className="w-3 h-3 text-orange-500" />} text={d.pickup_address} />
                <Row icon={<MapPin className="w-3 h-3 text-emerald-500" />} text={d.drop_address} />
                <div className="flex flex-wrap gap-2 mt-3">
                  {tracking === d.id ? (
                    <button onClick={stopTracking} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-black flex items-center gap-1">
                      <Square className="w-3 h-3" /> {locale === 'ku' ? 'وەستان' : 'Stop GPS'}
                    </button>
                  ) : (
                    <button onClick={() => startTracking(d.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-black flex items-center gap-1">
                      <Play className="w-3 h-3" /> {locale === 'ku' ? 'دەستپێکردنی GPS' : 'Start GPS'}
                    </button>
                  )}
                  {d.status === 'assigned' && (
                    <button onClick={() => setStatus(d.id, 'picked_up')} className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-black">
                      {locale === 'ku' ? 'وەرگیرا' : 'Picked up'}
                    </button>
                  )}
                  {d.status === 'picked_up' && (
                    <button onClick={() => setStatus(d.id, 'delivered')} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {locale === 'ku' ? 'گەیاندرا' : 'Delivered'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Open jobs */}
          <div>
            <h2 className="font-black text-sm mb-2 text-zinc-500 uppercase">{locale === 'ku' ? 'کارە کراوەکان' : 'Open jobs'} ({open.length})</h2>
            {open.length === 0 && <p className="text-xs text-zinc-400 py-2">{locale === 'ku' ? 'هیچ نییە' : 'Nothing here right now'}</p>}
            {open.map((d) => (
              <div key={d.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black text-orange-500">{Number(d.cost).toLocaleString()} IQD</span>
                  <span className="text-xs font-bold text-zinc-500">~{d.eta_minutes ?? '?'} min</span>
                </div>
                <Row icon={<MapPin className="w-3 h-3 text-orange-500" />} text={d.pickup_address} />
                <Row icon={<MapPin className="w-3 h-3 text-emerald-500" />} text={d.drop_address} />
                <button onClick={() => claim(d.id)} className="mt-3 w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-black">
                  {locale === 'ku' ? 'وەربگرە' : 'Claim'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black flex items-center gap-2"><Navigation className="w-4 h-4 text-orange-500" /> {locale === 'ku' ? 'نەخشە' : 'Map'}</h3>
            {!tracking && <span className="text-xs font-bold text-zinc-400 flex items-center gap-1"><WifiOff className="w-3 h-3" /> {locale === 'ku' ? 'GPS داخراوە' : 'GPS off'}</span>}
          </div>
          {activeJob ? (
            <DeliveryMap
              pickup={activeJob.pickup_lat != null ? [activeJob.pickup_lat, activeJob.pickup_lng] : null}
              drop={activeJob.drop_lat != null ? [activeJob.drop_lat, activeJob.drop_lng] : null}
              driver={lastPing ? [lastPing.lat, lastPing.lng] : (activeJob.driver_lat != null ? [activeJob.driver_lat, activeJob.driver_lng] : null)}
              height={500}
            />
          ) : (
            <p className="text-sm text-zinc-500 font-bold py-10 text-center">{locale === 'ku' ? 'هیچ کارێک هەڵنەبژێردراوە' : 'Claim a job to see it on the map'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-start gap-2 text-xs font-bold mb-1"><span className="mt-0.5">{icon}</span><span className="line-clamp-1">{text}</span></div>;
}
function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = {
    requested: 'bg-zinc-200 text-zinc-700',
    assigned: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-orange-100 text-orange-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${c[status] || ''}`}>{status}</span>;
}
