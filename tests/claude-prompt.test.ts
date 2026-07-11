import { describe, it, expect } from "vitest";
import { buildInstruction } from "@/lib/claude";

describe("buildInstruction", () => {
  it("returns the base instruction with no context", () => {
    const text = buildInstruction({});
    expect(text).toContain("listing kit");
    expect(text).not.toContain("Seller-provided context");
    expect(text).not.toContain("original listing");
  });

  it("includes seller context when provided", () => {
    const text = buildInstruction({ extraContext: "Brand: Acme, audience: hikers" });
    expect(text).toContain("Seller-provided context");
    expect(text).toContain("Brand: Acme, audience: hikers");
  });

  it("includes scraped data when provided", () => {
    const text = buildInstruction({
      scraped: { title: "Old title", description: "Old desc", url: "https://shop.com/p/x" },
    });
    expect(text).toContain("original listing");
    expect(text).toContain("Old title");
    expect(text).toContain("Old desc");
  });

  it("includes the scraped brand and store name when provided", () => {
    const text = buildInstruction({
      scraped: { brand: "Mug Co.", siteName: "Mug Store" },
    });
    expect(text).toContain("Brand: Mug Co.");
    expect(text).toContain("Store: Mug Store");
  });
});
