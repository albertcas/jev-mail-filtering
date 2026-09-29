"use client";

import { useId, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, CheckIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import type { Thresholds } from "@/core/policy/thresholds";
import type { ProviderId } from "@/core/mail/providers";
import { api } from "../dashboard/api";
import { DemoBanner } from "../dashboard/DemoBanner";
import { ThresholdPanel } from "../dashboard/ThresholdPanel";
import { setupApi } from "../setup/api";
import { PROVIDER_NAMES } from "../setup/guide";
import { Banner, Button, Field, Input, Select, cn } from "../ui";
import { intervalOptions, intervalUnit, normalizeModel } from "./intervals";

export type SettingsFormProps = {
  demo: boolean;
  locale: "en" | "es";
  secretsKind: "keyring" | "env" | "memory";
  thresholds: Thresholds;
  account: { provider: ProviderId; user: string; displayName: string; host: string; port: number } | null;
  intervalMinutes: number;
  model: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const noopSubscribe = () => () => {};
/** False during SSR and hydration, true afterwards (ThresholdPanel reads the viewport on mount). */
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

// Language names are written in their own language, never translated.
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
] as const;

/**
 * Settings, one section per concern: decisions (thresholds), sync frequency,
 * model pin, language, account and the danger zone. In the demo everything but
 * the language is disabled.
 */
export function SettingsForm({ demo, locale, secretsKind, thresholds, account, intervalMinutes, model }: SettingsFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [interval, setIntervalValue] = useState(intervalMinutes);
  const [intervalState, setIntervalState] = useState<SaveState>("idle");
  const [modelValue, setModelValue] = useState(model);
  const [modelState, setModelState] = useState<SaveState>("idle");
  const [modelError, setModelError] = useState(false);
  const [lang, setLang] = useState(locale);
  const [langState, setLangState] = useState<SaveState>("idle");
  const [wiping, setWiping] = useState(false);
  const [wipeError, setWipeError] = useState(false);
  const hydrated = useHydrated();

  const saveConfig = async (patch: Record<string, unknown>, setState: (s: SaveState) => void) => {
    setState("saving");
    try {
      await setupApi.saveConfig(patch);
      setState("saved");
    } catch {
      setState("error");
    }
  };

  const saveModel = (e: FormEvent) => {
    e.preventDefault();
    const m = normalizeModel(modelValue);
    if (!m) {
      setModelError(true);
      return;
    }
    setModelValue(m);
    void saveConfig({ model: m }, setModelState);
  };

  const changeLanguage = async (next: "en" | "es") => {
    const prev = lang;
    setLang(next);
    setLangState("saving");
    try {
      await setupApi.setLocale(next);
      setLangState("idle");
      router.refresh(); // re-render the server tree with the new messages
    } catch {
      setLang(prev);
      setLangState("error");
    }
  };

  const wipe = async () => {
    if (!window.confirm(t("settings.wipeConfirm"))) return;
    setWiping(true);
    setWipeError(false);
    try {
      await setupApi.wipe();
      router.push("/setup");
    } catch {
      setWiping(false);
      setWipeError(true);
    }
  };

  const intervalLabel = (m: number) => {
    const u = intervalUnit(m);
    return t(`settings.${u.unit}`, { count: u.count });
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canvas">
      <main className="mx-auto grid w-full max-w-[60rem] content-start gap-6 px-4 pt-4 pb-16 md:px-6 md:pt-6">
        {demo ? <DemoBanner /> : null}
        <header className="grid gap-3">
          <Link
            href="/"
            className="-ml-3 inline-flex h-9 w-fit items-center gap-2 rounded-md px-3 text-base font-medium text-ink-2 transition-colors duration-(--duration-fast) hover:bg-sunken hover:text-ink pointer-coarse:min-h-11"
          >
            <ArrowLeftIcon aria-hidden size={16} weight="bold" />
            {t("settings.backToInbox")}
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.01em] text-ink">{t("settings.title")}</h1>
            <p className="mt-0.5 text-sm text-ink-3">{demo ? t("demo.readOnly") : t("settings.intro")}</p>
          </div>
        </header>

        <div className="grid">
          <Section title={t("settings.thresholdsSection")} help={t("settings.thresholdsSectionHelp")}>
            {hydrated ? (
              <ThresholdPanel
                value={thresholds}
                canSave={!demo}
                disabled={demo}
                defaultOpen
                onChange={() => {}}
                onSave={(th) => api.saveThresholds(th)}
              />
            ) : (
              <div aria-hidden className="h-10 rounded-lg border border-line bg-surface" />
            )}
          </Section>

          <Section title={t("settings.syncSection")} help={t("settings.syncHelp")}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveConfig({ intervalMinutes: interval }, setIntervalState);
              }}
              className="grid grid-cols-[minmax(0,16rem)_auto] items-start gap-3"
            >
              <Field label={t("settings.frequency")}>
                {(p) => (
                  <Select
                    {...p}
                    name="interval"
                    disabled={demo}
                    value={interval}
                    onChange={(e) => {
                      setIntervalValue(Number(e.target.value));
                      setIntervalState("idle");
                    }}
                  >
                    {intervalOptions(interval).map((m) => (
                      <option key={m} value={m}>
                        {intervalLabel(m)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="pt-[1.625rem]">
                <SaveButton state={intervalState} disabled={demo} />
              </div>
            </form>
          </Section>

          <Section title={t("settings.modelSection")} help={t("settings.modelHelp")}>
            <form onSubmit={saveModel} className="grid grid-cols-[minmax(0,16rem)_auto] items-start gap-3" noValidate>
              <Field
                label={t("settings.model")}
                error={modelError ? t("settings.modelInvalid") : undefined}
              >
                {(p) => (
                  <Input
                    {...p}
                    name="model"
                    disabled={demo}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={modelValue}
                    onChange={(e) => {
                      setModelValue(e.target.value);
                      setModelError(false);
                      setModelState("idle");
                    }}
                    className="font-mono"
                  />
                )}
              </Field>
              {/* Aligns with the control, below the label (label 20px + gap 6px). */}
              <div className="pt-[1.625rem]">
                <SaveButton state={modelState} disabled={demo} />
              </div>
            </form>
          </Section>

          <Section title={t("settings.language")} help={t("settings.languageHelp")}>
            <Field label={t("settings.language")} className="w-full max-w-[16rem]" error={langState === "error" ? t("settings.saveFailed") : undefined}>
              {(p) => (
                <Select
                  {...p}
                  name="language"
                  lang={lang}
                  value={lang}
                  aria-busy={langState === "saving" || undefined}
                  onChange={(e) => void changeLanguage(e.target.value as "en" | "es")}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value} lang={l.value}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </Section>

          <Section title={t("settings.account")} help={t("settings.accountHelp")}>
            <div className="grid gap-4">
              {account ? (
                <dl className="grid gap-x-6 gap-y-2 text-base sm:grid-cols-[max-content_minmax(0,1fr)]">
                  <dt className="text-ink-3">{t("setup.email")}</dt>
                  <dd className="min-w-0 truncate text-ink">{account.user}</dd>
                  <dt className="text-ink-3">{t("setup.provider")}</dt>
                  <dd className="text-ink">{account.provider === "imap" ? t("setup.other") : PROVIDER_NAMES[account.provider]}</dd>
                  <dt className="text-ink-3">{t("settings.server")}</dt>
                  <dd className="min-w-0 truncate font-mono text-sm text-ink-2">
                    {account.host}:{account.port}
                  </dd>
                </dl>
              ) : null}
              {secretsKind === "env" ? <p className="text-sm text-ink-3">{t("setup.envMode")}</p> : null}
              <div className="flex flex-wrap items-center gap-3">
                {demo ? (
                  <Button disabled title={t("demo.readOnly")}>
                    {t("settings.reconfigure")}
                  </Button>
                ) : (
                  <Link
                    href="/setup"
                    className="inline-flex h-9 items-center rounded-md border border-line-strong bg-surface px-4 text-base font-medium text-ink transition-colors duration-(--duration-fast) hover:bg-sunken active:translate-y-px pointer-coarse:min-h-11"
                  >
                    {t("settings.reconfigure")}
                  </Link>
                )}
                <p className="text-sm text-ink-3">{t("settings.reconfigureHelp")}</p>
              </div>
            </div>
          </Section>

          <Section title={t("settings.danger")} help={t("settings.dangerHelp")} tone="danger">
            <div className="grid justify-items-start gap-3">
              <Button
                variant="danger"
                disabled={demo}
                loading={wiping}
                icon={<TrashIcon size={16} weight="bold" />}
                onClick={() => void wipe()}
              >
                {t("settings.wipe")}
              </Button>
              {wipeError ? (
                <Banner tone="danger" live="assertive" className="w-full">
                  {t("settings.wipeFailed")}
                </Banner>
              ) : null}
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

/** A settings row: what it is and why on the left, the controls on the right (stacked on phones). */
function Section({ title, help, children, tone }: { title: string; help: string; children: ReactNode; tone?: "danger" }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid gap-x-10 gap-y-4 border-t border-line py-6 first:border-t-0 first:pt-2 md:grid-cols-[16rem_minmax(0,1fr)]"
    >
      <div className="grid content-start gap-1">
        <h2 id={id} className={cn("text-lg font-semibold", tone === "danger" ? "text-danger" : "text-ink")}>
          {title}
        </h2>
        <p className="max-w-[40ch] text-sm text-pretty text-ink-3">{help}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** Save with its outcome next to it: "Saved" (polite) or a retry hint (alert). */
function SaveButton({ state, disabled }: { state: SaveState; disabled: boolean }) {
  const t = useTranslations();
  return (
    <div className="flex items-center gap-3">
      <Button type="submit" disabled={disabled} loading={state === "saving"}>
        {t("settings.save")}
      </Button>
      <span role="status" className="text-sm">
        {state === "saved" ? (
          <span className="inline-flex items-center gap-1 text-success">
            <CheckIcon aria-hidden size={14} weight="bold" />
            {t("settings.saved")}
          </span>
        ) : null}
      </span>
      {state === "error" ? (
        <span role="alert" className="text-sm text-danger">
          {t("settings.saveFailed")}
        </span>
      ) : null}
    </div>
  );
}
