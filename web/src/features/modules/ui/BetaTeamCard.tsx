import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { tradeoffsCardState } from "@/features/modules/tradeoffs/teamParse";
import { loadBetaReadiness } from "@/features/modules/ventureBeta/teamData";

/**
 * Venture Alignment (Beta) im Team-Bereich - ein Eintrag, keine neue Hauptnavigation.
 *
 * Zeigt nur die EIGENE Lage und - bei Bereitschaft - den Weg zum Vergleich. Ueber die anderen steht
 * nichts ausser „es fehlen noch Voraussetzungen": keine Namen, keine Zaehler, keine Statusmatrix.
 * Nur fuer freigeschaltete Konten, nur bei 2-4 aktuellen Mitgliedern.
 */
export async function BetaTeamCard({
  client,
  teamId,
  memberCount,
}: {
  client: SupabaseClient;
  teamId: string;
  memberCount: number;
}) {
  if (memberCount < 2 || memberCount > 4) return null;
  const readiness = await loadBetaReadiness(client, teamId);
  if (!readiness) return null;

  const [t, tModules] = await Promise.all([getTranslations("ventureBeta"), getTranslations("modules")]);
  const detail = `/founder-alignment/vorhaben/beta?venture=${encodeURIComponent(teamId)}`;
  const state = tradeoffsCardState(readiness);
  const view = {
    not_started: { status: t("team.not_started"), label: t("team.start"), href: detail },
    in_progress: { status: t("team.in_progress"), label: t("team.continue"), href: detail },
    completed: { status: t("team.completed"), label: t("team.share"), href: `${detail}#teilen` },
    shared_missing: { status: `${t("team.shared")} ${t("share.missing")}`, label: t("team.manage"), href: `${detail}#teilen` },
    ready: { status: t("share.ready"), label: t("team.view"), href: `/teams/${encodeURIComponent(teamId)}/vorhaben-beta` },
  }[state];

  return (
    <section className="scroll-mt-24" aria-labelledby="team-beta-title" data-beta-team-card={state}>
      <h2 id="team-beta-title" className="flex items-center gap-2 text-lg font-semibold text-slate-950">
        {t("team.title")}
        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-normal text-slate-600">{t("badge")}</span>
      </h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{t("team.text")}</p>
      <article className="mt-4 flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">{tModules("venture_core_beta.title")}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{tModules("venture_core_beta.summary")}</p>
        <p className="mt-3 text-sm font-medium text-slate-800">{view.status}</p>
        <div className="mt-4">
          <Link
            href={view.href}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {view.label}
          </Link>
        </div>
      </article>
    </section>
  );
}
