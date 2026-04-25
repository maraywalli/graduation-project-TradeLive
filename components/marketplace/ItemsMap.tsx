'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl, { Map as MlMap, Marker, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

type Item = {
  id: string;
  title: string;
  price: number | string;
  currency?: string;
  latitude: number | null;
  longitude: number | null;
  images?: string[] | null;
  location?: string | null;
};

// Free OpenStreetMap raster tile style — no API key, no quota grief.
// Centred on Erbil by default (project is Kurdish-first).
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
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export function ItemsMap({ items }: { items: Item[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const router = useRouter();
  const { locale } = useI18n();
  const [webglError, setWebglError] = useState(false);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // MapLibre needs WebGL. Some browsers (older mobiles, locked-down corp devices,
    // headless screenshot tools) don't have it. Detect and fall back gracefully
    // instead of crashing the whole page.
    try {
      const probe = document.createElement('canvas');
      const ctx =
        probe.getContext('webgl2') ||
        probe.getContext('webgl') ||
        probe.getContext('experimental-webgl');
      if (!ctx) {
        setWebglError(true);
        return;
      }
    } catch {
      setWebglError(true);
      return;
    }

    let m: MlMap;
    try {
      m = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE,
        center: [44.0091, 36.1911], // Erbil
        zoom: 6,
      });
      m.on('error', (e) => {
        // Suppress noisy tile-load errors from being thrown to the error boundary.
        // eslint-disable-next-line no-console
        console.warn('[ItemsMap] map error', e?.error?.message || e);
      });
    } catch {
      setWebglError(true);
      return;
    }
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
    mapRef.current = m;
    return () => { m.remove(); mapRef.current = null; };
  }, []);

  // Render markers when items change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Wait for style load before adding markers
    const apply = () => {
      // clear old markers
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];

      const withCoords = items.filter(
        (i) => typeof i.latitude === 'number' && typeof i.longitude === 'number'
      );
      if (!withCoords.length) return;

      const bounds = new maplibregl.LngLatBounds();
      const currency = (c: string | undefined) => c || 'IQD';
      withCoords.forEach((i) => {
        const img = i.images?.[0] || '';
        const priceTxt = `${Number(i.price).toLocaleString()} ${currency(i.currency)}`;

        // The pin itself = thumbnail + price chip, always visible on the map.
        const el = document.createElement('div');
        el.className = 'tl-pin';
        el.innerHTML = `
          <div class="tl-pin-card">
            ${img
              ? `<img src="${escapeAttr(img)}" alt="${escapeAttr(i.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'" />`
              : `<div class="tl-pin-noimg">📍</div>`}
            <div class="tl-pin-price">${escapeHtml(priceTxt)}</div>
          </div>
          <div class="tl-pin-arrow"></div>
        `;

        // Popup: bigger image + title + location + CTA, shown on click.
        const popupHtml = `
          <a href="/items/${encodeURIComponent(i.id)}" style="text-decoration:none;color:inherit;display:block;font-family:inherit;min-width:180px;max-width:220px">
            ${img ? `<img src="${escapeAttr(img)}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px" />` : ''}
            <div style="font-weight:900;color:#111;line-height:1.25;margin-bottom:4px">${escapeHtml(i.title)}</div>
            <div style="font-weight:900;color:#f97316;font-size:14px">${escapeHtml(priceTxt)}</div>
            ${i.location ? `<div style="font-size:11px;color:#666;margin-top:3px">📍 ${escapeHtml(i.location)}</div>` : ''}
            <div style="font-size:11px;color:#f97316;font-weight:800;margin-top:6px">${locale === 'ku' ? 'بینین ←' : 'View →'}</div>
          </a>
        `;
        const popup = new Popup({ offset: 22, closeButton: false, maxWidth: '240px' }).setHTML(popupHtml);

        const marker = new Marker({ element: el, anchor: 'bottom' })
          .setLngLat([i.longitude as number, i.latitude as number])
          .setPopup(popup)
          .addTo(map);

        // Single click → toggle popup; double click → navigate (avoids accidental nav while panning).
        let lastClick = 0;
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const now = Date.now();
          if (now - lastClick < 350) {
            router.push(`/items/${i.id}`);
            return;
          }
          lastClick = now;
        });

        markersRef.current.push(marker);
        bounds.extend([i.longitude as number, i.latitude as number]);
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 600 });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once('load', apply);
  }, [items, router, locale]);

  return (
    <>
      <style jsx global>{`
        .tl-pin {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          will-change: transform;
          transition: transform 160ms ease;
        }
        .tl-pin:hover {
          transform: scale(1.08);
          z-index: 10;
        }
        .tl-pin-card {
          background: white;
          border-radius: 10px;
          padding: 3px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22), 0 0 0 2px #f97316;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 44px;
        }
        .tl-pin-card img {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 7px;
          display: block;
          background: #f4f4f5;
        }
        .tl-pin-noimg {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #fff7ed, #ffedd5);
          border-radius: 7px;
          font-size: 18px;
        }
        .tl-pin-price {
          background: linear-gradient(135deg, #f97316, #ef4444);
          color: white;
          font-weight: 900;
          font-size: 10px;
          line-height: 1;
          padding: 3px 6px;
          border-radius: 999px;
          white-space: nowrap;
          letter-spacing: 0.2px;
        }
        .tl-pin-arrow {
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #f97316;
          margin-top: -1px;
          filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.18));
        }
        .maplibregl-popup-content {
          border-radius: 12px !important;
          padding: 10px !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18) !important;
        }
        .maplibregl-popup-content a:hover .tl-pin-price,
        .maplibregl-popup-content a:focus { text-decoration: none; }
      `}</style>
      {webglError ? (
        <div className="w-full h-[70vh] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 grid place-items-center p-6">
          <div className="text-center max-w-sm">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
            <h3 className="font-black text-lg mb-2">
              {locale === 'ku' ? 'نەخشە ناتوانرێت پیشان بدرێت' : 'Map cannot be displayed'}
            </h3>
            <p className="text-sm text-zinc-500 font-medium mb-4">
              {locale === 'ku'
                ? 'وێبگراف لە وێبگەڕەکەتدا چالاک نییە. لە جیاتی ئەمە لیستی شوێنەکان بکەرەوە.'
                : 'WebGL is disabled in your browser. Showing the locations as a list instead.'}
            </p>
            <ul className="text-start text-sm font-semibold space-y-2 max-h-72 overflow-y-auto">
              {items.map((i) => (
                <li key={i.id}>
                  <a href={`/items/${i.id}`} className="flex items-start gap-2 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{i.title}</div>
                      <div className="text-xs text-zinc-500 truncate">{i.location || '—'}</div>
                    </div>
                    <div className="text-xs font-black text-orange-500 whitespace-nowrap">
                      {Number(i.price).toLocaleString()} {i.currency || 'IQD'}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="w-full h-[70vh] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800" />
      )}
    </>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
