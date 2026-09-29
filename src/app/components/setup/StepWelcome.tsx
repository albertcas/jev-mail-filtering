"use client";

import { useTranslations } from "next-intl";
import { ArrowRightIcon, DesktopTowerIcon, EyeIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react/ssr";
import { Button } from "../ui";
import { ExternalLink } from "./ExternalLink";
import { StepFrame } from "./StepFrame";

const FACTS = [
  { key: "setup.welcomeFact1", Icon: DesktopTowerIcon },
  { key: "setup.welcomeFact2", Icon: EyeIcon },
  { key: "setup.welcomeFact3", Icon: PaperPlaneTiltIcon },
] as const;

/** What the app does, what leaves the computer, and what setup will ask for. */
export function StepWelcome({ demoUrl, onStart }: { demoUrl: string | null; onStart: () => void }) {
  const t = useTranslations();
  return (
    <StepFrame title={t("setup.welcomeTitle")} autoFocus={false}>
      <ul className="grid gap-4 border-y border-line py-5">
        {FACTS.map(({ key, Icon }) => (
          <li key={key} className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-3 text-md text-ink">
            <Icon aria-hidden size={20} className="mt-0.5 text-ink-2" />
            <span className="max-w-[60ch] text-pretty">{t(key)}</span>
          </li>
        ))}
      </ul>
      <p className="max-w-[60ch] text-md text-pretty text-ink-2">{t("setup.welcomeNeeds")}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button variant="primary" onClick={onStart} className="flex-row-reverse" icon={<ArrowRightIcon size={16} weight="bold" />}>
          {t("setup.start")}
        </Button>
        {demoUrl ? (
          <ExternalLink href={demoUrl} newTabLabel={t("setup.newTab")}>
            {t("setup.tryDemo")}
          </ExternalLink>
        ) : null}
      </div>
    </StepFrame>
  );
}
