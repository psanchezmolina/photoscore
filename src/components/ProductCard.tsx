"use client";

import { useState } from "react";
import { gradeTheme, type ProductScore } from "./audit";

interface ProductCardProps {
  product: ProductScore;
  isWorst?: boolean;
}

export default function ProductCard({ product, isWorst }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const theme = gradeTheme(product.grade);
  const topIssue = product.issues[0];

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm"
      style={{ borderColor: isWorst ? theme.border : "rgba(10,10,10,0.10)" }}
    >
      <div className="relative aspect-square w-full bg-surface">
        {isWorst && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            Costing you the most clicks
          </span>
        )}
        <span
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-sm"
          style={{ backgroundColor: theme.bg, color: theme.text }}
          aria-label={`Grade ${product.grade.toUpperCase()}`}
        >
          {product.grade.toUpperCase()}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3
          className="truncate text-sm font-semibold text-ink"
          title={product.title}
        >
          {product.title}
        </h3>
        {topIssue ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {topIssue}
          </p>
        ) : product.strengths[0] ? (
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            {product.strengths[0]}
          </p>
        ) : null}
      </div>
    </div>
  );
}
