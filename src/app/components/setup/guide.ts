import { PROVIDERS, type ProviderId } from "@/core/mail/providers";

export const PROVIDER_IDS = ["gmail", "icloud", "yahoo", "imap"] as const satisfies readonly ProviderId[];

export const TYPESAFE_KEYS_URL = "https://console.typesafe.ai/keys";
const DOCS_BASE = "https://github.com/albertcas/jev-mail-filtering/blob/main/docs/setup";

export type ProviderGuide = {
  provider: ProviderId;
  /** i18n keys of the numbered steps, in order. */
  steps: string[];
  /** The provider's own page where app passwords are created; null for other IMAP. */
  appPasswordUrl: string | null;
  /** The long-form guide in the repository, in the UI language when a translation exists. */
  docsUrl: string;
};

/** Steps and links for creating an app password with a given provider. */
export function providerGuide(provider: ProviderId, locale = "en"): ProviderGuide {
  return {
    provider,
    steps: [1, 2, 3].map((n) => `setup.guide.${provider}.step${n}`),
    appPasswordUrl: provider === "imap" ? null : PROVIDERS[provider].appPasswordUrl,
    docsUrl: `${DOCS_BASE}/${provider}${locale === "es" ? ".es" : ""}.md`,
  };
}

/** Human name of a provider (brand names are not translated). */
export const PROVIDER_NAMES: Record<Exclude<ProviderId, "imap">, string> = {
  gmail: "Gmail",
  icloud: "iCloud Mail",
  yahoo: "Yahoo Mail",
};
