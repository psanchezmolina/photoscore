export interface ListingKit {
  productSummary: string;
  title: string;
  description: string;
  bullets: string[];
  adCopy: string[];
  socialCaption: string;
  keywords: string[];
}

// JSON Schema for Claude structured outputs.
// Note: exact item counts (5 bullets, 3 ads) are enforced by the prompt, not the
// schema — the structured-outputs API does not support array length constraints.
export const KIT_JSON_SCHEMA = {
  type: "object",
  properties: {
    productSummary: {
      type: "string",
      description:
        "Short noun phrase naming the product visible in the photo, lowercase, e.g. 'handmade ceramic mug'",
    },
    title: {
      type: "string",
      description: "SEO-optimized listing title, 60-80 characters, no quotes",
    },
    description: {
      type: "string",
      description:
        "Conversion-focused product description, 2-3 short paragraphs separated by blank lines",
    },
    bullets: {
      type: "array",
      items: { type: "string" },
      description: "Exactly 5 benefit-led bullet points, no leading dashes",
    },
    adCopy: {
      type: "array",
      items: { type: "string" },
      description:
        "Exactly 3 ad copy variants (primary text for paid social), each 1-2 sentences with a hook",
    },
    socialCaption: {
      type: "string",
      description: "One engaging social caption, light emoji use, 1-2 hashtags",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "10-15 SEO keywords or short phrases, lowercase",
    },
  },
  required: [
    "productSummary",
    "title",
    "description",
    "bullets",
    "adCopy",
    "socialCaption",
    "keywords",
  ],
  additionalProperties: false,
} as const;

const STRING_FIELDS = [
  "productSummary",
  "title",
  "description",
  "socialCaption",
] as const;
const ARRAY_FIELDS = ["bullets", "adCopy", "keywords"] as const;

export function parseKit(raw: unknown): ListingKit {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Kit is not an object");
  }
  const obj = raw as Record<string, unknown>;
  const kit: Partial<ListingKit> = {};

  for (const field of STRING_FIELDS) {
    const value = obj[field];
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Invalid or missing field: ${field}`);
    }
    kit[field] = value.trim();
  }

  for (const field of ARRAY_FIELDS) {
    const value = obj[field];
    if (!Array.isArray(value)) {
      throw new Error(`Invalid or missing field: ${field}`);
    }
    const items = value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v !== "");
    if (items.length === 0) {
      throw new Error(`Empty array field: ${field}`);
    }
    kit[field] = items;
  }

  return kit as ListingKit;
}
