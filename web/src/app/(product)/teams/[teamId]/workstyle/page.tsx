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
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";
import { parseTeamReadiness } from "@/features/reporting/workstyle/teamReadiness";
import { TeamReadinessPanel } from "@/features/reporting/workstyle/TeamReadinessPanel";
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
  searchParams: Promise<{ snapshot?: string; error?: string; ansicht?: string }>;
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
  const { data: readiness } = current === "not_ready" && membership ? await client.rpc("get_workstyle_product_team_status", { p_team_id: teamId }) : { data: "available" };
  // Phase 11.5: Fuer Mitglieder konkret, was fuer den gemeinsamen Bericht fehlt -
  // nur zwei Wahrheitswerte je Person, keine Antworten.
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
  const [navigationT, t, locale] = await Promise.all([
    getTranslations("teams.teamNavigation"),
    getTranslations("report.workstyle"),
    getLocale(),
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
  return (
    <main className="ws-report mx-auto max-w-6xl px-5 py-10">
      <div className="ws-no-print mb-5">
        <Link href={membership ? `/teams/${teamId}` : "/advisor"} className="underline">
          {membership ? t("backToTeam") : t("backToAdvisor")}
        </Link>
        {/* Phase 9.4B: Die Teamnavigation auch hier - nur fuer Mitglieder
            (Advisor erreichen den Report ueber ihre eigene Freigabe) und nie
            im Druck. */}
        {membership ? (
          <FounderTeamNavigation
            teamId={teamId}
            active="workstyle"
            labels={{
              ariaLabel: navigationT("ariaLabel"),
              overview: navigationT("overview"),
              workstyle: navigationT("workstyle"),
              roles: navigationT("roles"),
              setup: navigationT("setup"),
              library: navigationT("library"),
              alignment: navigationT("alignment"),
            }}
          />
        ) : null}
      </div>
      <header className="mb-10">
        <p className="text-sm text-slate-500">
          {team !== "not_ready"
            ? (team.team_name ?? t("teamFallbackName"))
            : t("teamFallbackName")}
        </p>
        <h1 className="mt-2 text-4xl font-semibold">{t("teamTitle")}</h1>
        {locale !== "de" && (
          <p className="mt-3 text-sm text-slate-600" lang={locale}>
            {t("germanOnly")}
          </p>
        )}
        <div className="ws-no-print mt-5 flex flex-wrap items-center gap-4">
          <PrintReportButton label={t("print")} />
          {team !== "not_ready" && (
            <>
              <Link className="text-sm underline" href={viewHref(!full)}>
                {full ? t("compactVersion") : t("fullVersion")}
              </Link>
              {!snapshot && (
                <form action={saveProductSnapshot.bind(null, teamId)}>
                  <button className="min-h-11 rounded-lg border px-4">
                    {t("snapshot")}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
        {full && team !== "not_ready" && (
          <p className="mt-3 text-sm text-slate-500">{t("fullVersionNote")}</p>
        )}
        {query.error && <p role="alert">{t("snapshotError")}</p>}
        {snapshot && (
          <p className="mt-3 text-sm text-slate-500">
            {t("snapshotSaved", {
              date: new Date(snapshot.generated_at).toLocaleString("de-DE"),
            })}{" "}
            · {snapshot.schema_version}
          </p>
        )}
      </header>
      {team === "not_ready" && shareReadiness && shareReadiness.status !== "unavailable" ? (
        <TeamReadinessPanel readiness={shareReadiness} />
      ) : team === "not_ready" && !membership ? (
        // Phase 11.6: Advisors sehen den gemeinsamen Bericht nicht frueher als das
        // Team - und hier keine Details darueber, wer was freigegeben hat.
        <section aria-labelledby="advisor-not-ready-title" className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 id="advisor-not-ready-title" className="text-xl font-semibold">{t("advisorNotReady.title")}</h2>
          <p className="mt-3 max-w-2xl leading-7 text-slate-700">{t("advisorNotReady.body")}</p>
        </section>
      ) : team === "not_ready" ? (
        <section>
          <h2 className="text-xl font-semibold">
            {readiness === "share_missing" ? t("shareMissingTitle") : t("notReadyTitle")}
          </h2>
          <p className="mt-3 leading-7">{t("notReadyBody")}</p>
          <Link
            href="/me/profile/workstyle"
            className="mt-4 inline-block underline"
          >
            {t("notReadyCta")}
          </Link>
        </section>
      ) : (
        <TeamWorkstyleReport team={team} canDiscuss={Boolean(membership)} full={full} />
      )}
    </main>
  );
}
