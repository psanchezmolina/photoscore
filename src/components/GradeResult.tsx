"use client";

import { useEffect, useState } from "react";
import { gradeTheme, type AuditResult } from "./audit";
import { getUtm, trackEvent } from "./analytics";
import ProductCard from "./ProductCard";
import EmailGate from "./EmailGate";

const BENCHMARK =
  "Shopify's own research: high quality product images are one of the top factors in whether a visitor trusts a store enough to buy.";

const PHOTOROOM_URL =
  process.env.NEXT_PUBLIC_PHOTOROOM_URL || "https://www.photoroom.com";

interface GradeResultProps {
  result: AuditResult;
  onReset: () => void;
}

export default function GradeResult({ result, onReset }: GradeResultProps) {
  const { store, score } = result;
  const theme = gradeTheme(score.grade);

  function handleReferralClick() {
    trackEvent("referral_click");
  }

  // Set after mount: getUtm() reads sessionStorage, which the server can't
  // see, so putting it in the initial render causes a hydration mismatch.
  const [referralHref, setReferralHref] = useState(PHOTOROOM_URL);
  useEffect(() => {
    const utm = getUtm();
    if (!utm) return;
    const sep = PHOTOROOM_URL.includes("?") ? "&" : "?";
    setReferralHref(`${PHOTOROOM_URL}${sep}${utm}`);
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      {/* Store name */}
      <p className="text-center text-sm font-medium text-muted">
        Photo Score for{" "}
        <span className="font-semibold text-ink">
          {store.name || store.domain}
        </span>
      </p>

      {/* Big grade */}
      <div className="mt-5 flex flex-col items-center">
        <div
          className="flex h-32 w-32 items-center justify-center rounded-3xl border sm:h-40 sm:w-40"
          style={{
            backgroundColor: theme.bg,
            borderColor: theme.border,
          }}
        >
          <span
            className="text-7xl font-semibold leading-none tracking-tight-hero sm:text-8xl"
            style={{ color: theme.text }}
          >
            {score.grade}
          </span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-ink">
            {score.score}
          </span>
          <span className="text-base text-muted">/ 100</span>
          <span
            className="ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: theme.bg, color: theme.text }}
          >
            {theme.label}
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="mx-auto mt-5 max-w-xl text-balance text-center text-lg leading-relaxed text-ink">
        {score.summary}
      </p>

      {/* Benchmark */}
      <p className="mx-auto mt-4 max-w-xl text-balance text-center text-sm leading-relaxed text-muted">
        {BENCHMARK}
      </p>

      {/* Top 3 fixes */}
      {score.topFixes.length > 0 && (
        <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-ink">Top 3 fixes</h2>
          <ol className="mt-3 space-y-3">
            {score.topFixes.slice(0, 3).map((fix, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-ink">{fix}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Product grid */}
      {score.products.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-ink">
            Your product photos, graded
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {score.products.map((product, i) => (
              <ProductCard
                key={i}
                product={product}
                isWorst={i === score.worstIndex}
              />
            ))}
          </div>
        </div>
      )}

      {/* Email gate */}
      <div className="mt-8">
        <EmailGate
          auditId={result.auditId}
          storeDomain={store.domain}
          grade={score.grade}
        />
      </div>

      {/* Primary CTA */}
      <div className="mt-8 text-center">
        <a
          href={referralHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleReferralClick}
          className="inline-flex w-full items-center justify-center rounded-btn bg-accent px-10 py-4 text-[15px] font-semibold uppercase tracking-[0.08em] text-white transition-colors hover:bg-accent-hover sm:w-auto"
        >
          Fix it with Photoroom
        </a>
        <p className="mt-3 text-xs text-muted">
          Opens Photoroom in a new tab. Batch-edit your product photos in
          minutes.
        </p>
      </div>

      {/* Reset */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-ink underline-offset-4 transition-colors hover:text-accent hover:underline"
        >
          Grade another store
        </button>
      </div>
    </div>
  );
}
