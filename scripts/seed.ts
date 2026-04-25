/**
 * Seed sample marketplace + brand + event + course rows for the existing users.
 *
 * - Items are placed at real coordinates across major Kurdish cities so the map
 *   view shows them in the right location.
 * - Idempotent: if the items table already has rows, the script BACKFILLS
 *   coordinates onto items that match a known title (instead of skipping).
 *
 * Run: tsx scripts/seed.ts
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

// Mirror lib/env.ts — the Replit-stored NEXT_PUBLIC_SUPABASE_URL secret is malformed.
const RAW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_URL =
  RAW_URL.startsWith('http://') || RAW_URL.startsWith('https://')
    ? RAW_URL
    : 'https://gbyullcidcacsxpsrwtn.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Real coordinates for major Kurdish cities.
const CITY = {
  hewler:  { name: 'Hewlêr (Erbil)',         lat: 36.1911, lng: 44.0091 },
  slemani: { name: 'Slêmanî (Sulaymaniyah)', lat: 35.5556, lng: 45.4351 },
  kalar:   { name: 'Kalar',                  lat: 34.6304, lng: 45.3194 },
  duhok:   { name: 'Duhok',                  lat: 36.8676, lng: 42.9883 },
  kirkuk:  { name: 'Kirkuk',                 lat: 35.4681, lng: 44.3923 },
  halabja: { name: 'Halabja',                lat: 35.1769, lng: 45.9863 },
  ranya:   { name: 'Ranya',                  lat: 36.2541, lng: 44.8814 },
  soran:   { name: 'Soran',                  lat: 36.6534, lng: 44.5414 },
  zakho:   { name: 'Zakho',                  lat: 37.1431, lng: 42.6817 },
  koya:    { name: 'Koya',                   lat: 36.0828, lng: 44.6275 },
} as const;

// Tiny jitter so two items in the same city don't sit on the exact same pin.
const jitter = (n: number) => n + (Math.random() - 0.5) * 0.02;

type SeedItem = {
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  stock: number;
  images: string[];
  city: keyof typeof CITY;
};

const ITEMS: SeedItem[] = [
  { city: 'hewler',  title: 'Wireless Headphones — premium noise-cancelling',
    description: 'Studio-grade over-ear headphones with active noise cancellation, 40h battery, USB-C fast charge.',
    category: 'electronics', price: 149000, currency: 'IQD', stock: 25,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'] },
  { city: 'slemani', title: 'Modern Leather Wallet',
    description: 'Hand-stitched full-grain leather. RFID-blocking. Slim 6-card layout.',
    category: 'fashion', price: 35000, currency: 'IQD', stock: 60,
    images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80'] },
  { city: 'hewler',  title: 'Aromatic Specialty Coffee Beans (1kg)',
    description: 'Single-origin Ethiopian Yirgacheffe. Floral, citrus notes. Roasted weekly.',
    category: 'food', price: 28000, currency: 'IQD', stock: 100,
    images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80'] },
  { city: 'slemani', title: 'Minimalist Desk Lamp',
    description: 'Touch-dimmable LED, 3 color temperatures, USB-C output. Solid aluminium.',
    category: 'home', price: 52000, currency: 'IQD', stock: 18,
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80'] },
  { city: 'duhok',   title: 'Smart Fitness Tracker',
    description: 'Heart rate, SpO₂, sleep tracking. 14-day battery. iOS + Android.',
    category: 'electronics', price: 89000, currency: 'IQD', stock: 40,
    images: ['https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800&q=80'] },
  { city: 'slemani', title: 'Hand-Woven Kurdish Rug',
    description: 'Authentic mountain-village weave. 1.5m × 2m. Wool on cotton warp.',
    category: 'home', price: 320000, currency: 'IQD', stock: 5,
    images: ['https://images.unsplash.com/photo-1600166898405-da9535204843?w=800&q=80'] },
  { city: 'kirkuk',  title: 'Premium Olive Oil — cold-pressed (500ml)',
    description: 'First-pressed extra virgin from Mediterranean groves. Glass bottle.',
    category: 'food', price: 18000, currency: 'IQD', stock: 80,
    images: ['https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80'] },
  { city: 'hewler',  title: 'Mechanical Keyboard — hot-swappable',
    description: 'Aluminium frame, gasket-mount, RGB. Comes with linear and tactile switches.',
    category: 'electronics', price: 195000, currency: 'IQD', stock: 12,
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'] },
  { city: 'kalar',   title: 'Traditional Kurdish Tea Set (6 glasses + tray)',
    description: 'Hand-painted glass with brass tray. Perfect for guests. Comes in a gift box.',
    category: 'home', price: 42000, currency: 'IQD', stock: 30,
    images: ['https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&q=80'] },
  { city: 'kalar',   title: 'Authentic Kurdish Honey (1kg)',
    description: 'Raw mountain honey from the Garmiyan hills. Unfiltered, unpasteurised.',
    category: 'food', price: 45000, currency: 'IQD', stock: 50,
    images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80'] },
  { city: 'halabja', title: 'Pomegranate Molasses (Rûnî Hinar) — 750ml',
    description: 'Slow-reduced traditional sour syrup. Perfect for stews and dressings.',
    category: 'food', price: 12000, currency: 'IQD', stock: 120,
    images: ['https://images.unsplash.com/photo-1582281298055-e25b84a30b0b?w=800&q=80'] },
  { city: 'ranya',   title: 'Kurdish Mountain Honey & Walnut Spread',
    description: 'A locally-made breakfast staple. Glass jar 350g.',
    category: 'food', price: 16000, currency: 'IQD', stock: 70,
    images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80'] },
  { city: 'soran',   title: 'Hiking Backpack 35L — Zagros Edition',
    description: 'Water-resistant, padded back panel, hip belt. Tested on Korek and Halgurd trails.',
    category: 'sports', price: 78000, currency: 'IQD', stock: 22,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'] },
  { city: 'zakho',   title: 'Handmade Kilim Cushion Cover (set of 2)',
    description: 'Vintage geometric pattern. Cotton + wool blend. 45×45cm.',
    category: 'home', price: 38000, currency: 'IQD', stock: 35,
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'] },
  { city: 'koya',    title: 'Children\'s Educational Tablet (KU + EN)',
    description: 'Pre-loaded with Kurdish + English alphabet, math, and reading games. Ages 4–9.',
    category: 'kids', price: 65000, currency: 'IQD', stock: 28,
    images: ['https://images.unsplash.com/photo-1542751110-97427bbecf20?w=800&q=80'] },
  { city: 'duhok',   title: 'Stainless Steel Vacuum Flask 1L',
    description: '24h hot, 12h cold. Perfect for trips and çayxane meet-ups.',
    category: 'home', price: 22000, currency: 'IQD', stock: 90,
    images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80'] },
  { city: 'hewler',  title: 'Smart LED Strip Lights (5m, app-controlled)',
    description: '16M colours, music sync, voice control. Easy peel-and-stick install.',
    category: 'electronics', price: 31000, currency: 'IQD', stock: 65,
    images: ['https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80'] },
  { city: 'slemani', title: 'Kurdish Saffron — Premium Grade (5g)',
    description: 'Hand-picked, vacuum-sealed. Ideal for biryani and dolma.',
    category: 'food', price: 24000, currency: 'IQD', stock: 45,
    images: ['https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80'] },
];

async function main() {
  const { data: profiles, error: pErr } = await sb.from('profiles').select('id, username').limit(2);
  if (pErr || !profiles?.length) {
    console.error('Need at least one profile (sign someone up first).');
    process.exit(1);
  }
  const seller = profiles[0];
  const second = profiles[1] || profiles[0];
  console.log('Seeding for sellers:', profiles.map((p) => '@' + p.username).join(', '));

  // Make sure both seed sellers can post freely — the enforce_free_post_limit
  // trigger caps `free` users at 5 posts / 30d, but we seed up to 9 each.
  const sellerIds = Array.from(new Set([seller.id, second.id]));
  const { error: tierErr } = await sb
    .from('profiles')
    .update({ tier: 'gold', role: 'seller' })
    .in('id', sellerIds);
  if (tierErr) console.warn('Could not upgrade seed sellers to gold:', tierErr.message);
  else console.log(`✓ upgraded ${sellerIds.length} seed seller(s) to gold tier`);

  // ITEMS — insert if empty, otherwise backfill coords on items matching a known title
  const { count: itemCount } = await sb.from('items').select('*', { count: 'exact', head: true });
  if ((itemCount ?? 0) === 0) {
    const rows = ITEMS.map((it, i) => {
      const c = CITY[it.city];
      return {
        seller_id: i % 2 === 0 ? seller.id : second.id,
        status: 'active',
        title: it.title,
        description: it.description,
        category: it.category,
        price: it.price,
        currency: it.currency,
        stock: it.stock,
        images: it.images,
        location: c.name,
        latitude: jitter(c.lat),
        longitude: jitter(c.lng),
      };
    });
    const { error } = await sb.from('items').insert(rows);
    if (error) console.error('items insert error:', error.message);
    else console.log(`✓ inserted ${rows.length} items with city coordinates`);
  } else {
    console.log(`= ${itemCount} items already exist — backfilling coordinates by title`);
    let updated = 0;
    for (const it of ITEMS) {
      const c = CITY[it.city];
      const { data: existing } = await sb
        .from('items')
        .select('id, latitude, longitude, location')
        .eq('title', it.title)
        .limit(1);
      const row = existing?.[0];
      if (!row) continue;
      // Only set fields that are missing — don't overwrite a seller's manual edits.
      const patch: Record<string, unknown> = {};
      if (row.latitude == null) patch.latitude = jitter(c.lat);
      if (row.longitude == null) patch.longitude = jitter(c.lng);
      if (!row.location) patch.location = c.name;
      if (!Object.keys(patch).length) continue;
      const { error } = await sb.from('items').update(patch).eq('id', row.id);
      if (error) console.error(`  ✗ ${it.title}: ${error.message}`);
      else updated++;
    }
    console.log(`✓ backfilled coordinates on ${updated} existing items`);

    // Also INSERT any titles in the seed list that aren't yet in the DB at all.
    const { data: titlesInDb } = await sb.from('items').select('title');
    const have = new Set((titlesInDb ?? []).map((r) => r.title));
    const missing = ITEMS.filter((it) => !have.has(it.title));
    if (missing.length) {
      const rows = missing.map((it, i) => {
        const c = CITY[it.city];
        return {
          seller_id: i % 2 === 0 ? seller.id : second.id,
          status: 'active',
          title: it.title,
          description: it.description,
          category: it.category,
          price: it.price,
          currency: it.currency,
          stock: it.stock,
          images: it.images,
          location: c.name,
          latitude: jitter(c.lat),
          longitude: jitter(c.lng),
        };
      });
      const { error } = await sb.from('items').insert(rows);
      if (error) console.error('items insert error:', error.message);
      else console.log(`✓ added ${rows.length} new items`);
    }
  }

  // BRANDS
  const { count: brandCount } = await sb.from('brands').select('*', { count: 'exact', head: true });
  if ((brandCount ?? 0) === 0) {
    const brands = [
      { name: 'Atlas Coffee Roasters', slug: 'atlas-coffee',
        description: 'Single-origin coffee, roasted weekly in Erbil. Direct trade with Ethiopian and Yemeni farms.',
        logo_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80', owner_id: seller.id, verified: true },
      { name: 'Kurdish Heritage Textiles', slug: 'kurdish-heritage',
        description: 'Hand-woven rugs from mountain villages — preserving traditional patterns from Hewlêr, Slêmanî and Duhok.',
        logo_url: 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=400&q=80', owner_id: second.id, verified: true },
      { name: 'Aurora Electronics', slug: 'aurora-electronics',
        description: 'Premium audio + smart devices. Authorized regional reseller for several global brands.',
        logo_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', owner_id: seller.id, verified: false },
    ];
    const { error } = await sb.from('brands').insert(brands);
    if (error) console.error('brands insert error:', error.message);
    else console.log(`✓ inserted ${brands.length} brands`);
  } else {
    console.log(`= brands already populated (${brandCount}), skipping`);
  }

  // COURSES
  const { count: courseCount } = await sb.from('courses').select('*', { count: 'exact', head: true });
  if ((courseCount ?? 0) === 0) {
    const courses = [
      { instructor_id: seller.id, title: 'Selling Mastery — go from zero to first sale',
        description: '10 modules covering hook writing, lighting, pricing psychology, and closing the sale.',
        price: 49000, category: 'business', duration_minutes: 240,
        cover_url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80' },
      { instructor_id: second.id, title: 'Build a Profitable Online Brand in 30 Days',
        description: 'A practical, no-fluff curriculum: positioning, photography, pricing, ads, customer service.',
        price: 79000, category: 'business', duration_minutes: 360,
        cover_url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80' },
      { instructor_id: seller.id, title: 'Free Intro: How TradeLive Works',
        description: 'A 25-minute walkthrough of the platform: posting items, building your shop, taking orders.',
        price: 0, category: 'tutorial', duration_minutes: 25,
        cover_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80' },
    ];
    const { error } = await sb.from('courses').insert(courses);
    if (error) console.error('courses insert error:', error.message);
    else console.log(`✓ inserted ${courses.length} courses`);
  } else {
    console.log(`= courses already populated (${courseCount}), skipping`);
  }

  // EVENTS
  const { count: eventCount } = await sb.from('events').select('*', { count: 'exact', head: true });
  if ((eventCount ?? 0) === 0) {
    const inDays = (n: number) => new Date(Date.now() + n * 86400_000).toISOString();
    const events = [
      { organizer_id: seller.id, title: 'Erbil Night Market — Pop-Up Bazaar',
        description: 'A two-day open-air market featuring 40+ local sellers, live music, food trucks.',
        venue: 'Sami Abdulrahman Park, Erbil', starts_at: inDays(7), ends_at: inDays(8),
        ticket_price: 5000, total_tickets: 500,
        cover_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' },
      { organizer_id: second.id, title: 'Slêmanî Commerce Conference',
        description: 'Workshops, panels, and networking for sellers building modern brands.',
        venue: 'Slemani Palace Hotel', starts_at: inDays(21), ends_at: inDays(22),
        ticket_price: 25000, total_tickets: 200,
        cover_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80' },
    ];
    const { error } = await sb.from('events').insert(events);
    if (error) console.error('events insert error:', error.message);
    else console.log(`✓ inserted ${events.length} events`);
  } else {
    console.log(`= events already populated (${eventCount}), skipping`);
  }

  console.log('\n✓ Seed complete');
}

main().catch((e) => { console.error('seed failed:', e); process.exit(1); });
