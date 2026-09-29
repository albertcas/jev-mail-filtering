import { useTranslations } from "next-intl";
import { Banner } from "../ui";

export const REPO_README_URL = "https://github.com/albertcas/jev-mail-filtering#readme";

/** Static notice: fictional data, plus the way to run it on your own inbox. */
export function DemoBanner() {
  const t = useTranslations();
  return (
    <Banner
      tone="info"
      action={
        <a
          href={REPO_README_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-6 items-center text-base font-medium text-ink underline decoration-current/40 hover:decoration-current pointer-coarse:min-h-11"
        >
          {t("demo.install")}
        </a>
      }
    >
      {t("demo.banner")}
    </Banner>
  );
}
