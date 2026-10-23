import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getTeamStrengthsOverview } from "@/features/teams/teamStrengthsData";
import { IconTile } from "@/features/ui/Icons";

/**
 * „Stärken & Antrieb" als Kachel auf der Teamseite: nur die EIGENE Lage (geteilt oder nicht) und der Weg zur Seite.
 * Über andere steht hier nichts - keine Namen, keine Zahl.
 */
export async function TeamStrengthsCard({ client, teamId }: { client: SupabaseClient; teamId: string }) {
  const overview = await getTeamStrengthsOverview(client, teamId);
  if (!overview) return null;
  const t = await getTranslations("teams.strengthsShare");
  return (
    <article className="card-lift flex h-full flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" data-strengths-team-card={overview.ownShared ? "shared" : "private"}>
      <div className="flex items-center justify-between gap-2">
        <IconTile name="heart" tone="pink" />
      </div>
      <h3 className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("pageTitle")}</h3>
      <p className="text-sm leading-[1.55] text-[#5f5e7a]">{t("cardText")}</p>
      <span className={`self-start rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${overview.ownShared ? "bg-[#e3f6ec] text-[#17794a]" : "bg-[#f1f0f7] text-[#33325e]"}`}>
        {overview.ownShared ? t("switchOn") : t("switchOff")}
      </span>
      <div className="mt-auto pt-1">
        <Link
          href={`/teams/${encodeURIComponent(teamId)}/staerken`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4]"
        >
          {t("cardCta")}
        </Link>
      </div>
    </article>
  );
}
