"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createMatchingReportRunFromSession } from "@/features/matchingCore/matchingCoreReportData";
import { getRequestLocale } from "@/i18n/getLocale";

export type MatchingReportActionState = {
  ok: boolean;
  message?: string;
  reportHref?: string;
};

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function createReportErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Der Dynamik-Report konnte gerade nicht erstellt werden.";
  }

  if (error.message === "matching_report_session_unavailable") {
    return "Dieser Matching-Report ist aktuell nicht verfügbar.";
  }
  if (error.message === "matching_report_session_not_ready") {
    return "Die Matching-Session ist noch nicht bereit für den Dynamik-Report.";
  }
  if (error.message === "matching_report_required_inputs_missing") {
    return "Für den Dynamik-Report fehlen noch erforderliche Basis-Antworten.";
  }
  if (error.message === "matching_report_missing_service_role") {
    return "Der Dynamik-Report kann lokal gerade nicht erstellt werden.";
  }
  if (error.message === "matching_report_values_not_supported") {
    return "Session-basierte Werte-Reports sind noch nicht aktiviert.";
  }

  return "Der Dynamik-Report konnte gerade nicht erstellt werden.";
}

export async function createMatchingReportRunFromSessionAction(
  matchingSessionId: string
): Promise<MatchingReportActionState> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      message: "Bitte melde dich an, um den Dynamik-Report zu erstellen.",
    };
  }

  try {
    const report = await createMatchingReportRunFromSession({
      matchingSessionId,
      userId,
      locale: getRequestLocale(),
    });
    const reportHref = `/matching/${report.reportRun.matchingSessionId}/report`;

    revalidatePath(reportHref);
    revalidatePath("/discovery/intros");
    return {
      ok: true,
      message: "Dynamik-Report erstellt.",
      reportHref,
    };
  } catch (error) {
    return {
      ok: false,
      message: createReportErrorMessage(error),
    };
  }
}
