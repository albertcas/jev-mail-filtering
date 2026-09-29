import type { AuthResult } from "@/core/types";
import { registrableDomain } from "./lookalike";

function extractMethodResult(clause: string, methodName: string): string | null {
  const pattern = new RegExp(`\\b${methodName}=([a-z]+)`, "i");
  const m = clause.match(pattern);
  return m?.[1]?.toLowerCase() ?? null;
}

function extractTag(clause: string, tag: string): string | null {
  const pattern = new RegExp(`${tag}=([^;\\s]+)`, "i");
  const m = clause.match(pattern);
  return m?.[1] ?? null;
}

/** Reads the top-most Authentication-Results header (added by the recipient's server). */
export function parseAuthenticationResults(headers: string[], fromDomain: string | null): AuthResult {
  const top = headers[0];
  if (!top) return "none";

  // Split header into clauses (semicolon-separated)
  const clauses = top.split(";").map((c) => c.trim()).filter((c) => c);

  // Check for DMARC first (takes precedence)
  for (const clause of clauses) {
    const dmarc = extractMethodResult(clause, "dmarc");
    if (dmarc === "pass") return "pass";
    if (dmarc === "fail") return "fail";
  }

  // Check for explicit failures in DKIM/SPF (these win over passes)
  for (const clause of clauses) {
    const dkim = extractMethodResult(clause, "dkim");
    const spf = extractMethodResult(clause, "spf");
    if (dkim === "fail" || spf === "fail" || spf === "softfail") return "fail";
  }

  // No DMARC and no explicit failures - check for aligned pass results
  if (!fromDomain) return "none";

  // Check DKIM pass clauses with their own header.d/header.i alignment
  for (const clause of clauses) {
    const dkim = extractMethodResult(clause, "dkim");
    if (dkim === "pass") {
      const headerD = extractTag(clause, "header\\.d");
      if (headerD && registrableDomain(headerD) === fromDomain) return "pass";

      const headerI = extractTag(clause, "header\\.i");
      if (headerI) {
        const domain = headerI.split("@").pop();
        if (domain && registrableDomain(domain) === fromDomain) return "pass";
      }
    }
  }

  // Check SPF pass clauses with their own smtp.mailfrom alignment
  for (const clause of clauses) {
    const spf = extractMethodResult(clause, "spf");
    if (spf === "pass") {
      const mailfrom = extractTag(clause, "smtp\\.mailfrom");
      if (mailfrom && registrableDomain(mailfrom) === fromDomain) return "pass";
    }
  }

  return "none";
}
