"use client";

import { useCallback, useRef, useState } from "react";

interface KitBlockProps {
  label: string;
  copyText: string;
  children: React.ReactNode;
}

export default function KitBlock({ label, copyText, children }: KitBlockProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; silently ignore.
    }
  }, [copyText]);

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 transition-shadow hover:shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </h3>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label}`}
          className={[
            "inline-flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium transition-colors",
            copied
              ? "bg-accent/10 text-accent"
              : "bg-surface text-ink hover:bg-accent/10 hover:text-accent",
          ].join(" ")}
        >
          {copied ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <div className="text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}
