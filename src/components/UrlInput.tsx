"use client";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function UrlInput({ value, onChange }: UrlInputProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-ink/15 bg-white px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-ink">
          Paste your product page URL
        </h3>
        <p className="text-sm text-muted">
          Works great with Shopify and most independent stores
        </p>
      </div>
      <input
        type="url"
        inputMode="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://yourstore.com/products/…"
        className="w-full max-w-md rounded-btn border border-ink/10 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted transition-colors focus:border-sky-border focus:outline-none focus:ring-2 focus:ring-sky-border/30"
      />
    </div>
  );
}
