"use client";

export type InputMode = "photo" | "url";

interface ModeToggleProps {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

const OPTIONS: { value: InputMode; label: string }[] = [
  { value: "photo", label: "Upload photo" },
  { value: "url", label: "Paste URL" },
];

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Choose input method"
      className="inline-flex w-full max-w-xs items-center gap-1 rounded-btn bg-surface p-1"
    >
      {OPTIONS.map((option) => {
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={[
              "flex-1 rounded-[7px] px-4 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-white text-ink shadow-sm"
                : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
