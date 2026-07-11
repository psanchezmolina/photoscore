export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ProductScore {
  /** Index of the image as sent to the model (0-based). */
  index: number;
  grade: Grade;
  issues: string[];
  strengths: string[];
}

export interface StoreScore {
  grade: Grade;
  /** 0-100, so close stores can still be ranked. */
  score: number;
  summary: string;
  topFixes: string[];
  worstIndex: number;
  products: ProductScore[];
}

export const SCORE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["grade", "score", "summary", "top_fixes", "worst_index", "products"],
  properties: {
    grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
    score: {
      type: "integer",
      description: "0-100. A maps to 90-100, B 75-89, C 55-74, D 30-54, F 0-29.",
    },
    summary: {
      type: "string",
      description:
        "One punchy sentence a store owner would remember, specific to this store.",
    },
    top_fixes: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
      description:
        "Exactly 3 items: the 3 highest-impact fixes across the whole catalog, each specific and actionable.",
    },
    worst_index: {
      type: "integer",
      description: "Index (0-based) of the photo that costs this store the most.",
    },
    products: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["index", "grade", "issues", "strengths"],
        properties: {
          index: { type: "integer", description: "0-based photo index" },
          grade: { type: "string", enum: ["A", "B", "C", "D", "F"] },
          issues: {
            type: "array",
            items: { type: "string" },
            description: "Up to 3 concrete issues",
          },
          strengths: {
            type: "array",
            items: { type: "string" },
            description: "Up to 2 real strengths",
          },
        },
      },
    },
  },
} as const;

const GRADES: readonly string[] = ["A", "B", "C", "D", "F"];

export function parseScore(raw: unknown, imageCount: number): StoreScore {
  const obj = raw as Record<string, unknown>;
  if (typeof obj !== "object" || obj === null) throw new Error("score: not an object");
  const grade = obj.grade;
  if (typeof grade !== "string" || !GRADES.includes(grade)) {
    throw new Error("score: bad grade");
  }
  const score = obj.score;
  if (typeof score !== "number" || score < 0 || score > 100) {
    throw new Error("score: bad score");
  }
  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const fixesRaw = obj.top_fixes;
  if (!Array.isArray(fixesRaw)) throw new Error("score: bad top_fixes");
  const fixes = fixesRaw.filter((f): f is string => typeof f === "string").slice(0, 3);
  if (fixes.length === 0) throw new Error("score: bad top_fixes");
  const productsRaw = obj.products;
  if (!Array.isArray(productsRaw) || productsRaw.length === 0) {
    throw new Error("score: bad products");
  }
  const products: ProductScore[] = productsRaw.map((p) => {
    const pr = p as Record<string, unknown>;
    const idx = pr.index;
    const pGrade = pr.grade;
    if (typeof idx !== "number" || idx < 0 || idx >= imageCount) {
      throw new Error("score: bad product index");
    }
    if (typeof pGrade !== "string" || !GRADES.includes(pGrade)) {
      throw new Error("score: bad product grade");
    }
    return {
      index: idx,
      grade: pGrade as Grade,
      issues: Array.isArray(pr.issues) ? pr.issues.filter((i) => typeof i === "string") : [],
      strengths: Array.isArray(pr.strengths)
        ? pr.strengths.filter((s) => typeof s === "string")
        : [],
    };
  });
  let worstIndex = typeof obj.worst_index === "number" ? obj.worst_index : products[0].index;
  if (worstIndex < 0 || worstIndex >= imageCount) worstIndex = products[0].index;
  return {
    grade: grade as Grade,
    score,
    summary,
    topFixes: fixes,
    worstIndex,
    products,
  };
}
