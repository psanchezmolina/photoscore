import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  generateKit,
  GenerationRefusedError,
  ALLOWED_MEDIA_TYPES,
  type AllowedMediaType,
} from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  scrapeProduct,
  downloadImageAsBase64,
  ScrapeError,
} from "@/lib/scrape";
import { isValidBase64 } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

// ~5MB of binary ≈ 6.8M base64 chars
const MAX_BASE64_LENGTH = 7_000_000;
const MAX_CONTEXT_LENGTH = 500;

const SCRAPE_MESSAGES: Record<string, string> = {
  invalid_url: "That doesn't look like a public product page URL.",
  blocked:
    "This store blocks automated access (Amazon and Etsy do this), and covering them is out of scope for this demo. Upload a photo instead, it works just as well.",
  no_product:
    "We couldn't read that page. Big marketplaces like Amazon and Etsy block automated access, and covering them is out of scope for this demo. Upload a photo instead, it works just as well.",
  image_failed:
    "We couldn't fetch the product image from that page. Upload a photo instead, it works just as well.",
};

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: code, message }, { status });
}

function mapGenerationError(err: unknown) {
  if (err instanceof GenerationRefusedError) {
    return jsonError(
      422,
      "generation_refused",
      "We couldn't generate copy for this image. Try a different product photo.",
    );
  }
  if (err instanceof Anthropic.RateLimitError) {
    return jsonError(
      429,
      "upstream_busy",
      "We're handling a lot of requests right now. Try again in a minute.",
    );
  }
  if (err instanceof Anthropic.APIError) {
    console.error("Anthropic API error", err.status, err.message);
    return jsonError(
      502,
      "upstream_error",
      "The AI service had a hiccup. Please try again.",
    );
  }
  console.error("generate failed", err);
  return jsonError(
    500,
    "internal_error",
    "Something went wrong on our side. Please try again.",
  );
}

export async function POST(req: Request) {
  // Trusts x-forwarded-for: this app runs behind Easypanel's reverse proxy,
  // which sets/overwrites the header. Do not expose the container directly.
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown")
    .split(",")[0]
    .trim();
  if (!checkRateLimit(ip)) {
    return jsonError(
      429,
      "rate_limited",
      "You've reached the hourly limit. Come back in a little while.",
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_request", "Request body must be JSON.");
  }

  const extraContext =
    typeof body.extraContext === "string"
      ? body.extraContext.slice(0, MAX_CONTEXT_LENGTH)
      : undefined;

  // ---- URL mode ----
  if (typeof body.url === "string" && body.url.trim() !== "") {
    try {
      const product = await scrapeProduct(body.url.trim());
      const img = await downloadImageAsBase64(product.imageUrl);
      const kit = await generateKit({
        imageBase64: img.base64,
        mediaType: img.mediaType as AllowedMediaType,
        extraContext,
        scraped: {
          title: product.title,
          description: product.description,
          brand: product.brand,
          siteName: product.siteName,
          url: product.sourceUrl,
        },
      });
      return NextResponse.json({
        kit,
        image: `data:${img.mediaType};base64,${img.base64}`,
      });
    } catch (err) {
      if (err instanceof ScrapeError) {
        return jsonError(422, `scrape_${err.code}`, SCRAPE_MESSAGES[err.code]);
      }
      return mapGenerationError(err);
    }
  }

  // ---- Photo mode ----
  const { imageBase64, mediaType } = body;
  if (
    typeof imageBase64 !== "string" ||
    imageBase64.length === 0 ||
    typeof mediaType !== "string" ||
    !(ALLOWED_MEDIA_TYPES as readonly string[]).includes(mediaType)
  ) {
    return jsonError(
      400,
      "invalid_image",
      "Please upload a JPEG, PNG, WebP or GIF image.",
    );
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return jsonError(413, "image_too_large", "Images must be under 5MB.");
  }
  if (!isValidBase64(imageBase64)) {
    return jsonError(400, "invalid_image", "Please upload a JPEG, PNG, WebP or GIF image.");
  }

  try {
    const kit = await generateKit({
      imageBase64,
      mediaType: mediaType as AllowedMediaType,
      extraContext,
    });
    return NextResponse.json({ kit });
  } catch (err) {
    return mapGenerationError(err);
  }
}
