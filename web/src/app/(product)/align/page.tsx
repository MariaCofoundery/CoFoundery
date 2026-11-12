import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AlignOverview } from "@/features/align/AlignOverview";
import { teamIdFromPath } from "@/features/align/alignModel";
import { getAlignOverview } from "@/features/align/alignOverviewData";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { LAST_PLACE_COOKIE } from "@/features/navigation/lastPlace";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("align.overview");
  return { title: t("pageTitle") };
}

/**
 * Align: die Übersicht über die drei Räume (Ich, Wir, Unser Vorhaben).
 *
 * Sie liest nur mit dem Client der Person und legt nichts an. Das Team ist `?team=`, sonst das zuletzt
 * benutzte (aus dem gemerkten Ort der App), sonst das erste.
 */
export default async function AlignPage({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const params = await searchParams;
  const [supabase, userResult, cookieStore, t] = await Promise.all([
    createClient(),
    getRequestUser(),
    cookies(),
    getTranslations("align.overview"),
  ]);
  const user = userResult.data.user;
  if (!user) redirect(`/login?next=${encodeURIComponent("/align")}`);

  const roleViews = await getDashboardRoleViews(user.id);
  if (!roleViews.hasFounder) redirect(roleViews.hasAdvisor ? "/advisor/dashboard" : "/dashboard");

  const preferredTeamId = teamIdFromPath(params.team ? `/teams/${params.team}` : null) ?? teamIdFromPath(cookieStore.get(LAST_PLACE_COOKIE)?.value);

  const [data, hasTeamProgram] = await Promise.all([
    getAlignOverview({ client: supabase, userId: user.id, preferredTeamId, unnamed: t("unnamed") }),
    Promise.resolve(supabase.rpc("get_my_team_programs"))
      .then(({ data: programs }) => Array.isArray(programs) && programs.length > 0)
      .catch(() => false),
  ]);

  return <AlignOverview data={data} hasTeamProgram={hasTeamProgram} />;
}
