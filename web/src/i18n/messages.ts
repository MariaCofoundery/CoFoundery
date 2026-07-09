import type { AbstractIntlMessages } from "next-intl";
import type { AppLocale } from "@/i18n/config";
import deCommon from "../../messages/de/common.json";
import deNavigation from "../../messages/de/navigation.json";
import enCommon from "../../messages/en/common.json";
import enNavigation from "../../messages/en/navigation.json";

const messagesByLocale: Record<AppLocale, AbstractIntlMessages> = {
  de: {
    common: deCommon,
    navigation: deNavigation,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
  },
};

export function getMessages(locale: AppLocale): AbstractIntlMessages {
  return messagesByLocale[locale] ?? messagesByLocale.de;
}
