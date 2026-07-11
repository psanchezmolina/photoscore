# PhotoScore: Copy Review

**Reviewer:** Copy audit against buyer research
**Source of truth:** `knowledge/photoroom-b2b-acquisition-research.md` (Photoroom B2B / SMB seller buyer intelligence)
**Scope:** All user-facing copy in the PhotoScore app plus the two LLM prompts that generate the dynamic grading text.
**Status:** Recommendations only. No code changed.

---

## Files reviewed

| File | Copy it holds |
|------|---------------|
| `src/app/page.tsx` | Hero headline, subhead, input placeholder, CTA button, error text, trust line, byline |
| `src/app/layout.tsx` | `<title>` and meta description (SEO / social share) |
| `src/components/AnnouncementBar.tsx` | Top strip |
| `src/components/AuditLoading.tsx` | Loading status reel |
| `src/components/GradeResult.tsx` | Grade view, benchmark line, "Top 3 fixes", CTA + microcopy |
| `src/components/ProductCard.tsx` | Per-product grade + "Costing you the most clicks" badge |
| `src/components/EmailGate.tsx` | Email capture headline, sub, confirmation |
| `src/components/SiteFooter.tsx` | Attribution + referral disclosure |
| `src/lib/claude.ts` | `SCORE_SYSTEM_PROMPT` (grading tone) + listing-kit prompt |
| `src/lib/score.ts` | JSON schema descriptions that steer the model's wording |

---

## Overall verdict

The copy is **strategically well-aligned** with the research and refreshingly free of the tired "AI-powered / stunning visuals" language the research warns against (Part 5: the market is sophistication-jaded on generic AI claims). It leads with the job, quantifies time, and disarms the subscription-trap objection up front.

