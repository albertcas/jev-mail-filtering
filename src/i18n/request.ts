import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

const LOCALES = ["en", "es"] as const;
type Locale = (typeof LOCALES)[number];

function pick(value: string | undefined | null): Locale | null {
  const v = value?.slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : null;
}

export default getRequestConfig(async () => {
  const cookieLocale = pick((await cookies()).get("locale")?.value);
  const headerLocale = pick((await headers()).get("accept-language"));
  const locale = cookieLocale ?? headerLocale ?? "en";
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
