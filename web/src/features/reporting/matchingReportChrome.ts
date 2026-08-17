import deReport from "../../../messages/de/report.json";
import enReport from "../../../messages/en/report.json";
import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { normalizeLocale, type AppLocale } from "@/i18n/config";
import { normalizeGermanText } from "@/lib/normalizeGermanText";

const reportViewMessages = {
  de: deReport.view,
  en: enReport.view,
} as const;

export function normalizeMatchingReportText(
  text: string,
  locale?: AppLocale | null
) {
  return normalizeLocale(locale) === "de" ? normalizeGermanText(text) : text;
}

export function formatMatchingReportParticipantContext({
  participantAName,
  participantBName,
  teamContext,
  locale,
}: {
  participantAName: string;
  participantBName: string;
  teamContext: TeamContext;
  locale?: AppLocale | null;
}) {
  const messages = reportViewMessages[normalizeLocale(locale)];
  const teamContextLabel =
    teamContext === "existing_team"
      ? messages.teamContexts.existingTeam
      : messages.teamContexts.preFounder;
  const values = {
    participantA: participantAName,
    participantB: participantBName,
    teamContext: teamContextLabel,
  };

  return messages.participantContext.replace(
    /\{(participantA|participantB|teamContext)\}/gu,
    (_, key: keyof typeof values) => values[key]
  );
}
