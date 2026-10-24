# Billions Motors

Website for Billions Motors — premium cars imported from China, sold in Yerevan.
Armenian (`/hy`, default), English (`/en`) and Russian (`/ru`).

## Stack

- **Next.js 15** (App Router, server rendering) + **TypeScript**
- **Tailwind CSS v4** with the *Noir Champagne* design tokens (`src/app/globals.css`)
- Fonts self-hosted via Fontsource: Cormorant Garamond, Inter, Noto Sans/Serif Armenian
- **PostgreSQL** for cars, translations, colours, photos, leads and admin users
  (embedded PGlite locally — no install; a real PostgreSQL server via `DATABASE_URL` in production)
- **Admin panel** at `/admin`: Full role (cars, colours, photos, “You may also like”, contact info, users,
  requests) and Sales role (only “Sell a car”). The first visit creates the first Full user.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000 → redirects to /hy
```

`npm run build && npm start` runs the production build.

## Database

Locally nothing to install: on first start the app creates an embedded PostgreSQL in
`.data/pglite`, applies the migrations and inserts the demo cars. Delete `.data/` to start fresh.

To inspect it, or in production, use a regular PostgreSQL and set `DATABASE_URL`
(locally: Postgres.app, `DATABASE_URL=postgres://<mac user>@localhost:5432/billions`). The database
and tables are created automatically on first start.

For testing, `DEV_TEST_PASSWORD` in `.env.local` creates two dev-only admin users,
`test-full@billions.local` and `test-sales@billions.local` (never in production).

## Project layout

```
src/
  app/
    [locale]/            pages: home, cars, cars/[slug], loan-calculator, contact,
                         [page] (financing, import-process, warranty, about)
    api/leads/route.ts   form submissions → leads table
    robots.ts, sitemap.ts
  components/            Header, Footer, CarCard, Gallery, LeadForm, LoanCalculator…
  i18n/                  hy.ts / en.ts / ru.ts dictionaries — all site text lives here
  lib/
    db/index.ts          connection (PGlite or pg), runs migrations, seeds demo cars
    db/migrations.ts     SQL schema — add new migrations at the end, never edit shipped ones
    db/seed.ts           demo cars inserted into an empty database (dev / test site)
    vehicles.ts          car queries used by the pages
    leads.ts             saves form requests
    loan.ts              annuity loan formula
```

## Private testing

Set `SITE_NOINDEX=true` while the site is restricted to the team's IPs: it sends
`noindex` headers and serves a disallow-all `robots.txt`. Set it to `false` on launch day.
