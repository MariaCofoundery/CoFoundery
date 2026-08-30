import type { AbstractIntlMessages } from "next-intl";
import type { AppLocale } from "@/i18n/config";
import deAssessment from "../../messages/de/assessment.json";
import deAdvisor from "../../messages/de/advisor.json";
import deAuth from "../../messages/de/auth.json";
import deCommon from "../../messages/de/common.json";
import deCollaborationLab from "../../messages/de/collaborationLab.json";
import deDashboard from "../../messages/de/dashboard.json";
import deDiscovery from "../../messages/de/discovery.json";
import deFeedback from "../../messages/de/feedback.json";
import deFounderLibrary from "../../messages/de/founderLibrary.json";
import deFounderInTheWild from "../../messages/de/founderInTheWild.json";
import deInvite from "../../messages/de/invite.json";
import deNavigation from "../../messages/de/navigation.json";
import deProfile from "../../messages/de/profile.json";
import deReport from "../../messages/de/report.json";
import deResearchConsent from "../../messages/de/researchConsent.json";
import deTeams from "../../messages/de/teams.json";
import deWorkspace from "../../messages/de/workspace.json";
import deWorkbook from "../../messages/de/workbook.json";
import enAssessment from "../../messages/en/assessment.json";
import enAdvisor from "../../messages/en/advisor.json";
import enAuth from "../../messages/en/auth.json";
import enCommon from "../../messages/en/common.json";
import enCollaborationLab from "../../messages/en/collaborationLab.json";
import enDashboard from "../../messages/en/dashboard.json";
import enDiscovery from "../../messages/en/discovery.json";
import enFeedback from "../../messages/en/feedback.json";
import enFounderLibrary from "../../messages/en/founderLibrary.json";
import enFounderInTheWild from "../../messages/en/founderInTheWild.json";
import enInvite from "../../messages/en/invite.json";
import enNavigation from "../../messages/en/navigation.json";
import enProfile from "../../messages/en/profile.json";
import enReport from "../../messages/en/report.json";
import enResearchConsent from "../../messages/en/researchConsent.json";
import enTeams from "../../messages/en/teams.json";
import enWorkspace from "../../messages/en/workspace.json";
import enWorkbook from "../../messages/en/workbook.json";

const messagesByLocale: Record<AppLocale, AbstractIntlMessages> = {
  de: {
    assessment: deAssessment,
    advisor: deAdvisor,
    auth: deAuth,
    common: deCommon,
    collaborationLab: deCollaborationLab,
    dashboard: deDashboard,
    discovery: deDiscovery,
    feedback: deFeedback,
    founderLibrary: deFounderLibrary,
    founderInTheWild: deFounderInTheWild,
    invite: deInvite,
    navigation: deNavigation,
    profile: deProfile,
    report: deReport,
    researchConsent: deResearchConsent,
    teams: deTeams,
    workspace: deWorkspace,
    workbook: deWorkbook as unknown as AbstractIntlMessages,
  },
  en: {
    assessment: enAssessment,
    advisor: enAdvisor,
    auth: enAuth,
    common: enCommon,
    collaborationLab: enCollaborationLab,
    dashboard: enDashboard,
    discovery: enDiscovery,
    feedback: enFeedback,
    founderLibrary: enFounderLibrary,
    founderInTheWild: enFounderInTheWild,
    invite: enInvite,
    navigation: enNavigation,
    profile: enProfile,
    report: enReport,
    researchConsent: enResearchConsent,
    teams: enTeams,
    workspace: enWorkspace,
    workbook: enWorkbook as unknown as AbstractIntlMessages,
  },
};

export function getMessages(locale: AppLocale): AbstractIntlMessages {
  return messagesByLocale[locale] ?? messagesByLocale.de;
}
