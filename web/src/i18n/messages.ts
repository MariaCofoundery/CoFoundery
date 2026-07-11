import type { AbstractIntlMessages } from "next-intl";
import type { AppLocale } from "@/i18n/config";
import deAdvisor from "../../messages/de/advisor.json";
import deAuth from "../../messages/de/auth.json";
import deCommon from "../../messages/de/common.json";
import deDashboard from "../../messages/de/dashboard.json";
import deDiscovery from "../../messages/de/discovery.json";
import deFeedback from "../../messages/de/feedback.json";
import deNavigation from "../../messages/de/navigation.json";
import deReport from "../../messages/de/report.json";
import deWorkspace from "../../messages/de/workspace.json";
import deWorkbook from "../../messages/de/workbook.json";
import enAdvisor from "../../messages/en/advisor.json";
import enAuth from "../../messages/en/auth.json";
import enCommon from "../../messages/en/common.json";
import enDashboard from "../../messages/en/dashboard.json";
import enDiscovery from "../../messages/en/discovery.json";
import enFeedback from "../../messages/en/feedback.json";
import enNavigation from "../../messages/en/navigation.json";
import enReport from "../../messages/en/report.json";
import enWorkspace from "../../messages/en/workspace.json";
import enWorkbook from "../../messages/en/workbook.json";

const messagesByLocale: Record<AppLocale, AbstractIntlMessages> = {
  de: {
    advisor: deAdvisor,
    auth: deAuth,
    common: deCommon,
    dashboard: deDashboard,
    discovery: deDiscovery,
    feedback: deFeedback,
    navigation: deNavigation,
    report: deReport,
    workspace: deWorkspace,
    workbook: deWorkbook as unknown as AbstractIntlMessages,
  },
  en: {
    advisor: enAdvisor,
    auth: enAuth,
    common: enCommon,
    dashboard: enDashboard,
    discovery: enDiscovery,
    feedback: enFeedback,
    navigation: enNavigation,
    report: enReport,
    workspace: enWorkspace,
    workbook: enWorkbook as unknown as AbstractIntlMessages,
  },
};

export function getMessages(locale: AppLocale): AbstractIntlMessages {
  return messagesByLocale[locale] ?? messagesByLocale.de;
}
