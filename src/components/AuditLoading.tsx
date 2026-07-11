"use client";

import { useEffect, useState } from "react";

// Fake-timed status lines. Real audit takes 30-70s, so we keep the reel
// engaging without promising exact progress.
const STATUS_MESSAGES = [
  "Finding your store…",
  "Pulling your catalog…",
  "Opening your product photos…",
  "Grading photo 1 of 6…",
  "Grading photo 3 of 6…",
  "Checking backgrounds and lighting…",
  "Scoring consistency across your catalog…",
  "Spotting the shots costing you clicks…",
  "Tallying your Photo Score…",
];

const INTERVAL_MS = 4500;

export default function AuditLoading() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      // Hold on the last line instead of looping back to the start.
      setIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto w-full max-w-md px-5 py-10 text-center">
      <div className="flex flex-col items-center gap-5">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
          aria-hidden="true"
        />
        <p
          aria-live="polite"
          className="min-h-[28px] text-lg font-medium text-ink"
        >
          {STATUS_MESSAGES[index]}
        </p>
      </div>

      <p className="mt-6 text-sm text-muted">
        This usually takes about a minute. Hang tight, we only do this once.
      </p>
    </div>
  );
}
