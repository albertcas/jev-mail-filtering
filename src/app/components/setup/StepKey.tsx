"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/ssr";
import type { Status } from "../dashboard/api";
import { Banner, Button, Field, Input, useFocusFirstInvalid } from "../ui";
import { setupApi } from "./api";
import { ExternalLink } from "./ExternalLink";
import { FormCard, StepFrame } from "./StepFrame";
import { Steps } from "./Steps";
import { TYPESAFE_KEYS_URL } from "./guide";

type Result = null | "ok" | "empty" | "invalid_key" | "network";

export type StepKeyProps = {
  status: Status;
  onKeyReady: (ready: boolean) => void;
  /** Re-read /api/status (env mode: after the user edits .env and restarts). */
  onRecheck: () => Promise<void>;
  footer: ReactNode;
};

/**
 * TypeSafe API key: where to create it, then Verify (free: lists models).
 * The key lives only in this input until it is sent, then the field is cleared.
 * In .env mode secrets are read-only: a key can be checked but not saved here.
 */
export function StepKey({ status, onKeyReady, onRecheck, footer }: StepKeyProps) {
  const t = useTranslations();
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const howToId = useId();
  const [formRef, focusInvalid] = useFocusFirstInvalid<HTMLFormElement>();
  const envMode = status.secretsKind === "env";
  const envHasKey = envMode && status.hasApiKey;

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    const value = apiKey.trim();
    if (!value) {
      if (status.hasApiKey) {
        // Nothing to replace the stored key with: keep it and let the user continue.
        setResult(null);
        if (!envMode) onKeyReady(true);
        return;
      }
      setResult("empty");
      focusInvalid();
      return;
    }
    setBusy(true);
    setResult(null);
    setApiKey(""); // never keep the secret around once it is sent
    const r = await setupApi.verifyKey(value);
    setBusy(false);
    setResult(r.ok ? "ok" : r.error);
    // Only a stored key lets the wizard continue; in .env mode nothing is stored.
    if (!envMode) onKeyReady(r.ok || status.hasApiKey);
  };

  const recheck = async () => {
    setRechecking(true);
    await onRecheck();
    setRechecking(false);
  };

  const fieldError = result === "empty" ? t("setup.keyRequired") : result === "invalid_key" ? t("setup.keyInvalid") : undefined;

  return (
    <StepFrame title={t("setup.keyTitle")} intro={t("setup.keyIntro")} footer={footer}>
      {envMode ? (
        <Banner
          tone="info"
          action={
            envHasKey ? null : (
              <Button size="sm" loading={rechecking} icon={<ArrowsClockwiseIcon size={14} weight="bold" />} onClick={() => void recheck()}>
                {t("setup.recheck")}
              </Button>
            )
          }
        >
          {t("setup.envMode")} {envHasKey ? null : t("setup.keyEnvMissing")}
        </Banner>
      ) : null}

      {envHasKey ? null : (
        <>
          <section aria-labelledby={howToId} className="grid gap-4">
            <h2 id={howToId} className="text-base font-semibold text-ink">
              {t("setup.keyHowTo")}
            </h2>
            <Steps items={[t("setup.keyStep1"), t("setup.keyStep2"), t("setup.keyStep3")]} />
            <div className="pl-9">
              <ExternalLink href={TYPESAFE_KEYS_URL} variant="button" newTabLabel={t("setup.newTab")}>
                {t("setup.keyOpen")}
              </ExternalLink>
            </div>
          </section>

          <FormCard>
            <form ref={formRef} onSubmit={(e) => void verify(e)} className="grid gap-4" noValidate>
              <Field
                label={t("setup.keyLabel")}
                hint={!envMode && status.hasApiKey ? t("setup.keySaved") : status.secretsKind === "keyring" ? t("setup.keyStored") : undefined}
                error={fieldError}
                required={!status.hasApiKey}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="password"
                    name="typesafe-api-key"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      if (result !== null && result !== "ok") setResult(null);
                    }}
                    className="font-mono"
                  />
                )}
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" loading={busy}>
                  {t("setup.verify")}
                </Button>
              </div>
            </form>
            {result === "ok" ? (
              <Banner tone="success" live="polite">
                {envMode ? t("setup.keyEnvOk") : t("setup.keyOk")}
              </Banner>
            ) : result === "network" ? (
              <Banner tone="warning" live="polite">
                {t("setup.network")}
              </Banner>
            ) : null}
            {/* Announces the errors shown under the field. */}
            <p role="status" className="sr-only">
              {fieldError ?? ""}
            </p>
          </FormCard>
        </>
      )}
    </StepFrame>
  );
}
