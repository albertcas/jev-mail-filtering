import { registrableDomain } from "./lookalike";

const DOMAIN_IN_TEXT = /\b((?:[a-z0-9-]+\.)+[a-z]{2,})\b/i;

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
    const shown = text.match(DOMAIN_IN_TEXT)?.[1];
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
