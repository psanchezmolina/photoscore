# Design Notes: Photoroom.com Reconnaissance
_Captured 2026-06-12 via Playwright against https://www.photoroom.com_

---

## 1. Extracted Values (measured, not invented)

### Typography

| Element | Value |
|---|---|
| Font stack (body + all headings) | `"TT Photoroom", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif` |
| H1 font-size | `72px` |
| H1 font-weight | `600` |
| H1 letter-spacing | `-1.41px` (tight negative tracking) |
| H1 line-height | `79.2px` (1.1× size) |
| H1 color | `rgb(0, 0, 0)` — pure black |
| H2 large (section header) | `42px`, weight `500`, letter-spacing `-0.36px`, color black |
| H2 sub/lead | `20px`, weight `500`, color `rgb(107, 107, 107)` (muted gray) |
| Body / feature captions | `14–17px`, weight `500`, line-height `1.5×` |
| Muted body color | `rgb(107, 107, 107)` — medium gray |
| Dark body color | `rgb(64, 65, 71)` — near-black with slight blue-gray cast |

### Colors

| Role | Computed value | Approx hex |
|---|---|---|
| Brand accent (primary CTA, announcement bar) | `rgb(73, 47, 251)` | `#492FFB` |
| Brand accent faint tint (cookie buttons) | `rgba(88, 38, 222, 0.06)` | `#5826DE` at 6% |
| Ink (headings, body) | `rgb(0, 0, 0)` | `#000000` |
| Muted text | `rgb(107, 107, 107)` | `#6B6B6B` |
| Near-black text (paragraphs) | `rgb(64, 65, 71)` | `#404147` |
| Surface default | `rgb(255, 255, 255)` | `#FFFFFF` |
| Surface dark section | `rgb(0, 0, 0)` | `#000000` |
| Surface neutral strip | `rgb(71, 71, 71)` | `#474747` |
| Hero gradient start | `#EEE5F6` (lavender) | — |
| Hero gradient mid | `#FFFFFF` | — |
| Hero gradient end | `#F0E9F8` (pale violet) | — |
| Nav background (scrolled) | `rgba(255, 255, 255, 0.85)` — frosted | — |

### CTA Button (hero: "Start creating for free")

| Property | Value |
|---|---|
| Background | `rgb(73, 47, 251)` / `#492FFB` |
| Text color | `rgb(255, 255, 255)` |
| Border radius | `10px` |
| Font weight | `400` (regular — surprisingly light) |
| Font size | `16px` |
| Height | `56px` |
| Padding left/right | `64px` (very generous horizontal padding) |
| Padding top/bottom | vertically centered via flex, no explicit padding |
| Border | none |

### Nav CTA ("Start creating" — compact, header)

| Property | Value |
|---|---|
| Background | `rgb(26, 26, 26)` — near-black |
| Text color | `rgb(255, 255, 255)` |
| Border radius | `10px` |
| Font size | `16px` |

### Section Spacing

| Section | Padding top | Padding bottom |
|---|---|---|
| Hero section | `128px` | `96px` |
| Content sections (standard) | `112px` | `112px` or `160px` |

### Corner Radii

| Element | Radius |
|---|---|
| All buttons and CTAs | `10px` |
| Circular icon buttons | `9999px` (full pill) |
| Small interactive links | `4px` |
| Cards (implied from class usage) | `10px` consistent |

---

## 2. Direction for ListingRoom

### Token Mapping

| Tailwind token | Value to use | Source / reasoning |
|---|---|---|
| `ink` | `#0A0A0A` | Adopt Photoroom's near-black. Use `#0A0A0A` instead of pure `#000000` for softer digital feel. |
| `muted` | `#6B6B6B` | Direct lift from Photoroom's `rgb(107,107,107)`. |
| `surface` | `#F5F5F7` | Neutral light gray. (Was `#F5F3FF` lavender; changed 2026-06-12 to kill the lilac cast and read more premium.) |
| `accent` | `#492FFB` | Direct lift from Photoroom's brand blue `rgb(73,47,251)`. This is the clearest brand signal and works as the primary action color. |
| `accent-hover` | `#544FFF` | Photoroom's actual hover blue (slightly lighter than base). (Was `accent-dark: #3520C8`; changed 2026-06-12 to match Photoroom's real hover behavior.) |

