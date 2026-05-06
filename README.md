# TradeLive Pro

All-in-one marketplace + commerce platform.
Bilingual Kurdish (RTL, default) / English (LTR), black + orange dark theme.

> Live streaming was removed in April 2026 (it was the main source of UX bugs). The "TradeLive" name is kept for branding continuity. The platform now focuses on marketplace, brands, events, courses, deliveries, messages, and AI seller tools.

**Stack**

- **Next.js 15** (App Router, React 19, TypeScript, Tailwind v4)
- **Supabase** — Auth, Postgres, Storage, Realtime
- **MapLibre GL** — interactive map view of items (free OSM tiles, no API key)
- **Stripe** — subscriptions (Gold $5/mo, Premium $15/mo) + role upgrades (Seller / Courier $5)
- **OpenAI** — AI product description writer + admin reports
- **@imgly/background-removal** — client-side studio product photography (zero API cost)

---

## Local development

```bash
npm install
cp .env.example .env.local      # then fill in values
npm run db:setup                # apply schema + RLS to Supabase
npm run dev                     # http://localhost:5000
```

## Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:<you>/tradelive-pro.git
git push -u origin main
```

### 2. Supabase

1. Create a project at <https://supabase.com>.
2. In **SQL Editor**, run the migrations in this order:
   - `db/schema.sql`
   - `db/role_billing.sql`
   - `db/free_post_limit.sql`
   - `db/06_drop_livestreams.sql` (drops the unused legacy live tables)
   - `db/08_items_geo_index.sql` (partial index for the map view)
   - `db/09_cart_items.sql` (cart table, indexes, and RLS policies)
3. In **Storage**, confirm these buckets exist (created by `schema.sql`):
   `item-images`, `avatars`, `course-content`, `brand-logos`, `event-covers`, `course-covers`.
4. Copy `Project URL`, `anon` key, `service_role` key, and the pooled DB connection string.

### 3. Stripe

1. Get test/live API keys from <https://dashboard.stripe.com/apikeys>.
2. Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and (for production) `STRIPE_WEBHOOK_SECRET`.

### 4. Vercel

1. Import the GitHub repo at <https://vercel.com/new>.
2. Framework preset: **Next.js** (auto-detected).
3. Add **all** variables from `.env.example` to **Production** and **Preview** environments.
4. Deploy. Vercel will run `next build` automatically.

After the first deploy, set `NEXT_PUBLIC_SITE_URL` to your production domain
(e.g. `https://tradelive.pro`) and redeploy so server-action origins resolve correctly.

---

## Project layout

```
app/                Next.js App Router pages and API routes
components/         Shared client components (NavBar, ItemsMap, DeliveryMap, …)
lib/                supabase clients, i18n, billing, studio-shot, …
db/                 SQL migrations (run in order)
scripts/setup-db.ts Apply migrations programmatically
middleware.ts       Supabase auth session refresh + route protection
```

## Scripts

| Command            | Purpose                                        |
| ------------------ | ---------------------------------------------- |
| `npm run dev`      | Dev server on port 5000 (Turbopack)            |
| `npm run build`    | Production build                               |
| `npm run start`    | Run the built app                              |
| `npm run typecheck`| TypeScript only — no emit                      |
| `npm run db:setup` | Apply every SQL file in `db/` to Supabase      |