The biggest misses are **emotional altitude** (the #1 pain, intensity 10, barely surfaces) and a few **unused high-leverage frames** the research hands over directly: the $200 photographer anchor, borrowed marketplace proof, and the word "legit."

---

## What's working (keep it)

- **Job-led, not AI-led.** "Your product photos, graded in 60 seconds. Free." leads with the outcome, never "AI." Exactly what the research prescribes for a market jaded on generic AI claims (Part 5, insight #4).
- **Friction and trust killers are excellent.** "Free. No signup. ~60 seconds." plus EmailGate's "One email, no spam. No account needed." directly disarm the #1 objection (subscription trap) before it's raised.
- **The "Costing you the most clicks" badge** on the worst product is the single strongest line in the app. It converts pain #6 (fear that bad photos silently lose sales) into a visible, specific stakes moment. The loading line "Spotting the shots costing you clicks…" reinforces it.
- **Consistency is handled correctly.** `SCORE_SYSTEM_PROMPT` weighs catalog consistency heavily and caps mismatched catalogs at B; the loading reel narrates it ("Scoring consistency across your catalog…"). That is pain #5, well served.
- **Both LLM prompts enforce the language guide.** "No hype clichés," "honest but never insulting," "concrete and specific, not generic." This bakes the research's Part 5/6 guidance into the engine, so the dynamic copy inherits the right voice.
- **Targeting hits the highest-value segment.** Shopify DTC, which the research names as highest-intent / highest-ARPU (insight #5).
- **Footer transparency** ("Not affiliated with Photoroom. I'm part of the referral program") answers the trust-debt theme honestly (insight #2, the 1.3 Trustpilot problem).
- **Clean of em dashes throughout**, consistent with house style; both prompts enforce it too.

---

## Gaps and fixes, prioritized

### 1. The hero is emotionally flat vs. the #1 pain (intensity 10: embarrassment / "looks amateur")

"Your product photos, graded in 60 seconds. Free." is functional but says nothing about *stakes*. The research's sharpest hooks are consequence-driven (Part 2, Part 9).

- **Current:** "Your product photos, graded in 60 seconds. Free."
- **Option A (stakes):** "Are your product photos costing you sales? Get them graded in 60 seconds. Free."
- **Option B ("legit", a research USE word):** "Find out if your product photos look pro, or amateur. Graded in 60 seconds."

Keep the headline "What's your store's Photo Score?" as is: the curiosity hook is good.

### 2. The $200 photographer anchor is completely unused

The research's strongest cost frame ("one shoot vs a year of Photoroom," Parts 3, 8, 9) appears nowhere. Natural home is the CTA microcopy in `GradeResult.tsx`.

- **Current:** "Opens Photoroom in a new tab. Batch-edit your product photos in minutes."
- **Sharper:** "A photographer shoot runs $200+. Batch-edit your whole catalog to studio-quality in minutes with Photoroom."

Adds "studio-quality," "whole catalog," and implies "no photographer": three research USE words.

### 3. Borrow Photoroom's marketplace proof at the CTA

PhotoScore is new and has no social proof of its own, but the research says marketplace names (Mercari / Depop / eBay) are top trust triggers (Part 5, Part 9). Add one line near "Fix it with Photoroom":

> "Photoroom is used by sellers on Mercari, Depop and eBay."

Cheap credibility transfer that costs nothing to earn.

### 4. The AnnouncementBar is a wasted slot

It currently just repeats "PhotoScore." That top strip is prime real estate. Put the promise there:

> "Free product-photo grade for Shopify stores. No signup."

### 5. "Built by Pablo Sanchez in one afternoon" cuts against the grade's credibility

For a *real seller* audience, "in one afternoon" can read as "toy, don't trust the score." It is charming for the Photoroom growth reviewers (likely the real audience for this build), so this is a judgment call. If any real sellers hit the page, consider moving the "one afternoon" flourish to the footer and keeping the hero clean. Flagging the tension, not insisting.

### 6. Name "Shopify" in the hero to pre-qualify

The tool is Shopify-only (non-Shopify URLs error out via `not_shopify`), but the hero placeholder is a generic "yourstore.com." Naming Shopify in the subhead qualifies the right buyer and prevents dead-end submissions from Etsy / Amazon sellers. Trade-off: slightly narrower top of funnel, but the research says Shopify DTC is exactly the target (insight #5). The `<title>` already says Shopify, so this just aligns the on-page copy with it.

---

## Minor notes

- **"Fix it with Photoroom"** is good, but "Fix it" is slightly generic. "Fix **these** with Photoroom" (plural, referring to the specific fixes just shown) ties the CTA to the report on screen.
- **EmailGate headline** "Get the full per-product report + the fixes as a checklist" is strong and specific. No change needed.
- **"Looks fake / AI slop" objection** is not handled, but since PhotoScore only *grades* (it does not generate images), that objection is largely out of scope. Fine to skip.
- **Compliance wedge** (Amazon white-background, the research's highest-urgency trigger) is absent, but that is a deliberate consequence of scoping to Shopify. Defensible. If the tool ever broadens to marketplaces, revisit.
- **Meta description** (`layout.tsx`) is strong: "See your top fixes, per-product scores, and the shots costing you clicks. Free, no signup." It already carries the best stakes line. Consider echoing "the shots costing you clicks" into the hero subhead, since it tests well enough to headline the SEO snippet.

---

## Language check against the research guide (Part 6)

**USE words** ("studio-quality," "in seconds," "no photographer," "marketplace-ready," "looks legit," "professional," "batch your whole catalog," "no design skills," "one-click cancel"):

- Present today: "in seconds" / "60 seconds," "batch-edit," "in minutes."
- Missing but easy to add via fixes 1-2: "studio-quality," "no photographer," "looks legit / look pro," "whole catalog."

**AVOID words** ("AI-powered" as lead, "stunning visuals," "revolutionary," "magic," "flawless," "perfect," hidden-charge subscription language):

- None present. The copy is clean. Keep it that way.

---

## Suggested change set (when ready to implement)

All low-risk, high-confidence. Grouped by file:

- `src/app/page.tsx`: subhead (fix 1), optional Shopify qualifier (fix 6).
- `src/components/GradeResult.tsx`: CTA microcopy with $200 anchor + studio-quality (fix 2), marketplace-proof line (fix 3), "Fix these" (minor note).
- `src/components/AnnouncementBar.tsx`: promise strip (fix 4).
- `src/app/page.tsx` byline: optional relocation (fix 5).

Fixes 1-4 are the priority: highest impact, smallest surface area.
