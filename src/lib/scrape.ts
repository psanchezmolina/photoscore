import * as cheerio from "cheerio";
import { lookup } from "node:dns/promises";
import net from "node:net";

export type ScrapeErrorCode =
  | "invalid_url"
  | "blocked"
  | "no_product"
  | "image_failed";

export class ScrapeError extends Error {
  constructor(public code: ScrapeErrorCode) {
    super(code);
    this.name = "ScrapeError";
  }
}

export interface ScrapedProduct {
  title?: string;
  description?: string;
  brand?: string;
  siteName?: string;
  imageUrl: string;
  sourceUrl: string;
}

export function isPrivateIp(ip: string): boolean {
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) {
    return true;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/** Throws ScrapeError("invalid_url") for non-http(s) or private/internal targets. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ScrapeError("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ScrapeError("invalid_url");
  }
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new ScrapeError("invalid_url");
  }
  if (net.isIP(host) && isPrivateIp(host)) {
    throw new ScrapeError("invalid_url");
  }
  if (!net.isIP(host)) {
    try {
      const { address } = await lookup(host);
      if (isPrivateIp(address)) throw new ScrapeError("invalid_url");
    } catch (err) {
      if (err instanceof ScrapeError) throw err;
      throw new ScrapeError("invalid_url"); // DNS failure
    }
  }
  return url;
}

export function shopifyJsonUrl(url: URL): string | null {
  const match = url.pathname.match(/^(.*\/products\/[^/]+?)\/?$/);
  if (!match) return null;
  return `${url.origin}${match[1]}.json`;
}

export function mapShopifyProduct(
  json: unknown,
  sourceUrl: string,
): ScrapedProduct | null {
  const product = (json as { product?: Record<string, unknown> })?.product;
  if (!product) return null;
  const images = product.images as Array<{ src?: string }> | undefined;
  const imageUrl = images?.[0]?.src;
  if (!imageUrl) return null;
  const bodyHtml = typeof product.body_html === "string" ? product.body_html : "";
  const description = cheerio.load(bodyHtml).text().trim() || undefined;
  const vendor = typeof product.vendor === "string" ? product.vendor.trim() : "";
  return {
    title: typeof product.title === "string" ? product.title : undefined,
    description,
    brand: vendor || undefined,
    imageUrl,
    sourceUrl,
  };
}

/** Pulls the brand name out of JSON-LD Product schema blocks, if present. */
function extractJsonLdBrand($: cheerio.CheerioAPI): string | undefined {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let data: unknown;
    try {
      data = JSON.parse($(el).text());
    } catch {
      continue;
    }
    const graph = (data as { "@graph"?: unknown[] } | null)?.["@graph"];
    const nodes: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray(graph)
        ? graph
        : [data];
    for (const node of nodes) {
      if (typeof node !== "object" || node === null) continue;
      const n = node as Record<string, unknown>;
      const type = n["@type"];
      const isProduct =
        type === "Product" || (Array.isArray(type) && type.includes("Product"));
      if (!isProduct) continue;
      const brand = n.brand;
      if (typeof brand === "string" && brand.trim()) return brand.trim();
      if (typeof brand === "object" && brand !== null) {
        const name = (brand as Record<string, unknown>).name;
        if (typeof name === "string" && name.trim()) return name.trim();
      }
    }
  }
  return undefined;
}

export function extractOg(html: string, sourceUrl: string): ScrapedProduct | null {
  const $ = cheerio.load(html);
  const meta = (key: string) =>
    $(`meta[property="${key}"]`).attr("content") ??
    $(`meta[name="${key}"]`).attr("content");
  const imageUrl = meta("og:image") ?? meta("twitter:image");
  if (!imageUrl) return null;
  return {
    title: meta("og:title") ?? ($("title").text().trim() || undefined),
    description: meta("og:description") ?? meta("description"),
    brand: extractJsonLdBrand($),
    siteName: meta("og:site_name"),
    imageUrl,
    sourceUrl,
  };
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
};

const MAX_HTML_BYTES = 5 * 1024 * 1024;

export async function readBodyWithLimit(
  res: Response,
  maxBytes: number = MAX_HTML_BYTES,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new ScrapeError("blocked");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new ScrapeError("blocked");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}

export async function safeFetch(
  rawUrl: string,
  timeoutMs = 8000,
  maxRedirects = 5,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let currentUrl = rawUrl;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      await assertPublicUrl(currentUrl);
      const res = await fetch(currentUrl, {
        headers: BROWSER_HEADERS,
        signal: controller.signal,
        redirect: "manual",
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new ScrapeError("blocked");
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      return res;
    }
    throw new ScrapeError("blocked");
  } finally {
    clearTimeout(timer);
  }
}

/** Main entry: Shopify .json first, OG tags as fallback. */
export async function scrapeProduct(rawUrl: string): Promise<ScrapedProduct> {
  const url = await assertPublicUrl(rawUrl);

  const jsonUrl = shopifyJsonUrl(url);
  if (jsonUrl) {
    try {
      const res = await safeFetch(jsonUrl);
      if (res.ok && (res.headers.get("content-type") ?? "").includes("json")) {
        const mapped = mapShopifyProduct(await res.json(), url.toString());
        if (mapped) return mapped;
      }
    } catch {
      // fall through to OG scraping
    }
  }

  let res: Response;
  try {
    res = await safeFetch(url.toString());
  } catch {
    throw new ScrapeError("blocked");
  }
  if (!res.ok) throw new ScrapeError("blocked");

  const product = extractOg(await readBodyWithLimit(res), url.toString());
  if (!product) throw new ScrapeError("no_product");
  return product;
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function downloadImageAsBase64(
  imageUrl: string,
): Promise<{ base64: string; mediaType: string }> {
  try {
    await assertPublicUrl(imageUrl);
  } catch {
    throw new ScrapeError("image_failed");
  }
  let res: Response;
  try {
    res = await safeFetch(imageUrl);
  } catch {
    throw new ScrapeError("image_failed");
  }
  if (!res.ok) throw new ScrapeError("image_failed");
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const mediaType = ALLOWED_IMAGE_TYPES[contentType];
  if (!mediaType) throw new ScrapeError("image_failed");
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new ScrapeError("image_failed");
  return { base64: buffer.toString("base64"), mediaType };
}
