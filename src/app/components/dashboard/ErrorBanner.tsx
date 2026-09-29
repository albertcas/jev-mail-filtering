"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Banner } from "../ui";

const KNOWN = ["imap_auth", "imap_unavailable", "jev_auth"] as const;
type KnownError = (typeof KNOWN)[number];

/**
 * The last sync's error. An unreachable server is a warning (saved results are
 * still shown, polite); rejected credentials block syncing (danger, assertive)
 * and link to the setup to fix them.
 */
export function ErrorBanner({ error }: { error: string }) {
  const t = useTranslations();
  const code: KnownError = (KNOWN as readonly string[]).includes(error) ? (error as KnownError) : "imap_unavailable";
  const blocking = code !== "imap_unavailable";
  return (
    <Banner
      tone={blocking ? "danger" : "warning"}
      live={blocking ? "assertive" : "polite"}
      action={
        <Link href="/setup" className="text-base font-medium text-ink underline decoration-current/40 hover:decoration-current">
          {t("errors.fixLink")}
        </Link>
      }
    >
      {t(`errors.${code}`)}
    </Banner>
  );
}
