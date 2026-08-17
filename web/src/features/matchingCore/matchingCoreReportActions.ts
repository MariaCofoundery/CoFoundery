"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createMatchingReportRunFromSession } from "@/features/matchingCore/matchingCoreReportData";
import type {
  MatchingReportCreationResult,
  MatchingReportErrorReason,
} from "@/features/matchingCore/matchingSessionReportFeedback";
import { getRequestLocale } from "@/i18n/getLocale";

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function createReportErrorReason(
  error: unknown
): MatchingReportErrorReason {
  if (!(error instanceof Error)) {
    return "report_creation_failed";
  }

  if (error.message === "matching_report_session_unavailable") {
    return "report_unavailable";
  }
  if (error.message === "matching_report_session_not_ready") {
    return "session_not_ready";
  }
  if (error.message === "matching_report_required_inputs_missing") {
    return "required_answers_missing";
  }
  if (error.message === "matching_report_missing_service_role") {
    return "local_report_unavailable";
  }
  if (error.message === "matching_report_values_not_supported") {
    return "values_report_not_supported";
  }

  return "report_creation_failed";
}

export async function createMatchingReportRunFromSessionAction(
  matchingSessionId: string
): Promise<MatchingReportCreationResult> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "not_authenticated",
    };
  }

  try {
    const report = await createMatchingReportRunFromSession({
      matchingSessionId,
      userId,
      locale: await getRequestLocale(),
    });
    const reportHref = `/matching/${report.reportRun.matchingSessionId}/report`;

    revalidatePath(reportHref);
    revalidatePath("/discovery/intros");
    return {
      ok: true,
      reason: "matching_report_created",
      reportHref,
    };
  } catch (error) {
    return {
      ok: false,
      reason: createReportErrorReason(error),
    };
  }
}
