import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getContext } from "@/server/context";
import { SettingsForm } from "../components/settings/SettingsForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t("settings.title")} · ${t("app.name")}` };
}

export default async function SettingsPage() {
  const c = await getContext();
  const config = c.demo ? null : c.repo.getConfig();
  if (!c.demo && !config) redirect("/setup");
  const locale = await getLocale();
  // Only non-secret fields are sent to the client.
  return (
    <SettingsForm
      demo={c.demo}
      locale={locale === "es" ? "es" : "en"}
      secretsKind={c.secrets.kind}
      thresholds={c.repo.getThresholds()}
      account={
        config
          ? { provider: config.provider, user: config.user, displayName: config.displayName, host: config.host, port: config.port }
          : null
      }
      intervalMinutes={config?.intervalMinutes ?? 15}
      model={config?.model ?? "jev-latest"}
    />
  );
}
