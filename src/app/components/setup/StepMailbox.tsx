"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ProviderId } from "@/core/mail/providers";
import { Banner, Button, Field, Input, cn, useFocusFirstInvalid } from "../ui";
import { setupApi } from "./api";
import { FormCard, StepFrame } from "./StepFrame";
import { PROVIDER_IDS, PROVIDER_NAMES } from "./guide";
import { ProviderGuide } from "./ProviderGuide";

/** The non-secret mailbox fields. Kept by the wizard so Back/Continue do not lose them. */
export type MailboxDraft = {
  provider: ProviderId;
  user: string;
  displayName: string;
  host: string;
  port: number;
  secure: boolean;
};

type Result = null | "auth" | "network" | "bad_request";
type Missing = { user?: boolean; host?: boolean; password?: boolean };

export type StepMailboxProps = {
  draft: MailboxDraft;
  onDraftChange: (draft: MailboxDraft) => void;
  /** Folders from the last successful test (null = not connected with these fields). */
  folders: string[] | null;
  onConnected: (folders: string[]) => void;
  envMode: boolean;
  /** .env mode with IMAP_PASSWORD set: the field may stay empty and the server uses it. */
  envHasPassword: boolean;
  footer: ReactNode;
};

/**
 * Provider, the guide to create an app password for it, then the account fields
 * and Test connection (login + folder list). The password is only held in this
 * input and cleared once sent.
 */
export function StepMailbox({ draft, onDraftChange, folders, onConnected, envMode, envHasPassword, footer }: StepMailboxProps) {
  const t = useTranslations();
  const guideId = useId();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [missing, setMissing] = useState<Missing>({});
  const other = draft.provider === "imap";
  const [formRef, focusInvalid] = useFocusFirstInvalid<HTMLFormElement>();

  const set = (patch: Partial<MailboxDraft>) => {
    setResult(null);
    setMissing((m) => ({ ...m, ...Object.fromEntries(Object.keys(patch).map((k) => [k, false])) }));
    onDraftChange({ ...draft, ...patch });
  };

  const test = async (e: FormEvent) => {
    e.preventDefault();
    const miss: Missing = {
      user: draft.user.trim().length < 3,
      host: other && draft.host.trim().length === 0,
      password: password.length === 0 && !envHasPassword,
    };
    setMissing(miss);
    if (miss.user || miss.host || miss.password) {
      focusInvalid();
      return;
    }
    setBusy(true);
    setResult(null);
    const secret = password;
    setPassword(""); // never keep the secret around once it is sent
    const r = await setupApi.testImap({
      provider: draft.provider,
      user: draft.user.trim(),
      displayName: draft.displayName.trim(),
      // Empty in .env mode = use IMAP_PASSWORD on the server.
      ...(secret ? { password: secret } : {}),
      ...(other ? { host: draft.host.trim(), port: draft.port >= 1 && draft.port <= 65535 ? draft.port : 993, secure: draft.secure } : {}),
    });
    setBusy(false);
    if (r.ok) onConnected(r.folders);
    else setResult(r.error);
  };

  return (
    <StepFrame title={t("setup.mailTitle")} intro={t("setup.mailIntro")} footer={footer}>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-base font-semibold text-ink">{t("setup.provider")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDER_IDS.map((p) => (
            <label
              key={p}
              className={cn(
                "flex h-10 cursor-pointer items-center gap-2 rounded-md border bg-surface px-3 text-base text-ink transition-colors duration-(--duration-fast) pointer-coarse:min-h-11",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                draft.provider === p ? "border-ink font-medium shadow-[inset_0_0_0_1px_var(--ink)]" : "border-line-strong hover:bg-sunken",
              )}
            >
              <input
                type="radio"
                name="provider"
                value={p}
                checked={draft.provider === p}
                onChange={() => set(p === "imap" ? { provider: p } : { provider: p, host: "", port: 993, secure: true })}
                className="size-4 shrink-0 focus-visible:outline-none"
              />
              <span className="truncate">{p === "imap" ? t("setup.other") : PROVIDER_NAMES[p]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <ProviderGuide provider={draft.provider} headingId={guideId} />

      <FormCard>
        <form ref={formRef} onSubmit={(e) => void test(e)} className="grid gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("setup.email")} required error={missing.user ? t("setup.emailRequired") : undefined}>
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  value={draft.user}
                  onChange={(e) => set({ user: e.target.value })}
                />
              )}
            </Field>
            <Field label={t("setup.displayName")}>
              {(p) => (
                <Input {...p} name="name" autoComplete="name" value={draft.displayName} onChange={(e) => set({ displayName: e.target.value })} />
              )}
            </Field>
          </div>

          {other ? (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_6.5rem]">
              <Field label={t("setup.host")} required error={missing.host ? t("setup.hostRequired") : undefined}>
                {(p) => (
                  <Input
                    {...p}
                    name="imap-host"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="imap.example.com"
                    value={draft.host}
                    onChange={(e) => set({ host: e.target.value })}
                  />
                )}
              </Field>
              <Field label={t("setup.port")}>
                {(p) => (
                  <Input
                    {...p}
                    type="number"
                    name="imap-port"
                    inputMode="numeric"
                    min={1}
                    max={65535}
                    value={draft.port || ""}
                    onChange={(e) => set({ port: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
                    className="tabular"
                  />
                )}
              </Field>
              <label className="flex items-center gap-2 text-base text-ink sm:col-span-2 pointer-coarse:min-h-11">
                <input type="checkbox" checked={draft.secure} onChange={(e) => set({ secure: e.target.checked })} className="size-4" />
                {t("setup.secure")}
              </label>
            </div>
          ) : null}

          <Field
            label={t("setup.appPassword")}
            required={!envHasPassword}
            hint={envHasPassword ? t("setup.mailEnvNote") : envMode ? t("setup.mailEnvMissing") : undefined}
            error={missing.password ? t("setup.passwordRequired") : result === "auth" ? t("setup.mailAuth") : undefined}
          >
            {(p) => (
              <Input
                {...p}
                type="password"
                name="app-password"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setMissing((m) => ({ ...m, password: false }));
                  if (result === "auth") setResult(null);
                }}
                className="font-mono"
              />
            )}
          </Field>

          <div>
            <Button type="submit" loading={busy}>
              {t("setup.testConnection")}
            </Button>
          </div>
        </form>

        {folders ? (
          <Banner tone="success" live="polite">
            {t("setup.mailOk", { count: folders.length })}
          </Banner>
        ) : result === "network" ? (
          <Banner tone="warning" live="polite">
            {t("setup.network")}
          </Banner>
        ) : result === "bad_request" ? (
          <Banner tone="danger" live="polite">
            {t("setup.badRequest")}
          </Banner>
        ) : null}
        {/* Announces errors shown under the fields (focus also moves to the first one). */}
        <p role="status" className="sr-only">
          {missing.user
            ? t("setup.emailRequired")
            : missing.host
              ? t("setup.hostRequired")
              : missing.password
                ? t("setup.passwordRequired")
                : result === "auth"
                  ? t("setup.mailAuth")
                  : ""}
        </p>
      </FormCard>
    </StepFrame>
  );
}
