"use client";

import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  "Reading your product photo…",
  "Identifying what makes it sell…",
  "Writing your SEO title…",
  "Drafting the description…",
  "Polishing your ad copy…",
  "Picking the right keywords…",
];

const INTERVAL_MS = 3500;

export default function LoadingState() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl py-10">
      <div className="flex items-center justify-center gap-3">
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
          aria-hidden="true"
        />
        <p
          aria-live="polite"
          className="text-lg font-medium text-ink"
        >
          {STATUS_MESSAGES[index]}
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        This usually takes 15–30 seconds.
      </p>
    </div>
  );
}
