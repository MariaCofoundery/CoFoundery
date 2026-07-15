import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, resolveLocalePreference, type AppLocale } from "@/i18n/config";

export async function getRequestLocale(): Promise<AppLocale> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE_NAME)?.value ?? null;
  const acceptLanguage = (await headers()).get("accept-language");

  return resolveLocalePreference(cookieLocale, acceptLanguage);
}
