import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
/** Existing relationship mapping + membership RLS. Never creates a team on read. */
export async function currentTeamForPeople(client: SupabaseClient, viewerId: string, otherId: string) {
  const [low, high] = [viewerId, otherId].sort();
  const { data } = await client.from("relationships").select("founder_team_id").eq("user_low", low).eq("user_high", high).maybeSingle();
  if (!data?.founder_team_id) return null;
  const { data: member } = await client.from("founder_team_members").select("team_id").eq("team_id", data.founder_team_id).eq("user_id", viewerId).maybeSingle();
  return member?.team_id as string | null ?? null;
}
export async function currentTeamForInvitation(client: SupabaseClient, viewerId: string, invitationId: string) {
  const { data } = await client.from("invitations").select("inviter_user_id,invitee_user_id").eq("id", invitationId).eq("status", "accepted").is("revoked_at", null).maybeSingle();
  if (!data?.invitee_user_id || ![data.inviter_user_id, data.invitee_user_id].includes(viewerId)) return null;
  return currentTeamForPeople(client, viewerId, viewerId === data.inviter_user_id ? data.invitee_user_id : data.inviter_user_id);
}
