import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccessStatePanel } from "@/features/access/AccessStatePanel";
import { teamAccessView, type AccessStateLink } from "@/features/access/accessStateModel";
import { createClient } from "@/lib/supabase/server";

const LINK_HREF: Record<AccessStateLink, string> = {
  connections: "/connections",
  advisor: "/advisor/dashboard",
  people: "/advisor/group",
};

/**
 * Phase 12C.1C: Was eine Teamseite zeigt, wenn das Team fuer die Person nicht
 * (mehr) lesbar ist.
 *
 * Nur an der Stelle einsetzen, an der die Seite das Team nicht lesen konnte.
 * Ist die Person weiterhin Mitglied (oder hatte nie Zugang), bleibt es eine
 * echte 404 - die Statusauskunft erklaert nur verlorene Zugaenge.
 */
export async function loadTeamAccessView(teamId: string) {
  const client = await createClient();
  const { data, error } = await client.rpc("get_team_access_state", { p_team_id: teamId });
  return error ? null : teamAccessView(data);
}

export async function TeamUnavailable({ teamId }: { teamId: string }) {
  const view = await loadTeamAccessView(teamId);
  if (!view) notFound();

  const t = await getTranslations("common.access.team");
  const labels: Record<AccessStateLink, string> = {
    connections: t("toConnections"),
    advisor: t("toAdvisor"),
    people: t("toPeople"),
  };
  return (
    <AccessStatePanel
      eyebrow={t("eyebrow")}
      title={t(`${view.messageKey}.title`)}
      body={t(`${view.messageKey}.body`)}
      actions={view.links.map((link) => ({ href: LINK_HREF[link], label: labels[link] }))}
    />
  );
}
