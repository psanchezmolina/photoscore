// Shared types and helpers for the PhotoScore audit flow.

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ProductScore {
  title: string;
  imageUrl: string;
  grade: string;
  issues: string[];
  strengths: string[];
}

export interface Score {
  grade: Grade;
  score: number;
  summary: string;
  topFixes: string[];
  worstIndex: number;
  products: ProductScore[];
}

export interface AuditResult {
  auditId: string;
  store: { name: string; domain: string };
  score: Score;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface GradeTheme {
  /** primary letter / accent color */
  text: string;
  /** soft tinted background */
  bg: string;
  /** border for tinted surfaces */
  border: string;
  /** short qualitative label */
  label: string;
}

/**
 * Grade -> tasteful color tokens, kept within the brand palette family.
 * A/B read green, C amber, D/F red. Returned as inline-style hex because the
 * grade is only known at runtime (Tailwind can't compile dynamic classes).
 */
export function gradeTheme(grade: string): GradeTheme {
  switch (grade.toUpperCase()) {
    case "A":
      return {
        text: "#0E9F6E",
        bg: "#ECFDF5",
        border: "#A7F3D0",
        label: "Excellent",
      };
    case "B":
      return {
        text: "#159A5B",
        bg: "#F0FDF4",
        border: "#BBF7D0",
        label: "Good",
      };
    case "C":
      return {
        text: "#D97706",
        bg: "#FFFBEB",
        border: "#FDE68A",
        label: "Needs work",
      };
    case "D":
      return {
        text: "#E0483A",
        bg: "#FEF3F2",
        border: "#FECACA",
        label: "Poor",
      };
    default: // F
      return {
        text: "#D22F2F",
        bg: "#FEF2F2",
        border: "#FCA5A5",
        label: "Failing",
      };
  }
}
