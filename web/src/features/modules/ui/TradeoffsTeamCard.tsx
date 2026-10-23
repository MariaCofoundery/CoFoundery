import Link from "next/link";
import { IconTile } from "@/features/ui/Icons";
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
    <article className="card-lift flex h-full flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6">
      <div className="flex items-center justify-between gap-2">
        <IconTile name="scale" tone="amber" />
      </div>
      <h3 className="text-xl font-semibold leading-tight text-[#0b1f3a]">{tModules("venture_tradeoffs.title")}</h3>
      <p className="text-sm leading-[1.55] text-[#5f5e7a]">{tModules("venture_tradeoffs.summary")}</p>
      <span className="self-start rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-semibold text-[#33325e]">{status}</span>
      <div className="mt-auto pt-1">
        <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4]">
          {label}
        </Link>
      </div>
    </article>
  );
}
