import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { loadTradeoffsReadiness } from "@/features/modules/tradeoffs/teamData";
import { tradeoffsCardState } from "@/features/modules/tradeoffs/teamParse";

/**
 * „Gemeinsam vertiefen": die Karte zu „Werte & Zielkonflikte" im Team-Bereich.
 *
 * Sie zeigt nur die EIGENE Lage und - bei Bereitschaft - den Weg zum Vergleich.
 * Ueber die anderen steht nichts ausser „es fehlen noch Voraussetzungen":
 * keine Namen, keine Zaehler, keine Statusmatrix.
 *
 * Gezeigt wird die Karte nur, wenn die Datenbank die Person als aktuelles
 * Mitglied kennt und das Team 2-4 Personen hat (sonst gibt es keinen Vergleich).
 * Keine neue Hauptnavigation: Die Karte steht auf der Teamseite.
 */
export async function TradeoffsTeamCard({
  client,
  teamId,
  memberCount,
}: {
  client: SupabaseClient;
  teamId: string;
  memberCount: number;
}) {
  if (memberCount < 2 || memberCount > 4) return null;
  const readiness = await loadTradeoffsReadiness(client, teamId);
  if (!readiness) return null;

  const [t, tModules] = await Promise.all([getTranslations("ventureTradeoffs"), getTranslations("modules")]);
  const detail = `/founder-alignment/vorhaben/zielkonflikte?venture=${encodeURIComponent(teamId)}`;

  const state = tradeoffsCardState(readiness);
  const view = {
    not_started: { status: t("team.not_started"), label: t("team.start"), href: detail },
    in_progress: { status: t("team.in_progress"), label: t("team.continue"), href: detail },
    completed: { status: t("team.completed"), label: t("team.share"), href: `${detail}#teilen` },
    shared_missing: { status: `${t("team.shared")} ${t("share.missing")}`, label: t("team.manage"), href: `${detail}#teilen` },
    ready: { status: t("share.ready"), label: t("team.view"), href: `/teams/${encodeURIComponent(teamId)}/zielkonflikte` },
  }[state];
  const { status, label, href } = view;

  return (
    <section className="scroll-mt-24" aria-labelledby="team-together-title">
      <h2 id="team-together-title" className="text-lg font-semibold text-slate-950">
        {t("team.title")}
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{t("team.text")}</p>
      <article className="mt-4 flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">{tModules("venture_tradeoffs.title")}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{tModules("venture_tradeoffs.summary")}</p>
        <p className="mt-3 text-sm font-medium text-slate-800">{status}</p>
        <div className="mt-4">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {label}
          </Link>
        </div>
      </article>
    </section>
  );
}
