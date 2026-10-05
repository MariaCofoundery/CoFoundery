import { redirect } from "next/navigation";
import { CURRENT_WORKSTYLE_REPORT_HREF } from "@/features/instruments/workstyle/current";
import { getTranslations } from "next-intl/server";
import { getRequestLocale } from "@/i18n/getLocale";
import { getRequestUser } from "@/lib/supabase/server";
import { getLatestSelfAlignmentReport } from "@/features/reporting/actions";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import { ResearchPageTracker } from "@/features/research/ResearchPageTracker";
import { IndividualReportPageContent } from "@/features/reporting/IndividualReportPageContent";
import { InstrumentNote } from "@/features/reporting/InstrumentNote";
import {
  buildInvitationDashboardHref,
  resolveActiveInvitationIdForCurrentUser,
} from "@/features/onboarding/invitationFlow";

export default async function MeReportPage() {
  const locale = await getRequestLocale();
  const t = await getTranslations("report.common");
  const tNote = await getTranslations("report.instrumentNote");
  const {
    data: { user },
  } = await getRequestUser();

  if (!user) {
    redirect("/login?next=/me/report");
  }

  const invitationId = await resolveActiveInvitationIdForCurrentUser();
  const dashboardHref = invitationId ? buildInvitationDashboardHref(invitationId) : "/dashboard";
  const report = await getLatestSelfAlignmentReport({ locale });

  // Phase 10 - Cutover: Ohne frueheren Bericht gibt es hier nichts Historisches
  // zu lesen - weiter zum aktuellen Bericht (mit "Wie du arbeitest ausfüllen").
  if (!report) redirect(CURRENT_WORKSTYLE_REPORT_HREF);

  return (
    <>
      <ResearchPageTracker eventName="self_report_viewed" module="base" />
      <IndividualReportPageContent
        report={report}
        afterReport={
          <InstrumentNote
            copy={{
              title: tNote("title"),
              selfReport: tNote("selfReport"),
              notATest: tNote("notATest"),
              snapshot: tNote("snapshot"),
              purpose: tNote("purpose"),
              dated: report.createdAt
                ? tNote("dated", {
                    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                      new Date(report.createdAt)
                    ),
                  })
                : null,
            }}
          />
        }
        toolbar={
          <div className="flex items-center justify-between">
            <a
              href={dashboardHref}
              className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              {t("backToDashboard")}
            </a>
            <PrintReportButton eventName="self_report_print_clicked" module="base" />
          </div>
        }
      />
    </>
  );
}
