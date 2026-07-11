"use client";

interface ContextInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ContextInput({ value, onChange }: ContextInputProps) {
  return (
    <input
      type="text"
      value={value}
      maxLength={500}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Add context: brand, audience, platform… (optional)"
      className="w-full rounded-btn border border-ink/10 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted transition-colors focus:border-sky-border focus:outline-none focus:ring-2 focus:ring-sky-border/30"
    />
  );
}
