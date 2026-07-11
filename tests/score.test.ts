import { describe, expect, it } from "vitest";
import { parseScore } from "../src/lib/score";
import { normalizeStoreUrl, sizedImageUrl, CatalogError } from "../src/lib/catalog";

const valid = {
  grade: "C",
  score: 61,
  summary: "Solid products undermined by mismatched backgrounds.",
  top_fixes: ["Fix one", "Fix two", "Fix three"],
  worst_index: 2,
  products: [
    { index: 0, grade: "B", issues: ["shadowy"], strengths: ["sharp"] },
    { index: 2, grade: "D", issues: [], strengths: [] },
  ],
};

describe("parseScore", () => {
  it("parses a valid score", () => {
    const s = parseScore(valid, 6);
    expect(s.grade).toBe("C");
    expect(s.score).toBe(61);
    expect(s.topFixes).toHaveLength(3);
    expect(s.products[1].grade).toBe("D");
    expect(s.worstIndex).toBe(2);
  });

  it("rejects bad grades", () => {
    expect(() => parseScore({ ...valid, grade: "E" }, 6)).toThrow();
  });

  it("rejects product index out of range", () => {
    const bad = { ...valid, products: [{ index: 9, grade: "A", issues: [], strengths: [] }] };
    expect(() => parseScore(bad, 6)).toThrow();
  });

  it("clamps out-of-range worst_index to a graded product", () => {
    const s = parseScore({ ...valid, worst_index: 99 }, 6);
    expect(s.worstIndex).toBe(0);
  });
});

describe("normalizeStoreUrl", () => {
  it("adds https and strips paths", () => {
    expect(normalizeStoreUrl("mystore.com")).toBe("https://mystore.com");
    expect(normalizeStoreUrl("http://a.com/collections/all")).toBe("http://a.com");
  });
  it("throws on garbage", () => {
    expect(() => normalizeStoreUrl("https://")).toThrow(CatalogError);
  });
});

describe("sizedImageUrl", () => {
  it("appends width param", () => {
    expect(sizedImageUrl("https://cdn.shopify.com/a.jpg")).toContain("width=800");
  });
  it("passes through invalid urls", () => {
    expect(sizedImageUrl("not a url")).toBe("not a url");
  });
});
