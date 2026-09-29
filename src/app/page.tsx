import { redirect } from "next/navigation";
import { getContext } from "@/server/context";
import { Dashboard } from "./components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const c = await getContext();
  const config = c.demo ? null : c.repo.getConfig();
  if (!c.demo && !config) redirect("/setup");
  // "Open in Gmail" only makes sense for a Gmail account (rfc822msgid: search).
  const gmail = config?.provider === "gmail" || config?.host === "imap.gmail.com";
  return <Dashboard demo={c.demo} gmail={gmail} />;
}
