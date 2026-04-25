# TradeLive Pro

All-in-one marketplace + commerce platform.

> **2026-04-25**: Live streaming feature was removed (was the main source of UX issues — uploads hanging, broadcast crashes, RTMP setup friction). The codebase now focuses on marketplace, brands, events, courses, deliveries, messages, and AI seller tools. The "TradeLive" name is kept for branding continuity.

## Stack
- **Framework**: Next.js 15 (App Router, RSC)
- **Auth + DB + Storage + Realtime**: Supabase (project ref `gbyullcidcacsxpsrwtn`)
- **Maps**: MapLibre GL + free OSM tiles (no API key)
- **Payments**: Stripe Checkout (hosted). Items are stored & displayed in IQD; Stripe is charged in USD using `IQD_PER_USD` rate. Subscription/role upgrades are USD-priced direct.
- **AI**: OpenAI via Replit blueprint + free Pollinations.ai for image generation
- **Styling**: Tailwind CSS v4
- **i18n**: Custom dictionary-based provider, Kurdish (RTL, default) / English (LTR), persisted in cookie + localStorage.

## Run
- Dev server: `npm run dev` (workflow `Start application` runs `next dev -p 5000 -H 0.0.0.0`).
- Schema: `db/schema.sql` (already applied to the linked Supabase project via `scripts/setup-db.ts`).
- Migrations: numbered files in `db/` (`06_*`, `07_*`, `08_*`, `10_*`). Apply manually in the Supabase SQL editor.
  - `db/10_preorders_brand.sql` adds the `preorders` table (waitlist), keeps `items.stock` / `items.brand_id` in sync, and installs a trigger so a seller can only attach items to brands they own.

## Environment
Public values are loaded from `.env.local` (Replit secrets are still available at runtime through `process.env`).
- `NEXT_PUBLIC_SUPABASE_URL` — `https://gbyullcidcacsxpsrwtn.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only admin operations
- `SUPABASE_DB_URL` — only used by the one-shot setup script
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe API keys (test or live)
- `IQD_PER_USD` — IQD→USD conversion rate used at checkout (default 1310)
- `NEXT_PUBLIC_APP_URL` — optional override for the origin embedded in Stripe return URLs
- `HF_TOKEN` — optional Hugging Face token for AI image fallback

`lib/env.ts` centralises env access and contains a hardcoded fallback Supabase URL because the Replit-stored `NEXT_PUBLIC_SUPABASE_URL` secret currently holds an invalid value that cannot be overwritten through tooling.

## Structure
- `app/` — App Router pages
  - `/` marketplace home (fair-feed: 4 premium : 1 free) with Feed/Map toggle + Realtime new-item subscription
  - `/items/[id]` item detail with buy / message / delete (ISR `revalidate=60`)
  - `/seller` seller dashboard with item CRUD, image upload via service-role endpoint, geolocation capture
  - `/events` events grid + ticket purchase + QR display (`qrcode.react`)
  - `/courses` course catalog + enrollment + progress tracking
  - `/brands` brand directory + register; cards link to `/brands/[slug]`
  - `/brands/[slug]` public brand page with info, stats, and the brand's products (in-stock + pre-order badges)
  - `/delivery` delivery requests with status flow
  - `/courier` courier-side dashboard for `delivery`/`admin` roles
  - `/messages` 1:1 DMs (Supabase Realtime channels)
  - `/profile` self profile, tier upgrade, avatar upload, history
  - `/u/[username]` public seller profile
  - `/admin` admin dashboard (role-gated) with AI operations briefing
  - `/login`, `/signup`
  - `/api/items/upload` server-side image upload (service-role, bypasses RLS, 10 MB cap)
  - `/api/checkout/stripe/*` Stripe Checkout Session intent + confirm for cart purchases
  - `/api/billing/stripe/*` Stripe Checkout Session intent + confirm for tier/role upgrades
  - `/checkout/return`, `/billing/return` post-redirect verification pages
  - `/api/ai/*` AI assistance for sellers and admins
- `lib/supabase/{browser,server,admin,middleware}.ts` — SSR auth clients
- `lib/i18n/{dictionaries,provider}.ts` — full ku/en translations
- `lib/auth/provider.tsx` — auth context consumed by client components
- `components/marketplace/ItemsMap.tsx` — MapLibre GL map view of items with coords
- `components/{layout,items,ui,delivery,marketplace}/` — shared UI
- `db/schema.sql` — full Postgres schema with RLS + storage buckets + signup trigger
- `db/06_drop_livestreams.sql` — optional cleanup migration to drop legacy `livestreams`/`livestream_messages`/`live_moderation` tables
- `db/08_items_geo_index.sql` — partial index on `items(latitude, longitude)` for fast map queries
- `middleware.ts` — refreshes Supabase session **only on auth-required routes** (`/profile`, `/cart`, `/checkout`, `/seller`, `/courier`, `/delivery`, `/admin`, `/messages`, `/billing`, `/api`, `/auth`). Public catalog pages skip middleware and use the client-side `AuthProvider` for auth state, eliminating per-nav latency.
- `app/**/loading.tsx` — instant skeleton fallbacks for `/`, `/brands`, `/brands/[slug]`, `/items/[id]`, `/courses`, `/events`, `/u/[username]`, so users never see a blank screen while server data loads.
- `components/skeletons/HomeSkeleton.tsx` — shared skeleton used by the root `loading.tsx` and the home page's `<Suspense>` boundary.

## Auth
- Email + password Supabase Auth
- A trigger (`db/schema.sql`) inserts a `profiles` row on signup
- Session refreshed by `middleware.ts`
- Client components use `useAuth()` from `lib/auth/provider`

## Data
- All pages fetch from Supabase only — no mock data
- RLS policies enforce ownership (sellers manage their items, etc.)
- Storage buckets: `item-images`, `avatars`, `course-content`, `brand-logos`, `event-covers`, `course-covers`

## Integration notes
- Stripe gateway (`lib/stripe.ts`) — server SDK + IQD→USD helper. Items are charged via Stripe Checkout Sessions in USD; the IQD price is preserved on the cart UI and on the platform `payments.amount` row.
- OpenAI blueprint (javascript_openai_ai_integrations) — provides AI seller description, AI studio image generation, and AI admin reports via AI_INTEGRATIONS_OPENAI_{BASE_URL,API_KEY}.

## Hardened payment confirm (Stripe)
Two redundant code paths finalize every Stripe payment so a closed tab or dropped network never costs a user their money:
1. **Browser-driven confirm** — `/api/checkout/stripe/confirm` and `/api/billing/stripe/confirm` are called by the `/checkout/return` and `/billing/return` pages when Stripe bounces the buyer back. They verify the user is authenticated and owns the row before defering to the shared finalizer.
2. **Stripe webhook** — `/api/webhooks/stripe` receives `checkout.session.completed` events server-to-server (signed with `STRIPE_WEBHOOK_SECRET`). It calls the same shared finalizer, so even if the buyer never returns, the payment still completes.

Both paths share `lib/stripe-finalize.ts`:
- Atomic claim (`UPDATE … WHERE status='pending' RETURNING`) so only one path runs the side-effects.
- Subscriptions are bound to their orderRef via the composed key `<orderRef>__<sessionId>` stored in `subscriptions.stripe_payment_intent_id` — protects against mis-applying concurrent upgrades.
- Checkout idempotency: created order IDs are persisted into `payments.metadata.orderIds`; a stuck `processing` row can be retried without creating duplicate orders.
- Losers of the claim race re-read the row and report the real current status (succeeded / failed / processing) instead of falsely reporting success.

### Stripe webhook setup (one-time per environment)
1. In your Stripe Dashboard → Developers → Webhooks → "Add endpoint".
2. URL: `https://<your-domain>/api/webhooks/stripe`
3. Events to send: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
4. Copy the "Signing secret" (`whsec_...`) and set it as the `STRIPE_WEBHOOK_SECRET` env var (Replit secret + Vercel env).
5. The middleware excludes `/api/webhooks/*` so Stripe's POST never triggers a Supabase auth round-trip.

