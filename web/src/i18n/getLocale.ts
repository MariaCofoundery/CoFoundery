import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE_NAME, resolveLocalePreference } from "@/i18n/config";

export function getRequestLocale() {
  const cookieLocale = cookies().get(LOCALE_COOKIE_NAME)?.value ?? null;
  const acceptLanguage = headers().get("accept-language");

  return resolveLocalePreference(cookieLocale, acceptLanguage);
}
