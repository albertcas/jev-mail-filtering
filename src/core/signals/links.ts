import { parse } from "tldts";
import { registrableDomain } from "./lookalike";

const DOMAIN_IN_TEXT = /\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/gi;
/** File names look like domains ("factura.pdf"); some extensions are even real TLDs (.zip). */
const FILE_EXTENSIONS = new Set(["pdf", "zip", "docx", "xlsx", "png", "jpg", "jpeg", "gif", "txt", "csv", "exe", "html", "htm"]);

/** The first thing in the text that is really a domain: an ICANN public suffix that is not a file extension. */
function domainInText(text: string): string | null {
  for (const [, candidate] of text.matchAll(DOMAIN_IN_TEXT)) {
    const p = parse(candidate!.toLowerCase());
    if (p.isIcann && p.domain && !FILE_EXTENSIONS.has(p.publicSuffix ?? "")) return candidate!;
  }
  return null;
}

function hrefHost(href: string): string | null {
  try {
    return new URL(href).hostname;
  } catch {
    return null;
  }
}

/** True when a link's visible text shows a domain different from where it really points. */
export function hasMismatchedLinks(links: { text: string; href: string }[]): boolean {
  return links.some(({ text, href }) => {
    const shown = domainInText(text);
    const target = hrefHost(href);
    if (!shown || !target) return false;
    const a = registrableDomain(shown);
    const b = registrableDomain(target);
    return a !== null && b !== null && a !== b;
  });
}

export function linkHosts(links: { href: string }[]): string[] {
  return [...new Set(links.map((l) => hrefHost(l.href)).filter((h): h is string => h !== null))];
}
