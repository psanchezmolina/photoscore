import { assertPublicUrl, safeFetch, ScrapeError } from "./scrape";

export type CatalogErrorCode = "invalid_url" | "not_shopify" | "empty_catalog";

export class CatalogError extends Error {
  constructor(public code: CatalogErrorCode) {
    super(code);
    this.name = "CatalogError";
  }
}

export interface CatalogProduct {
  title: string;
  handle: string;
  imageUrl: string;
  productType?: string;
}

export interface StoreCatalog {
  domain: string;
  storeName: string;
  totalProducts: number;
  products: CatalogProduct[];
}

/** How many products we grade per audit. One Claude call, one image each. */
export const AUDIT_PRODUCT_COUNT = 6;

/** Normalizes user input like "mystore.com" into a root origin URL. */
export function normalizeStoreUrl(raw: string): string {
  let input = raw.trim();
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new CatalogError("invalid_url");
  }
  return url.origin;
}

/** Shopify CDN supports width params; keeps vision payloads small. */
export function sizedImageUrl(src: string, width = 800): string {
  try {
    const url = new URL(src);
    url.searchParams.set("width", String(width));
    return url.toString();
  } catch {
    return src;
  }
}

interface ShopifyProductJson {
  title?: string;
  handle?: string;
  product_type?: string;
  images?: Array<{ src?: string }>;
}

/**
 * Fetches a store's public catalog via /products.json.
 * Picks up to AUDIT_PRODUCT_COUNT products that have images, spread across
 * the catalog (not just the first N) so the sample represents the store.
 */
export async function fetchCatalog(rawUrl: string): Promise<StoreCatalog> {
  const origin = normalizeStoreUrl(rawUrl);
  try {
    await assertPublicUrl(origin);
  } catch {
    throw new CatalogError("invalid_url");
  }

  let res: Response;
  try {
    res = await safeFetch(`${origin}/products.json?limit=50`, 10000);
  } catch (err) {
    if (err instanceof ScrapeError && err.code === "invalid_url") {
      throw new CatalogError("invalid_url");
    }
    throw new CatalogError("not_shopify");
  }
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) {
    throw new CatalogError("not_shopify");
  }

  let json: { products?: ShopifyProductJson[] };
  try {
    json = (await res.json()) as { products?: ShopifyProductJson[] };
  } catch {
    throw new CatalogError("not_shopify");
  }
  const all = (json.products ?? []).filter(
    (p): p is ShopifyProductJson & { title: string; handle: string } =>
      typeof p.title === "string" &&
      typeof p.handle === "string" &&
      Array.isArray(p.images) &&
      typeof p.images[0]?.src === "string",
  );
  if (all.length === 0) throw new CatalogError("empty_catalog");

  // Spread the sample across the catalog: first, last, and evenly between.
  const picked: typeof all = [];
  const step = Math.max(1, Math.floor(all.length / AUDIT_PRODUCT_COUNT));
  for (let i = 0; i < all.length && picked.length < AUDIT_PRODUCT_COUNT; i += step) {
    picked.push(all[i]);
  }

  const domain = new URL(origin).hostname;
  return {
    domain,
    storeName: domain.replace(/^www\./, "").split(".")[0],
    totalProducts: all.length,
    products: picked.map((p) => ({
      title: p.title,
      handle: p.handle,
      productType: p.product_type || undefined,
      imageUrl: sizedImageUrl(p.images![0]!.src!),
    })),
  };
}
