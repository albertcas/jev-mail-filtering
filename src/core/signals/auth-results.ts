import type { AuthResult } from "@/core/types";

function method(header: string, name: string): string | null {
  const m = header.match(new RegExp(`\\b${name}=([a-z]+)`, "i"));
  return m?.[1]?.toLowerCase() ?? null;
}

/** Reads the top-most Authentication-Results header (added by the recipient's server). */
export function parseAuthenticationResults(headers: string[]): AuthResult {
  const top = headers[0];
  if (!top) return "none";
  const dmarc = method(top, "dmarc");
  if (dmarc === "pass") return "pass";
  if (dmarc === "fail") return "fail";
  const dkim = method(top, "dkim");
  const spf = method(top, "spf");
  if (dkim === "pass" || spf === "pass") return "pass";
  if (dkim === "fail" || spf === "fail" || spf === "softfail") return "fail";
  return "none";
}
