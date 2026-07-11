const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;

export function isValidBase64(s: string): boolean {
  return s.length % 4 === 0 && BASE64_RE.test(s);
}