### Where We Deliberately Diverge

- **Surface**: Photoroom alternates white / pure black sections for drama. ListingRoom stays lighter throughout (it is a utility tool, not a visual brand). Use `#F5F3FF` as the base surface instead of high-contrast black slabs.
- **Font weight**: Photoroom uses `400` on CTAs (surprisingly light, custom font compensates). We should use `500` on CTAs and `600` on headings since our Google Font substitute has less optical weight than "TT Photoroom".
- **Section padding**: Photoroom's `112–160px` vertical rhythm is appropriate for a marketing homepage. ListingRoom is a single-page app tool; use `48–80px` section rhythm instead.
- **Announcement bar**: Skip the full-bleed purple bar. Reserve `accent` for the single primary action only.

### Recommended Google Font

**Inter** (weight range 400–700, variable font available).

Reasoning: "TT Photoroom" is a proprietary geometric sans-serif by TypeType foundry. It has:
- tight negative letter-spacing at large sizes
- medium-contrast strokes
- clean, slightly geometric lowercase
- weight range that renders well at 400–600

Inter matches all of these characteristics. Its optical sizing at 16px body and 48–72px hero is nearly identical to TT Photoroom's rhythm. Alternatives considered: Plus Jakarta Sans (slightly more humanist, less neutral) and DM Sans (too round). Inter at `font-feature-settings: "cv11"` (open lowercase 'a') is the closest match on Google Fonts.

---

## 3. Vibe Summary

**Adjectives:** Clean, confident, generous, high-contrast, photo-forward.

**UI mannerisms worth echoing:**

1. **Pill-adjacent buttons with generous horizontal padding.** The hero CTA has `64px` left/right padding and `56px` height — it breathes. Radius is `10px` (not fully pill, just rounded-lg). This gives weight without aggression. Use the same pattern for ListingRoom's primary "Generate listing" button.

2. **Gradient hero.** Photoroom opens on `linear-gradient(to bottom-right, #EEE5F6, #FFFFFF, #F0E9F8)` (lavender). ListingRoom initially copied it but the lilac cast read as "AI app template"; changed 2026-06-12 to a faint blue-tinted gradient (`#EEF1FF → #FFFFFF → #F0F3FF`) aligned with the `#492FFB` accent family.

3. **Pure black text on white, no gray-on-gray softness.** Headings are `#000000`. Photoroom commits to maximum legibility contrast. Muted text (`#6B6B6B`) is only used for sub-labels and supporting copy, never for primary content. Mirror this hierarchy strictly.

---

## 4. Raw Measurements Reference

```
Body font stack:  "TT Photoroom", system-ui, ...sans-serif
Body color:       rgb(0,0,0)
Body bg:          transparent (page bg is white or gradient section)

H1:               72px / weight 600 / tracking -1.41px / lh 79.2px / color #000
H2 large:         42px / weight 500 / tracking -0.36px / lh 46.2px / color #000
H2 muted lead:    20px / weight 500 / lh 30px / color #6B6B6B
Body copy:        14–17px / weight 500 / lh 1.5× / color #6B6B6B or #404147

Primary CTA bg:   rgb(73,47,251)  = #492FFB
Nav CTA bg:       rgb(26,26,26)   = #1A1A1A
Announcement bar: rgb(73,47,251)  = #492FFB
Hero gradient:    #EEE5F6 → #FFFFFF → #F0E9F8
Section dark:     #000000
Section neutral:  #474747

Button radius:    10px (all interactive elements)
Section padding:  112–160px vertical
```
