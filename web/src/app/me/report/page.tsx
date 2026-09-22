import { redirect } from "next/navigation";
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
  buildInvitationQuestionnaireHref,
  resolveActiveInvitationIdForCurrentUser,
} from "@/features/onboarding/invitationFlow";

export default async function MeReportPage() {
  const locale = await getRequestLocale();
  const t = await getTranslations("report.common");
  const tIndividual = await getTranslations("report.individual");
  const tNote = await getTranslations("report.instrumentNote");
  const {
    data: { user },
  } = await getRequestUser();

  if (!user) {
    redirect("/login?next=/me/report");
  }

  const invitationId = await resolveActiveInvitationIdForCurrentUser();
  const dashboardHref = invitationId ? buildInvitationDashboardHref(invitationId) : "/dashboard";
  const baseHref = invitationId ? buildInvitationQuestionnaireHref(invitationId, "base") : "/me/base";
  const report = await getLatestSelfAlignmentReport({ locale });

  if (!report) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h1 className="text-2xl font-semibold text-slate-900">{tIndividual("missing.title")}</h1>
          <p className="mt-3 text-sm text-slate-700">
            {tIndividual("missing.description")}
          </p>
          <a
            href={baseHref}
            className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {tIndividual("missing.cta")}
          </a>
        </section>
      </main>
    );
  }

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
