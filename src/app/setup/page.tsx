import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MAX_MESSAGES_PER_SYNC } from "@/core/config";
import { getContext } from "@/server/context";
import { Wizard } from "../components/setup/Wizard";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: `${t("setup.welcomeTitle")} · ${t("app.name")}` };
}

export default async function SetupPage() {
  const c = await getContext();
  // The public demo cannot be configured: everything there is read-only.
  if (c.demo) redirect("/");
  const config = c.repo.getConfig();
  // Only non-secret fields reach the client; secrets never leave the server.
  return (
    <Wizard
      configured={config !== null}
      initialMailbox={{
        provider: config?.provider ?? "gmail",
        user: config?.user ?? "",
        displayName: config?.displayName ?? "",
        host: config?.provider === "imap" ? config.host : "",
        port: config?.provider === "imap" ? config.port : 993,
        secure: config?.provider === "imap" ? config.secure : true,
      }}
      initialScope={{ folder: config?.folder ?? null, days: config?.days ?? 14, intervalMinutes: config?.intervalMinutes ?? 15 }}
      demoUrl={process.env.NEXT_PUBLIC_DEMO_URL || null}
      maxPerSync={MAX_MESSAGES_PER_SYNC}
    />
  );
}
