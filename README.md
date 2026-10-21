# Billions Motors

Website for Billions — premium cars imported from China, sold in Yerevan.
Armenian (`/hy`, default) and English (`/en`).

## Stack

- **Next.js 15** (App Router, server rendering) + **TypeScript**
- **Tailwind CSS v4** with the *Noir Champagne* design tokens (`src/app/globals.css`)
- Fonts self-hosted via Fontsource: Cormorant Garamond, Inter, Noto Sans/Serif Armenian
- Planned: **PostgreSQL** for cars, photos and leads; admin panel

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000 → redirects to /hy
```

`npm run build && npm start` runs the production build.

## Project layout

```
src/
  app/
    [locale]/            pages: home, cars, cars/[slug], loan-calculator, contact,
                         [page] (financing, import-process, warranty, about)
    api/leads/route.ts   form submissions (validated; DB insert is next)
    robots.ts, sitemap.ts
  components/            Header, Footer, CarCard, Gallery, LeadForm, LoanCalculator…
  i18n/                  hy.ts / en.ts dictionaries — all site text lives here
  lib/
    vehicles.ts          data access (mock data now → PostgreSQL next)
    mock-vehicles.ts     development seed cars
    loan.ts              annuity loan formula
```

## Private testing

Set `SITE_NOINDEX=true` while the site is restricted to the team's IPs: it sends
`noindex` headers and serves a disallow-all `robots.txt`. Set it to `false` on launch day.
