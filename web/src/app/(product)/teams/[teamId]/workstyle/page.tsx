import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import {
  getProductTeam,
  getProductSnapshot,
} from "@/features/reporting/workstyle/data";
import { saveProductSnapshot } from "@/features/reporting/workstyle/actions";
import { TeamWorkstyleReport } from "@/features/reporting/workstyle/TeamWorkstyleReport";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import type { ProductTeam } from "@/features/reporting/workstyle/model";
import { getLocale, getTranslations } from "next-intl/server";
import { parseTeamReadiness } from "@/features/reporting/workstyle/teamReadiness";
import { TeamReadinessPanel } from "@/features/reporting/workstyle/TeamReadinessPanel";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Euer Zusammenspiel",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{ snapshot?: string; error?: string; ansicht?: string; teamfreigabe?: string }>;
}) {
  const { teamId } = await params;
  const query = await searchParams;
  const {
    data: { user },
  } = await getRequestUser();
  if (!user)
    redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/workstyle`)}`);
  const client = await createClient();
  const current = await getProductTeam(client, teamId);
  const { data: membership } = await client.from("founder_team_members").select("team_id").eq("team_id", teamId).eq("user_id", user.id).maybeSingle();
  if (!current) notFound();
  // Fuer Mitglieder konkret, was fuer den gemeinsamen Bericht fehlt - je Person
  // nur "geteilt" / "noch nicht geteilt", keine Antworten.
  const shareReadiness =
    current === "not_ready" && membership
      ? parseTeamReadiness((await client.rpc("get_workstyle_team_share_readiness", { p_team_id: teamId })).data)
      : null;
  const snapshot = query.snapshot
    ? await getProductSnapshot<ProductTeam>(client, query.snapshot)
    : null;
  if (query.snapshot && (!snapshot || snapshot.input.team_id !== teamId))
    notFound();
  const team = snapshot?.input ?? current;
  const [t, locale, teamLabel] = await Promise.all([
    getTranslations("report.workstyle"),
    getLocale(),
    membership ? getTeamLabel(client, teamId) : Promise.resolve(null),
  ]);
  // Ausfuehrliche Fassung: alle Einzelantworten aufgeklappt und im Druck enthalten.
  const full = query.ansicht === "ausfuehrlich";
  const viewHref = (nextFull: boolean) => {
    const params = new URLSearchParams();
    if (query.snapshot) params.set("snapshot", query.snapshot);
    if (nextFull) params.set("ansicht", "ausfuehrlich");
    const qs = params.toString();
    return `/teams/${teamId}/workstyle${qs ? `?${qs}` : ""}`;
  };
  const fullLink = (
    <Link className="inline-flex min-h-11 items-center text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950" href={viewHref(!full)}>
      {full ? t("compactVersion") : t("fullVersion")}
    </Link>
  );
  const snapshotForm = !snapshot ? (
    <form action={saveProductSnapshot.bind(null, teamId)}>
      <button className="min-h-11 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50">
        {t("snapshot")}
      </button>
    </form>
  ) : null;
  // Phase 11.7B.1: Am Rechner alle Aktionen nebeneinander. Auf dem Telefon nur
  // die Hauptaktion (PDF) sichtbar, der Rest ruhig hinter "Mehr" - statt drei
  // umbrechender Zeilen vor dem Bericht.
  const actions =
    team !== "not_ready" ? (
      <>
        <div className="hidden flex-wrap items-center gap-3 sm:flex">
          <PrintReportButton label={t("print")} />
          {fullLink}
          {snapshotForm}
        </div>
        <div className="team-actions-mobile flex items-center gap-2 sm:hidden">
          <PrintReportButton label={t("print")} />
          <details className="relative">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 [&::-webkit-details-marker]:hidden">
              {t("moreActions")}
            </summary>
            <div className="absolute right-0 z-20 mt-2 grid w-64 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
              {fullLink}
              {snapshotForm}
            </div>
          </details>
        </div>
      </>
    ) : null;
  const notes = (
    <>
      {locale !== "de" && (
        <p className="mt-3 text-sm text-slate-600" lang={locale}>
          {t("germanOnly")}
        </p>
      )}
      {full && team !== "not_ready" && <p className="mt-3 text-sm text-slate-500">{t("fullVersionNote")}</p>}
      {query.error && <p role="alert">{t("snapshotError")}</p>}
      {snapshot && (
        <p className="mt-3 text-sm text-slate-500">
          {t("snapshotSaved", {
            date: new Date(snapshot.generated_at).toLocaleString("de-DE"),
          })}{" "}
          · {snapshot.schema_version}
        </p>
      )}
    </>
  );
  return (
    <main className="ws-report mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
      {membership ? (
        <TeamPageHeader teamId={teamId} active="workstyle" title={t("teamTitle")} teamLabel={teamLabel}>
          {actions}
        </TeamPageHeader>
      ) : (
        <header>
          {/* Advisors erreichen den Bericht ueber ihre eigene Freigabe; keine Teamnavigation. */}
          <Link href="/advisor" className="ws-no-print inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline">
            ← {t("backToAdvisor")}
          </Link>
          <p className="mt-1 text-sm font-medium text-slate-500">
            {team !== "not_ready" ? (team.team_name ?? t("teamFallbackName")) : t("teamFallbackName")}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">{t("teamTitle")}</h1>
          {actions ? <div className="ws-no-print mt-4 flex flex-wrap items-center gap-3">{actions}</div> : null}
        </header>
      )}
      {notes}
      <div className="mt-6">
        {team === "not_ready" && shareReadiness && shareReadiness.status !== "unavailable" ? (
          <TeamReadinessPanel readiness={shareReadiness} teamId={teamId} status={query.teamfreigabe ?? null} />
        ) : team === "not_ready" && !membership ? (
          // Advisors sehen den gemeinsamen Bericht nicht frueher als das Team -
          // und hier keine Details darueber, wer was geteilt hat.
          <section aria-labelledby="advisor-not-ready-title" className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
            <h2 id="advisor-not-ready-title" className="text-xl font-semibold">{t("advisorNotReady.title")}</h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-700">{t("advisorNotReady.body")}</p>
          </section>
        ) : team === "not_ready" ? (
          <section>
            <h2 className="text-xl font-semibold">{t("notReadyTitle")}</h2>
            <p className="mt-3 leading-7">{t("notReadyBody")}</p>
            <Link href="/me/profile/workstyle" className="mt-4 inline-block underline">
              {t("notReadyCta")}
            </Link>
          </section>
        ) : (
          <TeamWorkstyleReport team={team} canDiscuss={Boolean(membership)} full={full} />
        )}
      </div>
    </main>
  );
}
