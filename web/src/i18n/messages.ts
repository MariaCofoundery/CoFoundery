import type { AbstractIntlMessages } from "next-intl";
import type { AppLocale } from "@/i18n/config";
import deCommon from "../../messages/de/common.json";
import deDiscovery from "../../messages/de/discovery.json";
import deNavigation from "../../messages/de/navigation.json";
import enCommon from "../../messages/en/common.json";
import enDiscovery from "../../messages/en/discovery.json";
import enNavigation from "../../messages/en/navigation.json";

const messagesByLocale: Record<AppLocale, AbstractIntlMessages> = {
  de: {
    common: deCommon,
    discovery: deDiscovery,
    navigation: deNavigation,
  },
  en: {
    common: enCommon,
    discovery: enDiscovery,
    navigation: enNavigation,
  },
};

export function getMessages(locale: AppLocale): AbstractIntlMessages {
  return messagesByLocale[locale] ?? messagesByLocale.de;
}
