'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MlMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Loader2, MapPin, X, LocateFixed, Search } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (result: { latitude: number; longitude: number; address?: string }) => void;
  initial?: { latitude: number | null; longitude: number | null } | null;
  locale: string;
};

const ERBIL: [number, number] = [44.0091, 36.1911];

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

/**
 * Modal map picker. The user clicks anywhere on the map (or drags the pin)
 * to choose a location, with optional address-search and "use my GPS"
 * shortcuts. Reverse-geocodes the chosen point via Nominatim so the form
 * gets a human-readable address, not just lat/lng.
 */
export default function LocationPicker({ open, onClose, onPick, initial, locale }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial?.latitude != null && initial?.longitude != null
      ? { lat: initial.latitude, lng: initial.longitude }
      : null,
  );
  const [address, setAddress] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const isKu = locale === 'ku';

  // Initialise map once the modal is opened. Tearing down + rebuilding on
  // each open is intentional — MapLibre containers are picky about being
  // reattached, and the modal is short-lived.
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const start: [number, number] = coords ? [coords.lng, coords.lat] : ERBIL;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: start,
      zoom: coords ? 13 : 11,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const marker = new maplibregl.Marker({ color: '#f97316', draggable: true })
      .setLngLat(start)
      .addTo(map);

    const update = (lng: number, lat: number) => {
      marker.setLngLat([lng, lat]);
      setCoords({ lat, lng });
      void reverseGeocode(lat, lng).then((a) => a && setAddress(a));
    };

    map.on('click', (e) => update(e.lngLat.lng, e.lngLat.lat));
    marker.on('dragend', () => {
      const ll = marker.getLngLat();
      update(ll.lng, ll.lat);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Pre-fill address if we already have coords.
    if (coords) {
      void reverseGeocode(coords.lat, coords.lng).then((a) => a && setAddress(a));
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // We want this effect to run only when the modal opens/closes — coords
    // changes are handled via the marker imperatively.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        markerRef.current?.setLngLat([longitude, latitude]);
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 14 });
        void reverseGeocode(latitude, longitude).then((a) => a && setAddress(a));
        setBusy(false);
      },
      () => setBusy(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`,
        { headers: { 'Accept-Language': isKu ? 'ku,en' : 'en' } },
      );
      const json = await r.json();
      const hit = json?.[0];
      if (hit) {
        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        setCoords({ lat, lng });
        setAddress(hit.display_name || search);
        markerRef.current?.setLngLat([lng, lat]);
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 14 });
      }
    } catch {
      // Silently swallow — search is a nice-to-have, not critical.
    } finally {
      setSearching(false);
    }
  };

  const confirm = () => {
    if (!coords) return;
    onPick({ latitude: coords.lat, longitude: coords.lng, address: address || undefined });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            {isKu ? 'شوێنەکە لەسەر نەخشە دیاری بکە' : 'Pick a location on the map'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-2">
          <form onSubmit={runSearch} className="flex-1 flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKu ? 'گەڕان بە ناونیشان (وەک: هەولێر، شار)' : 'Search address (e.g. Erbil, Iraq)'}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="submit"
              disabled={searching || !search.trim()}
              className="px-3 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isKu ? 'گەڕان' : 'Search'}
            </button>
          </form>
          <button
            onClick={useMyLocation}
            disabled={busy}
            className="px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
            {isKu ? 'شوێنی من' : 'My location'}
          </button>
        </div>

        <div ref={containerRef} className="flex-1 min-h-[360px]" />

        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300">
            {coords ? (
              <>
                <div className="font-bold text-zinc-900 dark:text-white truncate">
                  {address || (isKu ? 'شوێنی هەڵبژێردراو' : 'Selected location')}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </div>
              </>
            ) : (
              <span>{isKu ? 'کلیک لەسەر نەخشە بکە بۆ هەڵبژاردنی شوێن' : 'Tap the map to drop a pin'}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-sm font-bold"
            >
              {isKu ? 'پاشگەزبوونەوە' : 'Cancel'}
            </button>
            <button
              onClick={confirm}
              disabled={!coords}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold disabled:opacity-50"
            >
              {isKu ? 'دیاریکردن' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Free reverse-geocoding via Nominatim. No key required, but it has a
 * 1 req/s rate limit and asks for a meaningful User-Agent / Referer — both
 * supplied automatically by the browser. We keep this best-effort: an
 * empty result just means the user sees coordinates instead of a name.
 */
async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
    );
    const json = await r.json();
    return json?.display_name || null;
  } catch {
    return null;
  }
}
