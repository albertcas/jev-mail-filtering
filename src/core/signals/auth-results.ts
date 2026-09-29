import type { AuthResult } from "@/core/types";
import { registrableDomain } from "./lookalike";

function method(header: string, name: string): string | null {
  const m = header.match(new RegExp(`\\b${name}=([a-z]+)`, "i"));
  return m?.[1]?.toLowerCase() ?? null;
}

function extractTag(header: string, tag: string): string[] {
  const pattern = new RegExp(`${tag}=([^;\\s]+)`, "gi");
  const results: string[] = [];
  let match;
  while ((match = pattern.exec(header)) !== null) {
    results.push(match[1]!);
  }
  return results;
}

/** Reads the top-most Authentication-Results header (added by the recipient's server). */
export function parseAuthenticationResults(headers: string[], fromDomain: string | null): AuthResult {
  const top = headers[0];
  if (!top) return "none";

  // DMARC takes precedence when present
  const dmarc = method(top, "dmarc");
  if (dmarc === "pass") return "pass";
  if (dmarc === "fail") return "fail";

  // Check for explicit failures (these win over passes)
  const dkim = method(top, "dkim");
  const spf = method(top, "spf");
  if (dkim === "fail" || spf === "fail" || spf === "softfail") return "fail";

  // No DMARC and no explicit failures - check for aligned pass results
  if (!fromDomain) return "none";

  // Check DKIM alignments (can have multiple dkim= entries)
  const dkimResults = extractTag(top, "dkim");
  for (const result of dkimResults) {
    if (result === "pass") {
      // Look for header.d= or header.i=@domain alignment
      const headerD = extractTag(top, "header\\.d")?.[0];
      const headerI = extractTag(top, "header\\.i")?.[0];

      if (headerD && registrableDomain(headerD) === fromDomain) return "pass";
      if (headerI) {
        const domain = headerI.split("@").pop();
        if (domain && registrableDomain(domain) === fromDomain) return "pass";
      }
    }
  }

  // Check SPF alignments (can have multiple spf= entries)
  const spfResults = extractTag(top, "spf");
  for (const result of spfResults) {
    if (result === "pass") {
      // Look for smtp.mailfrom= alignment
      const mailfrom = extractTag(top, "smtp\\.mailfrom")?.[0];
      if (mailfrom && registrableDomain(mailfrom) === fromDomain) return "pass";
    }
  }

  return "none";
}
