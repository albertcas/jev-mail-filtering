import { getDomain } from "tldts";

/** Brand label → official registrable domains. Extend via PR. */
export const BRANDS: Record<string, string[]> = {
  paypal: ["paypal.com", "paypal.es", "paypal.me"],
  amazon: ["amazon.com", "amazon.es", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it", "amazonses.com"],
  apple: ["apple.com", "icloud.com"],
  google: ["google.com", "gmail.com", "youtube.com"],
  microsoft: ["microsoft.com", "outlook.com", "live.com", "office.com"],
  netflix: ["netflix.com"],
  facebook: ["facebook.com", "facebookmail.com", "meta.com"],
  instagram: ["instagram.com"],
  linkedin: ["linkedin.com"],
  dhl: ["dhl.com", "dhl.es", "dhl.de"],
  fedex: ["fedex.com"],
  correos: ["correos.es", "correos.com"],
  santander: ["santander.com", "bancosantander.es", "gruposantander.es"],
  bbva: ["bbva.es", "bbva.com"],
  caixabank: ["caixabank.es", "caixabank.com"],
  agenciatributaria: ["agenciatributaria.gob.es", "agenciatributaria.es"],
};

export function registrableDomain(hostOrAddress: string): string | null {
  const host = hostOrAddress.includes("@") ? hostOrAddress.split("@").pop()! : hostOrAddress;
  return getDomain(host.trim().toLowerCase()) ?? null;
}

function normalizeConfusables(s: string): string {
  return s
    .toLowerCase()
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/5/g, "s")
    .replace(/@/g, "a");
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

/** Returns the brand label a host imitates, or null. Official domains never match. */
export function resemblesBrand(host: string): string | null {
  const domain = registrableDomain(host);
  if (!domain) return null;
  const tokens = normalizeConfusables(host).split(/[.\-_]/);
  const label = normalizeConfusables(domain.split(".")[0] ?? "");
  for (const [brand, official] of Object.entries(BRANDS)) {
    if (official.includes(domain)) continue;
    if (tokens.includes(brand)) return brand;
    if (brand.length >= 5) {
      const maxDistance = brand.length >= 8 ? 2 : 1;
      if (label !== brand && levenshtein(label, brand) <= maxDistance) return brand;
    }
  }
  return null;
}
