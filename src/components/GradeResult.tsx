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
}

export default function GradeResult({ result }: GradeResultProps) {
  const { store, score } = result;
  const theme = gradeTheme(score.grade);

  function handleReferralClick() {
    trackEvent("referral_click");
  }

  // The Photoroom pitch only appears once the visitor has left their email.
  const [emailSent, setEmailSent] = useState(false);

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
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:py-14">
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
        {/* Left column: score identity */}
        <div className="flex flex-col items-center text-center md:sticky md:top-10 md:w-60 md:flex-none md:items-start md:text-left">
          <p className="text-sm font-medium text-muted">
            Photo Score for{" "}
            <span className="font-semibold text-ink">
              {store.name || store.domain}
            </span>
          </p>

          <div className="mt-5 flex flex-col items-center md:items-start">
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
        </div>

        {/* Right column: everything else */}
        <div className="min-w-0 flex-1">
          {/* Summary */}
          <p className="text-balance text-lg leading-relaxed text-ink">
            {score.summary}
          </p>

          {/* Benchmark */}
          <p className="mt-4 text-balance text-sm leading-relaxed text-muted">
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
                    <span className="text-sm leading-relaxed text-ink">
                      {fix}
                    </span>
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
              onSent={() => setEmailSent(true)}
            />
          </div>

          {/* Primary CTA: only after the email is captured */}
          {emailSent && (
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
                A photographer shoot runs $200+. Batch-edit your whole catalog to
                studio-quality in minutes with Photoroom.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
