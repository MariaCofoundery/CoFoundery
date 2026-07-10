import { getRequestConfig } from "next-intl/server";
import { getRequestLocale } from "@/i18n/getLocale";
import { getMessages } from "@/i18n/messages";

export default getRequestConfig(async () => {
  const locale = getRequestLocale();

  return {
    locale,
    messages: getMessages(locale),
    timeZone: "Europe/Berlin",
  };
});
