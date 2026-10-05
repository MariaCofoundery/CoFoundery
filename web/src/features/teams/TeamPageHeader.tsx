import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";

type NavigationKey = "overview" | "workstyle" | "roles" | "setup" | "library";

/** "Maria + FotoMia" (wie in Verbindungen und Dashboard) - oder der Teamname, wenn das Team einen hat. */
export async function getTeamLabel(client: SupabaseClient, teamId: string): Promise<string | null> {
  const [{ data: team }, { data: people }] = await Promise.all([
    client.from("founder_teams").select("name").eq("id", teamId).maybeSingle(),
    client.rpc("get_founder_team_member_presentations", { p_team_id: teamId }),
  ]);
  if (team?.name?.trim()) return team.name.trim();
  const names = ((people ?? []) as { display_name?: string | null }[])
    .map((p) => p.display_name?.trim())
    .filter((n): n is string => Boolean(n));
  return names.length ? names.join(" + ") : null;
}

/**
 * Kopf jeder Teamseite (Phase 11.7B): "← Verbindungen", wer im Team ist, der
 * Seitentitel und die lokale Teamnavigation - kompakt, damit der Inhalt im
 * ersten Bildschirm beginnt. Ersetzt den frueheren Link "Zum Team" und die
 * Brotkrume; die globale Leiste sagt bereits "Teams & Verbindungen".
 *
 * Nur fuer Mitglieder (Advisor erreichen Berichte ueber ihren eigenen Weg).
 * Nichts davon erscheint im Druck.
 */
export async function TeamPageHeader({
  teamId,
  active,
  title,
  teamLabel,
  eyebrow,
  children,
}: {
  teamId: string;
  active: NavigationKey;
  title: string;
  teamLabel?: string | null;
  /** Ueberschreibt die Zeile ueber dem Titel (sonst der Teamname). */
  eyebrow?: string | null;
  /** Aktionen direkt unter der Leiste (PDF, ausfuehrliche Fassung ...). */
  children?: React.ReactNode;
}) {
  const [t, navigationT] = await Promise.all([getTranslations("teams.homebase"), getTranslations("teams.teamNavigation")]);
  const line = eyebrow ?? teamLabel ?? t("eyebrow");
  return (
    <div className="team-page-header">
      <Link
        href="/connections"
        className="ws-no-print inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
      >
        ← {t("backShort")}
      </Link>
      <p className="mt-1 truncate text-sm font-medium text-slate-500">{line}</p>
      <h1 className="mt-0.5 break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
      <FounderTeamNavigation
        teamId={teamId}
        active={active}
        labels={{
          ariaLabel: navigationT("ariaLabel"),
          overview: navigationT("overview"),
          workstyle: navigationT("workstyle"),
          roles: navigationT("roles"),
          setup: navigationT("setup"),
          library: navigationT("library"),
        }}
      />
      {children ? <div className="ws-no-print mt-4 flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}
