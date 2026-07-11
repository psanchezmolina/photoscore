import Anthropic from "@anthropic-ai/sdk";
import { KIT_JSON_SCHEMA, parseKit, type ListingKit } from "./kit";

export class GenerationRefusedError extends Error {
  constructor() {
    super("Generation refused by the model");
    this.name = "GenerationRefusedError";
  }
}

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

const SYSTEM_PROMPT = `You are an expert e-commerce copywriter who writes listing copy that ranks and converts for Shopify, Etsy and Amazon sellers.

You will receive a product photo (and sometimes extra context). Look carefully at the product: its type, material, color, style, likely use case and likely buyer. Then produce a complete listing kit.

Rules:
- Write in natural, confident English. No hype clichés ("game-changer", "must-have"), no invented specs (never claim a material, size or feature you cannot see or that wasn't provided).
- Title: 60-80 characters, front-load the main keyword, include the most distinctive attribute you can actually see.
- Description: 2-3 short paragraphs. First paragraph hooks with the main benefit; the rest covers details and use cases. Plain text, no markdown headers.
- Bullets: exactly 5, each leading with a benefit, max ~15 words each.
- Ad copy: exactly 3 variants with different angles (e.g. emotional, practical, social proof style). 1-2 sentences each.
- Social caption: one caption, warm tone, light emoji, 1-2 hashtags.
- Keywords: 10-15 lowercase keywords/phrases buyers would actually search.
- Never use dashes as punctuation anywhere in the kit: no em dashes (—) and no hyphens used as separators (like "Mug - 12oz" or "quality - guaranteed"). Use commas, periods, colons or parentheses instead, including in the title. Hyphens inside compound words (hand-painted, eco-friendly) are fine.`;

export interface ScrapedContext {
  title?: string;
  description?: string;
  brand?: string;
  siteName?: string;
  url?: string;
}

export interface InstructionInput {
  extraContext?: string;
  scraped?: ScrapedContext;
}

export function buildInstruction(input: InstructionInput): string {
  const parts = [
    "Create the complete listing kit for the product in this photo.",
  ];
  const scraped = input.scraped;
  if (scraped && (scraped.title || scraped.description || scraped.brand || scraped.siteName)) {
    parts.push(
      `For reference, here is the product's original listing (improve on it, don't copy it):\n` +
        (scraped.brand ? `Brand: ${scraped.brand}\n` : "") +
        (scraped.siteName ? `Store: ${scraped.siteName}\n` : "") +
        (scraped.title ? `Original title: ${scraped.title}\n` : "") +
        (scraped.description
          ? `Original description: ${scraped.description}`
          : ""),
    );
    if (scraped.brand) {
      parts.push(
        "Use the brand name naturally where it strengthens the copy, especially front-loaded in the title.",
      );
    }
  }
  if (input.extraContext && input.extraContext.trim() !== "") {
    parts.push(`Seller-provided context: ${input.extraContext.trim()}`);
  }
  return parts.join("\n\n");
}

export interface GenerateInput extends InstructionInput {
  imageBase64: string;
  mediaType: AllowedMediaType;
}

export async function generateKit(input: GenerateInput): Promise<ListingKit> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        // KIT_JSON_SCHEMA is `as const` (readonly); cast to satisfy the SDK's
        // mutable { [key: string]: unknown } index signature expectation.
        schema: KIT_JSON_SCHEMA as unknown as { [key: string]: unknown },
      },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: input.mediaType,
              data: input.imageBase64,
            },
          },
          { type: "text", text: buildInstruction(input) },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new GenerationRefusedError();
  }

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text block in Claude response");
  }
  return parseKit(JSON.parse(textBlock.text));
}
