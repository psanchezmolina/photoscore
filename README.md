# PhotoScore

Your Shopify store's product photos, graded in about 60 seconds. Free, no signup.

Live: **[photoscore.pablo.ky](https://photoscore.pablo.ky)**

## What it does

Paste your store URL. PhotoScore pulls a sample of your real catalog through Shopify's public `products.json`, looks at the actual photos, and returns:

- A store-level **Photo Score** (A to F, plus 0-100)
- A per-product breakdown: grade, issues, genuine strengths
- The **worst offender**: the photo costing you the most clicks
- The **top 3 fixes**, ordered by conversion impact, all doable without a photographer

The full per-product report is available by email. The natural next step after seeing your grade is fixing the photos: that's the "Fix it with Photoroom" button (my referral link, see disclosure below).

## How it works

One page, four API routes, one model call.

- `POST /api/audit`: fetches `/products.json` (SSRF-guarded, redirect-revalidated), samples up to 6 products spread across the catalog, downloads the images at 800px via Shopify's CDN width param, and sends them in a single `claude-opus-4-8` vision call with a JSON schema. The auditor prompt grades only what is visible and weighs catalog consistency heavily.
- `POST /api/lead` and `POST /api/event`: append-only JSONL logs (leads, funnel events), no database.
- `GET /api/stats`: the funnel (visits, audits, emails, referral clicks) sliced by UTM, behind a key.
- Rate limit: 3 audits per hour per IP.

## Why this exists

Built in one afternoon (inside a 4-hour budget) for Photoroom's growth hiring challenge: build something that gets Shopify merchants to show real interest, then distribute it from a standing start of zero audience.

The thesis: merchants' deepest photo pain isn't technical, it's the quiet fear that their store looks amateur. A grade makes that fear concrete, personal, and fixable in one glance, and a store URL is the lowest-friction input there is (you can even grade a store that isn't yours).

PhotoScore forks the skeleton of [ListingRoom](https://github.com/psanchezmolina/listingroom), an earlier one-day build: same stack, same guards, new product.

## Run it locally

```bash
npm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
npm test
```

Stack: Next.js 14 (App Router), TypeScript, Tailwind.

## Disclosure

Made by Pablo Sánchez. Not affiliated with Photoroom. I'm part of the [Photoroom with Friends](https://www.photoroom.com/campaign/photoroom-with-friends) referral program, and the CTA uses my referral link.