## Pending manual migration
- `db/06_drop_livestreams.sql` — drops the legacy `livestreams`, `livestream_messages`, and `live_moderation` tables. Optional but recommended now that the live feature is removed. Apply via the Supabase SQL editor.
- `db/07_payment_status_states.sql` — extends the `subscriptions.status` and `payments.status` check constraints with `processing` + `failed` so the Stripe atomic-claim flow can run. Apply via the Supabase SQL editor before testing payments live.
- `db/08_items_geo_index.sql` — partial index for the map view. Already applied on 2026-04-25.

## Sample data
- `scripts/seed.ts` (idempotent) seeds 8 marketplace items, 3 brands, 3 courses, 2 events for the existing `@mhamad` and `@seller` profiles. Run with `set -a; . ./.env.local; set +a; npx tsx scripts/seed.ts`.

## Performance (Vercel)
The deployed app was hitting 2–4s per request. Root causes & fixes:
1. **17 pages used `force-dynamic`** → opted out of all caching. Switched the cacheable public catalogs to ISR `revalidate=60`: `/brands`, `/brands/[slug]`, `/u/[username]`, `/items/[id]`. Pages that genuinely need per-user data (cart, profile, admin, seller, checkout, messages, courier, delivery, billing/upgrade, courses, events) stay dynamic.
2. **No `loading.tsx`** anywhere → blank screen during fetch. Added skeletons for every cacheable route + the home page.
3. **Middleware ran on every page** doing a Supabase `getUser()` round-trip. Narrowed the matcher so public pages skip middleware entirely (~300–500 ms saved per nav on cold serverless).
4. **Home page fetched sequentially** in bento mode (items → events → brands → courses). Now parallelised with `Promise.all`, wrapped in `<Suspense>` so the layout streams instantly while data loads. Selects trimmed to needed columns.

## Color contrast guardrails
- `app/globals.css` adds CSS rules that pull low-contrast `text-zinc-*` values inward in both themes (e.g. `text-zinc-300/400` on a white page becomes `zinc-600`; `text-zinc-700/800/900` on a black page becomes `zinc-200/100/50`). Background-aware via `:not(.bg-* *)` selectors so cards on dark surfaces keep their original ramp.
