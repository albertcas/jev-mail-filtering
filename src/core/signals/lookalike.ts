import { getDomain, parse } from "tldts";

/** Brand label → official registrable domains. Extend via PR. */
export const BRANDS: Record<string, string[]> = {
  paypal: ["paypal.com", "paypal.es", "paypal.me"],
  amazon: ["amazon.com", "amazon.es", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it", "amazonses.com", "amazon-adsystem.com"],
  apple: ["apple.com", "icloud.com"],
  google: ["google.com", "gmail.com", "youtube.com", "google-analytics.com"],
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

/** Real, unrelated brands one edit away from a protected one (paypay.ne.jp is not PayPal). Extend via PR. */
const DISTINCT_BRANDS = new Set(["paypay"]);

/** Brands this short (apple, fedex, dhl, bbva) only match exactly: fuzzy matching them hits real words (apply.com). */
const FUZZY_MIN_LENGTH = 6;

/**
 * Returns the brand label a host imitates, or null. Only the registrable domain
 * decides, so a brand word in a subdomain of an unrelated platform
 * (amazon.mailchimp.com) is not an imitation. Flags:
 *  (a) a registrable label confusable-equal to a brand, or within edit distance
 *      (1 for 6–7 chars, 2 from 8) of it: arnazon.es, amazom.com;
 *  (b) a brand as a hyphen-separated token of the registrable label:
 *      paypa1-secure.com, dhl-tracking-parcel.info;
 *  (c) subdomain labels that spell an official brand domain: paypal.com.verify-account.net.
 * The brand's own label on any public suffix (paypal.co.uk, amazon.com.mx) and the listed
 * official domains never match.
 */
export function resemblesBrand(host: string): string | null {
  const p = parse(host.trim().toLowerCase());
  if (!p.domain || !p.domainWithoutSuffix) return null;
  const rawLabel = p.domainWithoutSuffix;
  const label = normalizeConfusables(rawLabel);
  const tokens = label.split(/[-_]/);
  const sub = `.${p.subdomain ?? ""}.`;
  for (const [brand, official] of Object.entries(BRANDS)) {
    if (official.includes(p.domain) || rawLabel === brand) continue;
    if (label === brand || tokens.includes(brand)) return brand;
    if (official.some((d) => sub.includes(`.${d}.`))) return brand;
    if (brand.length >= FUZZY_MIN_LENGTH && !DISTINCT_BRANDS.has(rawLabel)) {
      const maxDistance = brand.length >= 8 ? 2 : 1;
      if (levenshtein(label, brand) <= maxDistance) return brand;
    }
  }
  return null;
}
