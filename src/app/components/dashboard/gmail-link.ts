/** Gmail web search for one message by its Message-ID header (rfc822msgid:). */
export function gmailSearchUrl(messageId: string): string {
  const id = messageId.replace(/^<|>$/g, "");
  return `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`rfc822msgid:${id}`)}`;
}
