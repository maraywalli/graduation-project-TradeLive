'use client';

import { useEffect, useRef } from 'react';

type Props = {
  pickup?: [number, number] | null;
  drop?: [number, number] | null;
  driver?: [number, number] | null;
  height?: number;
};

export function DeliveryMap({ pickup, drop, driver, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{ pickup?: any; drop?: any; driver?: any; line?: any }>({});
  const LRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      // ensure default icon images load via CDN (no asset-pipeline issues)
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      if (cancelled || !containerRef.current) return;
      LRef.current = L;
      const center = pickup || drop || driver || [36.1911, 44.0094]; // Erbil default
      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false }).setView(center, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      updateLayers();
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when props change
  useEffect(() => {
    if (mapRef.current) updateLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.[0], pickup?.[1], drop?.[0], drop?.[1], driver?.[0], driver?.[1]]);

  function updateLayers() {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const pinIcon = (color: string, label: string) =>
      L.divIcon({
        className: '',
        html: `<div style="background:${color};color:white;font-weight:900;font-size:11px;padding:4px 8px;border-radius:999px;border:2px solid white;box-shadow:0 4px 14px rgba(0,0,0,.3);white-space:nowrap;">${label}</div>`,
        iconSize: [40, 24],
        iconAnchor: [20, 12],
      });

    if (pickup) {
      if (!layersRef.current.pickup) {
        layersRef.current.pickup = L.marker(pickup, { icon: pinIcon('#f97316', '📦 Pickup') }).addTo(map);
      } else layersRef.current.pickup.setLatLng(pickup);
    }
    if (drop) {
      if (!layersRef.current.drop) {
        layersRef.current.drop = L.marker(drop, { icon: pinIcon('#10b981', '🏁 Drop') }).addTo(map);
      } else layersRef.current.drop.setLatLng(drop);
    }
    if (driver) {
      if (!layersRef.current.driver) {
        layersRef.current.driver = L.marker(driver, { icon: pinIcon('#ef4444', '🚴 Driver') }).addTo(map);
      } else {
        layersRef.current.driver.setLatLng(driver);
      }
    }
    if (pickup && drop) {
      if (layersRef.current.line) map.removeLayer(layersRef.current.line);
      layersRef.current.line = L.polyline([pickup, drop], { color: '#f97316', weight: 3, dashArray: '6 6', opacity: 0.7 }).addTo(map);
    }
    // Fit bounds to whatever we have
    const points = [pickup, drop, driver].filter(Boolean) as [number, number][];
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }

  return (
    <>
      {/* Leaflet CSS */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ height }} className="w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800" />
    </>
  );
}
