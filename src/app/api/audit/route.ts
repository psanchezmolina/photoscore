import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateScore,
  GenerationRefusedError,
  type AllowedMediaType,
  type ScoreImageInput,
} from "@/lib/claude";
import { fetchCatalog, CatalogError } from "@/lib/catalog";
import { downloadImageAsBase64 } from "@/lib/scrape";
import { checkRateLimit } from "@/lib/rate-limit";
import { appendLog } from "@/lib/store-log";

export const runtime = "nodejs";
export const maxDuration = 120;

const CATALOG_MESSAGES: Record<string, string> = {
  invalid_url: "That doesn't look like a public store URL. Try the store root, like https://yourstore.com",
  not_shopify:
    "We couldn't read that store's catalog. PhotoScore works with Shopify stores whose catalog is public (most are). Check the URL is the store root, like https://yourstore.com",
  empty_catalog: "That store's catalog looks empty, so there is nothing to grade yet.",
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(req: Request) {
  // Trusts x-forwarded-for: runs behind Easypanel's reverse proxy.
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  const internalKey = process.env.INTERNAL_KEY;
  const isInternal =
    !!internalKey && req.headers.get("x-ps-key") === internalKey;
  if (!isInternal && !checkRateLimit(ip)) {
    return jsonError(
      429,
      "rate_limited",
      "You've reached the hourly limit. Come back in a little while.",
    );
  }

  let body: { storeUrl?: unknown; utm?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "Request body must be JSON.");
  }
  if (typeof body.storeUrl !== "string" || body.storeUrl.trim() === "") {
    return jsonError(400, "invalid_request", "Send your store URL.");
  }
  const utm = typeof body.utm === "string" ? body.utm.slice(0, 300) : null;

  try {
    const catalog = await fetchCatalog(body.storeUrl);

    const downloads = await Promise.allSettled(
      catalog.products.map((p) => downloadImageAsBase64(p.imageUrl)),
    );
    const images: ScoreImageInput[] = [];
    const graded: typeof catalog.products = [];
    downloads.forEach((d, i) => {
      if (d.status === "fulfilled") {
        images.push({
          base64: d.value.base64,
          mediaType: d.value.mediaType as AllowedMediaType,
          title: catalog.products[i].title,
        });
        graded.push(catalog.products[i]);
      }
    });
    if (images.length === 0) {
      return jsonError(
        422,
        "images_failed",
        "We couldn't download this store's product images. Try again in a minute.",
      );
    }

    const score = await generateScore(images, {
      domain: catalog.domain,
      totalProducts: catalog.totalProducts,
    });

    const auditId = randomUUID();
    const payload = {
      auditId,
      store: { name: catalog.storeName, domain: catalog.domain },
      score: {
        grade: score.grade,
        score: score.score,
        summary: score.summary,
        topFixes: score.topFixes,
        worstIndex: score.worstIndex,
        products: score.products.map((p) => ({
          title: graded[p.index]?.title ?? "",
          imageUrl: graded[p.index]?.imageUrl ?? "",
          grade: p.grade,
          issues: p.issues,
          strengths: p.strengths,
        })),
      },
    };
    // Full payload persisted so /r/<auditId> can serve a shareable report.
    await appendLog("audits", {
      auditId,
      domain: catalog.domain,
      grade: score.grade,
      score: score.score,
      productCount: images.length,
      utm,
      internal: isInternal,
      result: payload,
    });

    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof CatalogError) {
      return jsonError(422, err.code, CATALOG_MESSAGES[err.code]);
    }
    if (err instanceof GenerationRefusedError) {
      return jsonError(422, "generation_refused", "We couldn't grade these images.");
    }
    if (err instanceof Anthropic.RateLimitError) {
      return jsonError(429, "upstream_busy", "We're busy right now. Try again in a minute.");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return jsonError(502, "upstream_error", "The grading service had a hiccup. Please try again.");
    }
    console.error("audit failed", err);
    return jsonError(500, "internal_error", "Something went wrong on our side. Please try again.");
  }
}
