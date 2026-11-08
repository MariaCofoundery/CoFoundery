import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdvisorOrg } from "@/features/advisor/orgData";
import { getOrgMembers, getOrgOpenInvites } from "@/features/advisor/orgData";
import { hasOrgFeature } from "@/features/advisor/orgFeatures";
import { getOrgTeamPrograms, listProgramEvents, listTeamProgramCodes, listTeamProgramInvites } from "@/features/advisor/teamProgramData";
import { OWNER_STEPS, MEMBER_STEPS, setupProgress, type SetupFacts } from "@/features/advisor/setup/setupModel";

const count = async (query: PromiseLike<{ count: number | null; error: unknown }>) => {
  const { count: value, error } = await query;
  return error ? 0 : value ?? 0;
};

/** Was schon steht - mit dem normalen Zugang, also nur, was die Person ohnehin sehen darf. */
export async function loadSetup(client: SupabaseClient, org: AdvisorOrg, userId: string) {
  const isOwner = org.role === "owner" && org.status === "active";
  const [members, invites, events, programs, programInvites, codes, tasks, templates, pushes, quiet, presence, state, shownCards, navPrefs] = await Promise.all([
    getOrgMembers(client, org.id),
    isOwner ? getOrgOpenInvites(client, org.id) : Promise.resolve([]),
    isOwner && hasOrgFeature(org, "plan") ? listProgramEvents(client, org.id) : Promise.resolve([]),
    isOwner ? getOrgTeamPrograms(client, org.id) : Promise.resolve([]),
    isOwner ? listTeamProgramInvites(client, org.id) : Promise.resolve([]),
    isOwner ? listTeamProgramCodes(client, org.id) : Promise.resolve([]),
    count(client.from("advisor_org_tasks").select("id", { count: "exact", head: true }).eq("org_id", org.id)),
    count(client.from("advisor_org_post_templates").select("id", { count: "exact", head: true }).eq("org_id", org.id)),
    count(client.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId)),
    count(client.from("notification_quiet_hours").select("user_id", { count: "exact", head: true }).eq("user_id", userId)),
    client.from("advisor_org_member_presence").select("team_role").eq("org_id", org.id).eq("user_id", userId).maybeSingle(),
    client.from("advisor_setup_state").select("skipped, hidden").eq("org_id", org.id).eq("user_id", userId).maybeSingle(),
    count(client.from("advisor_org_member_cards").select("user_id", { count: "exact", head: true }).eq("org_id", org.id).eq("shown", true)),
    count(client.from("advisor_nav_prefs").select("user_id", { count: "exact", head: true })),
  ]);
  const facts: SetupFacts = {
    profile: Boolean(org.locationRegion || org.focus.length > 0 || org.description),
    features: org.featuresSetupDone,
    team: members.filter((member) => member.status === "active").length > 1 || invites.length > 0,
    // Mindestens eine Karte ist fuer die Startups sichtbar (eigene Einwilligung je Person).
    people: shownCards > 0,
    // Die Seitenleiste ist eingerichtet, sobald sie einmal gespeichert wurde.
    sidebar: navPrefs > 0,
    // Ohne Programmplan gibt es diesen Schritt nicht zu tun.
    plan: !hasOrgFeature(org, "plan") || events.length > 0,
    teams: programs.length > 0 || programInvites.length > 0 || codes.length > 0,
    teamraum: tasks > 0 || templates > 0,
    phone: pushes > 0 || quiet > 0,
    role: Boolean((presence.data as { team_role?: string | null } | null)?.team_role),
  };
  const row = state.data as { skipped?: string[]; hidden?: boolean } | null;
  const steps = isOwner ? OWNER_STEPS : MEMBER_STEPS;
  return { isOwner, hidden: row?.hidden === true, progress: setupProgress(steps, facts, row?.skipped ?? []) };
}
