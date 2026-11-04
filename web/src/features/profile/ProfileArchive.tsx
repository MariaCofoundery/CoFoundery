import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CURRENT_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { VersionArchiveCard } from "@/features/instruments/v21/VersionArchiveCard";
import { getDashboardVersionState } from "@/features/instruments/v21/dashboardVersionData";
import { ProfileDetails } from "@/features/reporting/ProfileDetails";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

type ReportRunRow = {
  id: string;
  invitation_id: string;
  created_at: string;
  invitations:
    | { label: string | null; invitee_email: string }
    | Array<{ label: string | null; invitee_email: string }>
    | null;
};

/**
 * Fruehere Auswertungen - bis 04.11.2026 eingeklappt am Ende der Startseite.
 *
 * Sie sind Rueckblick, nicht der aktuelle Weg, und gehoeren deshalb ins
 * Archiv des eigenen Profils. Verschwinden duerfen sie nicht: Ueber
 * `VersionArchiveCard` laesst sich eine Freigabe der frueheren Fassung (v2.1)
 * zuruecknehmen - es ist der einzige Ort dafuer.
 *
 * Steht nur da, wenn es etwas gibt.
 */
export async function ProfileArchive({
  client,
  userId,
  hasSubmittedBase,
  hasSubmittedValues,
  locale,
}: {
  client: Client;
  userId: string;
  /** Es gibt einen abgegebenen frueheren Basisbogen (v1). */
  hasSubmittedBase: boolean;
  hasSubmittedValues: boolean;
  locale: string;
}) {
  const [t, runsResult, baseResult, versionState] = await Promise.all([
    getTranslations("dashboard"),
    client
      .from("report_runs")
      .select("id, invitation_id, created_at, invitations:invitation_id(label, invitee_email)")
      .order("created_at", { ascending: false })
      .limit(3),
    client
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("instrument_id", CURRENT_INSTRUMENT_ID)
      .eq("module", "base")
      .limit(1),
    getDashboardVersionState(userId),
  ]);
  const reports = runsResult.error ? [] : ((runsResult.data ?? []) as ReportRunRow[]);
  const knowsPrevious = !baseResult.error && (baseResult.data ?? []).length > 0;
  if (reports.length === 0 && !hasSubmittedBase && !knowsPrevious && !versionState.next.started) return null;

  return (
    <ProfileDetails summary={t("legacy.title")} hint={null}>
      <p className="max-w-3xl text-sm leading-6 text-slate-500">{t("legacy.description")}</p>
      <div className="mt-4 space-y-3 text-sm">
        {reports.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("team.reports")}</h3>
            {reports.map((run) => {
              const invitation = Array.isArray(run.invitations) ? run.invitations[0] ?? null : run.invitations;
              return (
                <div key={run.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{invitation?.label?.trim() || invitation?.invitee_email || run.invitation_id}</p>
                    <p className="text-xs text-slate-500">
                      {t("team.created", { date: new Date(run.created_at).toLocaleDateString(locale) })}
                    </p>
                  </div>
                  <Link href={`/report/${run.invitation_id}`} className="inline-flex min-h-10 items-center font-semibold text-violet-800 hover:underline">
                    {t("actions.open")}
                  </Link>
                </div>
              );
            })}
          </div>
        ) : null}
        {hasSubmittedBase && <Link href="/me/report" className="inline-block underline">{t("legacy.report")}</Link>}
        {hasSubmittedBase && hasSubmittedValues && <p className="text-slate-600">{t("legacy.values")}</p>}
        {(knowsPrevious || versionState.next.started) && (
          <div>
            <Link href="/founder-alignment/versionen" className="inline-block underline">{t("legacy.answers")}</Link>
            {versionState.next.started && (
              <VersionArchiveCard
                decision={versionState.decision}
                previous={versionState.previous}
                next={versionState.next}
                connectionsNext={versionState.connectionsNext}
                archived={versionState.archived}
              />
            )}
          </div>
        )}
      </div>
    </ProfileDetails>
  );
}
