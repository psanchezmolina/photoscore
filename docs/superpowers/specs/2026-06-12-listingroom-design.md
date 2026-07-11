# ListingRoom — Design Spec

**Date:** 2026-06-12
**Status:** Approved
**Goal:** Ship in one day to a public URL (listingroom.pablo.ky). Portfolio piece for a Senior Growth Marketing application at Photoroom — the polish of the design and the quality of the generated copy ARE the product.

## What it is

A free web tool for e-commerce sellers: upload a product photo (or paste a product page URL) and get a ready-to-paste **listing kit** generated from the real product in seconds:

- SEO-optimized title
- Conversion-focused product description
- 5 benefit bullets
- 3 ad copy variants
- 1 social media caption
- Suggested keywords list

Next to the result, a single CTA: **"Generate the real photo → Open in Photoroom"** linking to photoroom.com. The free hook is the words; the visual (the product photo) is the natural next step inside Photoroom.

All UI, generated content, and README in **English** (target user: English-speaking Shopify/Etsy sellers).

## Decisions made (with rationale)

| Decision | Choice |
|---|---|
| Name | **ListingRoom** — follows Photoroom's X+room naming pattern; reads as a natural extension of their product family |
| Inputs | Photo upload + one optional free-text context field ("brand, audience, platform…") + URL input mode (toggle) |
| Model | `claude-opus-4-8` — quality of output is the product; ~$0.05/generation acceptable |
| Layout | Hero (idle) → workspace transition (photo left / kit blocks right); mobile-first, stacked on mobile |
| URL scraping | Best effort + graceful fallback. Shopify + own stores work reliably; Amazon/Etsy will often block server fetches → elegant fallback message suggesting photo upload. No scraping-API dependency in v1. |

## Architecture

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS.** Same stack as `demo-maker-pabs-ai`; reuse its multi-stage Dockerfile (standalone output), docker-compose, and .dockerignore (minus Supabase parts).
- **Zero persistence:** no DB, no auth, no server state. One page (`/`) + API routes.
- `ANTHROPIC_API_KEY` lives only in server env; Claude is called exclusively from API routes.

## Data flow

### Photo mode

1. Client validates file (jpeg/png/webp/gif, ≤5MB), converts to base64, shows preview.
2. `POST /api/generate` with `{ imageBase64, mediaType, extraContext? }`.
3. Server re-validates, calls Claude API via `@anthropic-ai/sdk`:
   - Model `claude-opus-4-8`, vision (base64 image block with correct `media_type`), single call.
   - **Structured outputs** (`output_config.format` with JSON schema) — API guarantees valid JSON matching the kit shape. Defensive try/catch kept anyway.
   - `thinking: {type: "adaptive"}` + `output_config.effort: "medium"` (balance quality vs. live-waiting UX), `max_tokens: 8000`.
4. Response shape: `{ productSummary, title, description, bullets[5], adCopy[3], socialCaption, keywords[] }`.
   - `productSummary` (what Claude sees in the photo) is used as alt text and the result subtitle ("Your ceramic mug listing kit").

### URL mode

New route `POST /api/scrape` (or a pre-step inside `/api/generate` — implementation plan decides):

1. Validate public http(s) URL; **block private/internal IPs (SSRF protection)**.
2. **Shopify detection first:** try `<url>.json` (`/products/<handle>.json`) → clean JSON with title, description, images.
3. **Generic fallback:** GET HTML with realistic User-Agent + cheerio → extract `og:title`, `og:description`, `og:image` (`twitter:image` as backup).
4. Download product image server-side → base64 → **same vision pipeline as upload**, with scraped title/description injected as extra prompt context (Claude sees the image AND knows how the seller describes it → better kits than photo alone).
5. If blocked or no OG tags → graceful error: *"This store blocks automated access — try uploading a photo instead"* with automatic switch to upload mode.
6. Aggressive fetch timeout (~8s) so failure feels fast, not hung.

## UI components

- `page.tsx`: state machine `idle | generating | result | error`.
- Input mode toggle: `Upload photo` | `Paste URL`. Shared optional context field and Generate button.
- `UploadZone`: drag & drop + click, instant preview, replaceable.
- `ContextInput`: single optional field ("Add context: brand, audience, platform… (optional)").
- `ResultView`: user's photo left (sticky on desktop) with **CTA card below it** — "Generate the real photo → Open in Photoroom" linking to photoroom.com with UTMs (`?utm_source=listingroom&utm_medium=referral&utm_campaign=listing-kit`). Right side: 6 `KitBlock`s (title, content, copy button with "Copied!" feedback).
- Loading state: block skeletons + rotating messages ("Reading your product photo…", "Writing your SEO title…", "Polishing your ad copy…"). Generation takes 15–30s; the wait must feel alive.
- Footer: discreet "Made with ♥ for Photoroom" + repo link.
- "Start over" button returns to idle.

## Visual design

Before building the UI, open photoroom.com with Playwright and extract its visual language (typography, palette, radii, spacing) so ListingRoom feels "part of the family" without cloning. Direction: minimal and confident, one clear action, generous whitespace, mobile-first. No generic component libraries; custom Tailwind.

## Errors & abuse protection

- English error messages mapped by type: invalid image, Anthropic 429 → "We're handling a lot of requests, try again in a minute", 5xx → "Something went wrong, please try again", blocked scrape → fallback message above.
- Own rate limit: in-memory per-IP (~10 generations/hour) to protect the API key on a public URL. Sufficient without a DB.

## Build order (protects the ship)

- **Block A (first, gets deployed):** complete photo MVP end to end, live on listingroom.pablo.ky.
- **Block B (same day, on top of deployed):** URL input mode. If time runs out, what's deployed is never broken.

## Delivery

- Public GitHub repo, English README: what it is, screenshot/GIF, how to run (local + Docker), architecture note.
- Dockerfile + docker-compose → Easypanel on Contabo → listingroom.pablo.ky.
- Final verification against the live public URL (real behavior, not just build success).

## Phase 2 (documented, NOT built — material for the application)

- Scraping API (ScraperAPI/Scrapfly) for Amazon/Etsy URL support.
- Programmatic SEO: category landing pages ("AI listing generator for candles", …).
- Analytics (PostHog): funnel upload → generate → copy → CTA click.

## Out of scope (v1)

- No DB, auth, or accounts.
- No real Photoroom API integration — the CTA is a link handoff, not image processing.
- No analytics in the demo (tracking is described in the application, not implemented).
