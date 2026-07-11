import { describe, it, expect } from "vitest";
import { isValidBase64 } from "@/lib/validate";

describe("isValidBase64", () => {
  it("accepts valid base64 strings", () => {
    expect(isValidBase64("SGVsbG8gV29ybGQ=")).toBe(true); // "Hello World"
    expect(isValidBase64("dGVzdA==")).toBe(true); // "test"
    expect(isValidBase64("YQ==")).toBe(true); // "a"
    expect(isValidBase64("AAAA")).toBe(true); // no padding needed
  });

  it("rejects strings with invalid base64 characters", () => {
    expect(isValidBase64("not-valid!")).toBe(false);
    expect(isValidBase64("has space here==")).toBe(false);
    expect(isValidBase64("<script>alert(1)</script>")).toBe(false);
  });

  it("rejects strings whose length is not a multiple of 4", () => {
    expect(isValidBase64("abc")).toBe(false);
    expect(isValidBase64("abcde")).toBe(false);
  });

  it("accepts empty string (represents zero bytes)", () => {
    expect(isValidBase64("")).toBe(true);
  });
});
