import type { AbstractIntlMessages } from "next-intl";
import type { AppLocale } from "@/i18n/config";
import deAuth from "../../messages/de/auth.json";
import deCommon from "../../messages/de/common.json";
import deDashboard from "../../messages/de/dashboard.json";
import deDiscovery from "../../messages/de/discovery.json";
import deNavigation from "../../messages/de/navigation.json";
import deWorkspace from "../../messages/de/workspace.json";
import enAuth from "../../messages/en/auth.json";
import enCommon from "../../messages/en/common.json";
import enDashboard from "../../messages/en/dashboard.json";
import enDiscovery from "../../messages/en/discovery.json";
import enNavigation from "../../messages/en/navigation.json";
import enWorkspace from "../../messages/en/workspace.json";

const messagesByLocale: Record<AppLocale, AbstractIntlMessages> = {
  de: {
    auth: deAuth,
    common: deCommon,
    dashboard: deDashboard,
    discovery: deDiscovery,
    navigation: deNavigation,
    workspace: deWorkspace,
  },
  en: {
    auth: enAuth,
    common: enCommon,
    dashboard: enDashboard,
    discovery: enDiscovery,
    navigation: enNavigation,
    workspace: enWorkspace,
  },
};

export function getMessages(locale: AppLocale): AbstractIntlMessages {
  return messagesByLocale[locale] ?? messagesByLocale.de;
}
