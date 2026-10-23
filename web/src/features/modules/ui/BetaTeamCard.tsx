import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { IconTile } from "@/features/ui/Icons";
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
    <article className="card-lift flex h-full flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" data-beta-team-card={state}>
      <div className="flex items-center justify-between gap-2">
        <IconTile name="rocket" tone="violet" />
        <span className="rounded-full bg-[#fdecc8] px-2.5 py-0.5 text-[13px] font-semibold text-[#7a4300]">{t("badge")}</span>
      </div>
      <h3 className="text-xl font-semibold leading-tight text-[#0b1f3a]">{tModules("venture_core_beta.title")}</h3>
      <p className="text-sm leading-[1.55] text-[#5f5e7a]">{tModules("venture_core_beta.summary")}</p>
      <span className="self-start rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-semibold text-[#33325e]">{view.status}</span>
      <div className="mt-auto pt-1">
        <Link href={view.href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4]">
          {view.label}
        </Link>
      </div>
    </article>
  );
}
