import type { Person, RawMessage, Signals } from "@/core/types";
import { registrableDomain } from "@/core/signals/lookalike";

export const BODY_EXCERPT_MAX = 2000;
const MAX_LIST = 10;

export type JevState = {
  recipient: { name: string; address: string };
  email: {
    from: { name: string; address: string };
    subject: string;
    body_excerpt: string;
    link_domains: string[];
    attachment_names: string[];
  };
  signals: Signals;
};

export function excerpt(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, BODY_EXCERPT_MAX);
}

export function buildState(msg: RawMessage, signals: Signals, recipient: Person): JevState {
  const domains = msg.links
    .map((l) => {
      try {
        return registrableDomain(new URL(l.href).hostname);
      } catch {
        return null;
      }
    })
    .filter((d): d is string => d !== null);
  return {
    recipient: { name: recipient.name, address: recipient.address },
    email: {
      from: { name: msg.from.name, address: msg.from.address },
      subject: msg.subject.slice(0, 300),
      body_excerpt: excerpt(msg.text),
      link_domains: [...new Set(domains)].slice(0, MAX_LIST),
      attachment_names: msg.attachments.map((a) => a.filename).slice(0, MAX_LIST),
    },
    signals,
  };
}
