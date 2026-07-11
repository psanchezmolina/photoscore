import { describe, it, expect } from "vitest";
import { parseKit } from "@/lib/kit";

const validKit = {
  productSummary: "handmade ceramic mug",
  title: "Handmade Ceramic Coffee Mug — Speckled Glaze, 12oz",
  description: "Start your morning right...",
  bullets: ["b1", "b2", "b3", "b4", "b5"],
  adCopy: ["ad1", "ad2", "ad3"],
  socialCaption: "Morning ritual, upgraded ☕",
  keywords: ["ceramic mug", "handmade mug"],
};

describe("parseKit", () => {
  it("accepts a valid kit", () => {
    expect(parseKit(validKit)).toEqual(validKit);
  });

  it("trims strings and drops empty array entries", () => {
    const kit = parseKit({
      ...validKit,
      title: "  padded  ",
      keywords: ["ceramic mug", "", "  "],
    });
    expect(kit.title).toBe("padded");
    expect(kit.keywords).toEqual(["ceramic mug"]);
  });

  it("rejects a non-object", () => {
    expect(() => parseKit(null)).toThrow();
    expect(() => parseKit("hi")).toThrow();
  });

  it("rejects missing required fields", () => {
    const { title, ...rest } = validKit;
    expect(() => parseKit(rest)).toThrow(/title/);
  });

  it("rejects empty bullets array", () => {
    expect(() => parseKit({ ...validKit, bullets: [] })).toThrow(/bullets/);
  });
});
