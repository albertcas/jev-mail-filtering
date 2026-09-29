"use client";

import { useTranslations } from "next-intl";
import type { ProviderId } from "@/core/mail/providers";
import { ExternalLink } from "./ExternalLink";
import { Steps } from "./Steps";
import { providerGuide } from "./guide";

/**
 * How to create an app password with the chosen provider: three numbered steps,
 * the provider's own page, and the long guide with screenshots in the repository.
 */
export function ProviderGuide({ provider, headingId }: { provider: ProviderId; headingId: string }) {
  const t = useTranslations();
  const guide = providerGuide(provider);
  return (
    <section aria-labelledby={headingId} className="grid gap-4">
      <h2 id={headingId} className="text-base font-semibold text-ink">
        {t("setup.howTo")}
      </h2>
      <Steps items={guide.steps.map((k) => t(k))} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pl-9">
        {guide.appPasswordUrl ? (
          <ExternalLink href={guide.appPasswordUrl} variant="button" newTabLabel={t("setup.newTab")}>
            {t("setup.guideOpen")}
          </ExternalLink>
        ) : null}
        <ExternalLink href={guide.docsUrl} newTabLabel={t("setup.newTab")}>
          {t("setup.guideFull")}
        </ExternalLink>
      </div>
    </section>
  );
}
