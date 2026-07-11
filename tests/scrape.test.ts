import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isPrivateIp,
  shopifyJsonUrl,
  mapShopifyProduct,
  extractOg,
  ScrapeError,
  safeFetch,
  readBodyWithLimit,
} from "@/lib/scrape";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue({ address: "93.184.216.34" }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isPrivateIp", () => {
  it("flags private and loopback ranges", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.1.1", "::1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });
  it("allows public IPs", () => {
    for (const ip of ["8.8.8.8", "172.32.0.1", "104.18.0.1"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });
});

describe("shopifyJsonUrl", () => {
  it("builds the .json URL for product pages", () => {
    expect(
      shopifyJsonUrl(new URL("https://shop.example.com/products/blue-mug?variant=1")),
    ).toBe("https://shop.example.com/products/blue-mug.json");
    expect(
      shopifyJsonUrl(new URL("https://shop.example.com/collections/all/products/blue-mug")),
    ).toBe("https://shop.example.com/collections/all/products/blue-mug.json");
  });
  it("returns null for non-product URLs", () => {
    expect(shopifyJsonUrl(new URL("https://shop.example.com/pages/about"))).toBeNull();
  });
});

describe("mapShopifyProduct", () => {
  it("maps the Shopify product JSON shape including the vendor as brand", () => {
    const out = mapShopifyProduct(
      {
        product: {
          title: "Blue Mug",
          body_html: "<p>A <strong>nice</strong> mug</p>",
          vendor: "Mug Co.",
          images: [{ src: "https://cdn.shopify.com/mug.jpg" }],
        },
      },
      "https://shop.example.com/products/blue-mug",
    );
    expect(out).toEqual({
      title: "Blue Mug",
      description: "A nice mug",
      brand: "Mug Co.",
      imageUrl: "https://cdn.shopify.com/mug.jpg",
      sourceUrl: "https://shop.example.com/products/blue-mug",
    });
  });
  it("leaves brand undefined without a vendor", () => {
    const out = mapShopifyProduct(
      {
        product: {
          title: "X",
          body_html: "",
          images: [{ src: "https://cdn.shopify.com/x.jpg" }],
        },
      },
      "u",
    );
    expect(out?.brand).toBeUndefined();
  });
  it("returns null when there is no image", () => {
    expect(
      mapShopifyProduct({ product: { title: "X", body_html: "", images: [] } }, "u"),
    ).toBeNull();
  });
});

describe("extractOg", () => {
  const html = `<html><head>
    <title>Fallback Title</title>
    <meta property="og:title" content="OG Mug" />
    <meta property="og:description" content="The best mug" />
    <meta property="og:image" content="https://cdn.example.com/og.jpg" />
    <meta property="og:site_name" content="Mug Store" />
  </head><body></body></html>`;

  it("extracts og tags including the site name", () => {
    expect(extractOg(html, "https://x.com/p")).toEqual({
      title: "OG Mug",
      description: "The best mug",
      siteName: "Mug Store",
      imageUrl: "https://cdn.example.com/og.jpg",
      sourceUrl: "https://x.com/p",
    });
  });

  it("extracts the brand from JSON-LD Product schema", () => {
    const ld = `<html><head>
      <meta property="og:image" content="https://cdn.example.com/og.jpg" />
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","name":"Mug","brand":{"@type":"Brand","name":"Mug Co."}}
      </script>
    </head></html>`;
    expect(extractOg(ld, "u")?.brand).toBe("Mug Co.");
  });

  it("extracts a string brand from JSON-LD inside @graph", () => {
    const ld = `<html><head>
      <meta property="og:image" content="https://cdn.example.com/og.jpg" />
      <script type="application/ld+json">
        {"@graph":[{"@type":"WebSite"},{"@type":"Product","brand":"Mug Co."}]}
      </script>
    </head></html>`;
    expect(extractOg(ld, "u")?.brand).toBe("Mug Co.");
  });

  it("ignores malformed JSON-LD", () => {
    const ld = `<html><head>
      <meta property="og:image" content="https://cdn.example.com/og.jpg" />
      <script type="application/ld+json">{not valid json</script>
    </head></html>`;
    expect(extractOg(ld, "u")?.brand).toBeUndefined();
  });

  it("falls back to twitter:image and <title>", () => {
    const alt = `<html><head><title>T</title>
      <meta name="twitter:image" content="https://cdn.example.com/tw.jpg" />
    </head></html>`;
    const out = extractOg(alt, "https://x.com/p");
    expect(out?.imageUrl).toBe("https://cdn.example.com/tw.jpg");
    expect(out?.title).toBe("T");
  });

  it("returns null without any image", () => {
    expect(extractOg("<html><head></head></html>", "u")).toBeNull();
  });
});

describe("ScrapeError", () => {
  it("carries a code", () => {
    expect(new ScrapeError("blocked").code).toBe("blocked");
  });
});

describe("safeFetch", () => {
  it("returns a 200 response without redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("body", { status: 200 })),
    );
    const res = await safeFetch("https://example.com/page");
    expect(res.status).toBe(200);
  });

  it("follows a redirect to a public URL and returns the final response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          new Response(null, {
            status: 301,
            headers: { location: "https://example.com/final" },
          }),
        )
        .mockResolvedValueOnce(new Response("ok", { status: 200 })),
    );
    const res = await safeFetch("https://example.com/original");
    expect(res.status).toBe(200);
  });

  it("throws ScrapeError('invalid_url') when a redirect points to a private IP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 301,
          headers: { location: "http://127.0.0.1/secret" },
        }),
      ),
    );
    await expect(safeFetch("https://example.com/trap")).rejects.toMatchObject({
      code: "invalid_url",
    });
  });

  it("throws ScrapeError('blocked') after exceeding max redirects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 301,
          headers: { location: "https://example.com/loop" },
        }),
      ),
    );
    await expect(safeFetch("https://example.com/loop")).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it("throws ScrapeError('blocked') when a redirect has no Location header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 301 })),
    );
    await expect(
      safeFetch("https://example.com/broken"),
    ).rejects.toMatchObject({ code: "blocked" });
  });
});

describe("readBodyWithLimit", () => {
  it("returns the full text when body is under the limit", async () => {
    const res = new Response("hello world");
    const text = await readBodyWithLimit(res, 100);
    expect(text).toBe("hello world");
  });

  it("throws ScrapeError('blocked') when body exceeds the byte limit", async () => {
    const body = "x".repeat(101);
    const res = new Response(body);
    await expect(readBodyWithLimit(res, 100)).rejects.toMatchObject({
      code: "blocked",
    });
  });

  it("throws ScrapeError('blocked') when Response body is null", async () => {
    const res = new Response(null, { status: 200 });
    await expect(readBodyWithLimit(res, 100)).rejects.toMatchObject({
      code: "blocked",
    });
  });
});
