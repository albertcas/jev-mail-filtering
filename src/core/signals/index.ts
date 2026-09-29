import type { MailContext, RawMessage, Signals } from "@/core/types";
import { parseAuthenticationResults } from "./auth-results";
import { registrableDomain, resemblesBrand } from "./lookalike";
import { hasMismatchedLinks, linkHosts } from "./links";
import { hasRiskyAttachment } from "./attachments";

export function computeSignals(msg: RawMessage, ctx: MailContext): Signals {
  const fromDomain = registrableDomain(msg.from.address);
  const replyDomain = msg.replyTo ? registrableDomain(msg.replyTo.address) : null;
  const senderHost = msg.from.address.split("@").pop() ?? "";
  const resembles =
    resemblesBrand(senderHost) ??
    linkHosts(msg.links).map(resemblesBrand).find((b): b is string => b !== null) ??
    null;
  const threadIds = [msg.inReplyTo, ...msg.references].filter((x): x is string => !!x);
  return {
    sender_authentication: parseAuthenticationResults(msg.authenticationResults),
    reply_to_differs_from_sender: replyDomain !== null && fromDomain !== null && replyDomain !== fromDomain,
    domain_resembles: resembles,
    has_unsubscribe_header: msg.listUnsubscribe !== null,
    recipient_has_replied_in_thread: threadIds.some((id) => ctx.sentMessageIds.has(id)),
    recipient_has_written_to_sender_before: ctx.sentRecipients.has(msg.from.address.toLowerCase()),
    risky_attachments: hasRiskyAttachment(msg.attachments),
    mismatched_links: hasMismatchedLinks(msg.links),
  };
}
