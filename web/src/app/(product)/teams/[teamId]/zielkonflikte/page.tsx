import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { compareTradeoffs } from "@/features/modules/tradeoffs/compare";
import { tradeoffItems } from "@/features/modules/tradeoffs/registry";
import { loadTradeoffsComparison, loadTradeoffsReadiness } from "@/features/modules/tradeoffs/teamData";
import { TradeoffsComparison } from "@/features/modules/ui/TradeoffsComparison";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Werte & Zielkonflikte - der gemeinsame Vergleich des Teams.
 *
 * DIE DATENBANK ENTSCHEIDET. Die Seite fragt `get_tradeoffs_team_readiness`
 * und - nur bei `ready` - `get_tradeoffs_team_comparison`. Beides prueft
 * Mitgliedschaft und Freigaben selbst; hier wird nichts aus Einzelteilen
 * zusammengesetzt. Kein Teilbericht: Entweder alle aktuellen Mitglieder sind
 * abgeschlossen und freigegeben, oder es gibt nichts zu sehen.
 *
 * VORHER KEINE NAMEN. Ist der Vergleich nicht bereit, steht nur „es fehlen
 * noch Voraussetzungen" - nicht, wer, nicht, was, nicht, wie viele. Die eigene
 * Lage (begonnen, abgeschlossen, freigegeben) ist die einzige Angabe.
 *
 * DERSELBE BERICHT FUER ALLE: kein Ablauf hier unterscheidet Rollen.
 * Advisors bekommen ueber diese Seite nichts - die Datenbank kennt sie nicht
 * als Mitglieder.
 */
export default async function TradeoffsTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/zielkonflikte`)}`);

  const client = await createClient();
  const readiness = await loadTradeoffsReadiness(client, teamId);
  // Kein aktuelles Mitglied (oder nicht lesbar): nichts ueber das Team verraten.
  if (!readiness) return <TeamUnavailable teamId={teamId} />;

  const t = await getTranslations("ventureTradeoffs");
  const comparison = readiness.status === "ready" ? await loadTradeoffsComparison(client, teamId) : null;
  const rows = comparison?.status === "ready" ? compareTradeoffs(tradeoffItems(), comparison.people) : null;

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href={`/teams/${encodeURIComponent(teamId)}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
      >
        ← {t("compare.back")}
      </Link>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{t("compare.eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t("compare.title")}</h1>

      {rows ? (
        <TradeoffsComparison rows={rows} />
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
          <h2 className="text-base font-semibold text-slate-900">{t("compare.notReadyTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">{t("compare.notReady")}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t("compare.yourPart")}
            {readiness.own.state === "not_started"
              ? t("team.not_started")
              : readiness.own.state === "in_progress"
                ? t("team.in_progress")
                : readiness.own.shared
                  ? t("team.shared")
                  : t("team.completed")}
          </p>
          <Link
            href={`/founder-alignment/vorhaben/zielkonflikte?venture=${encodeURIComponent(teamId)}${readiness.own.state === "completed" ? "#teilen" : ""}`}
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
