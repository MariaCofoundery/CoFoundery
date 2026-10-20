import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { BetaTeamReport } from "@/features/modules/ui/BetaTeamReport";
import { compareBeta } from "@/features/modules/ventureBeta/compare";
import { loadBetaComparison, loadBetaReadiness } from "@/features/modules/ventureBeta/teamData";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Venture Alignment (Beta) - der gemeinsame Teamreport.
 *
 * DIE DATENBANK ENTSCHEIDET. Die Seite fragt `get_assessment_team_readiness` und - nur bei `ready` -
 * `get_assessment_team_comparison`. Beides prueft Mitgliedschaft und aktive Shares selbst und liefert
 * nur die team-sichtbaren Bloecke (Allowlist). Kein Teilbericht: Entweder alle aktuellen Mitglieder sind
 * abgegeben UND haben ihren Durchlauf freigegeben, oder es gibt nichts zu sehen.
 *
 * VORHER KEINE NAMEN. Ist der Vergleich nicht bereit, steht nur „es fehlen noch Voraussetzungen" - nicht
 * wer, nicht was, nicht wie viele. Die eigene Lage ist die einzige Angabe.
 *
 * DERSELBE BERICHT FUER ALLE: Nichts hier unterscheidet Rollen. Advisors bekommen ueber diese Seite
 * nichts - die Datenbank kennt sie nicht als Mitglieder. Nur fuer freigeschaltete Konten (Beta-Gate).
 */
export default async function BetaTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/vorhaben-beta`)}`);

  const client = await createClient();
  const readiness = await loadBetaReadiness(client, teamId);
  // Kein aktuelles Mitglied (oder nicht lesbar): nichts ueber das Team verraten.
  if (!readiness) return <TeamUnavailable teamId={teamId} />;

  const t = await getTranslations("ventureBeta");
  const comparison = readiness.status === "ready" ? await loadBetaComparison(client, teamId) : null;
  const results = comparison?.status === "ready" ? compareBeta(comparison.people) : null;

  // Die Uebungen im Team: Commitment Lab gibt es je Paar. Gibt es fuer diese Person genau EIN Paar, geht der
  // Link direkt dorthin; sonst auf die Teamseite, wo die Paare stehen. Nur gelesen, nichts angelegt.
  const teamBase = results ? await getFounderTeamHomebase(teamId, auth.user.id, client).catch(() => null) : null;
  const ownPairs = (teamBase?.alignment ?? []).filter((entry) => entry.participantUserIds.includes(auth.user.id));
  const links = {
    setup: `/teams/${encodeURIComponent(teamId)}/setup`,
    commitment:
      ownPairs.length === 1
        ? `/teams/${encodeURIComponent(teamId)}/commitment-lab/${encodeURIComponent(ownPairs[0]!.relationshipId)}`
        : `/teams/${encodeURIComponent(teamId)}#team-deep-dives`,
    exercises: `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind`,
  };

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href={`/teams/${encodeURIComponent(teamId)}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
      >
        ← {t("report.back")}
      </Link>
      <p className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
        {t("report.eyebrow")}
        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] tracking-normal text-slate-600">{t("badge")}</span>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t("report.title")}</h1>

      {results ? (
        <BetaTeamReport results={results} teamId={teamId} links={links} />
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <h2 className="text-base font-semibold text-slate-900">{t("report.notReadyTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{t("report.notReady")}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("report.yourPart")}
            {readiness.own.state === "not_started"
              ? t("team.not_started")
              : readiness.own.state === "in_progress"
                ? t("team.in_progress")
                : readiness.own.shared
                  ? t("team.shared")
                  : t("team.completed")}
          </p>
          <Link
            href={`/founder-alignment/vorhaben/beta?venture=${encodeURIComponent(teamId)}${readiness.own.state === "completed" ? "#teilen" : ""}`}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            {readiness.own.state === "completed"
              ? readiness.own.shared
                ? t("team.manage")
                : t("team.share")
              : readiness.own.state === "in_progress"
                ? t("team.continue")
                : t("team.start")}
          </Link>
        </section>
      )}
    </main>
  );
}
