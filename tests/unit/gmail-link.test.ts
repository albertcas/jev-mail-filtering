import { expect, it } from "vitest";
import { gmailSearchUrl } from "@/app/components/dashboard/gmail-link";

it("builds an rfc822msgid search without angle brackets", () => {
  expect(gmailSearchUrl("<abc+1@mail.gmail.com>")).toBe("https://mail.google.com/mail/u/0/#search/rfc822msgid%3Aabc%2B1%40mail.gmail.com");
});
