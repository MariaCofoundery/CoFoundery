import "server-only";

import {
  getReceivedDiscoveryIntroRequests,
  getSentDiscoveryIntroRequests,
} from "@/features/discovery/discoveryIntroData";
import {
  buildFounderConnectionsReadModel,
  type FounderConnectionInvitationRow,
  type FounderConnectionsReadModel,
} from "@/features/connections/founderConnectionsModel";
import { getFounderTeamDashboardSummaries } from "@/features/teams/founderTeamHomebaseData";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type InvitationRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string;
  team_context: string;
  status: string;
  label: string | null;
  inviter_display_name: string | null;
  created_at: string;
  expires_at: string;
};
type ProfileRow = { user_id: string; display_name: string | null };

const INVITATION_COLUMNS =
  "id, inviter_user_id, invitee_user_id, invitee_email, team_context, status, label, inviter_display_name, created_at, expires_at";

function normalizeTeamContext(value: string) {
  return value === "existing_team" ? ("existing_team" as const) : ("pre_founder" as const);
}

function normalizeStatus(value: string): FounderConnectionInvitationRow["status"] {
  if (value === "opened" || value === "accepted" || value === "expired" || value === "revoked") {
    return value;
  }
  return "sent";
}

export async function getFounderConnections(
  currentUserId: string,
  currentUserEmail: string | null | undefined,
  client?: SupabaseServerClient
): Promise<FounderConnectionsReadModel> {
  const supabase = client ?? (await createClient());
  const normalizedEmail = currentUserEmail?.trim().toLowerCase() ?? "";

  const [teams, receivedIntros, sentIntros, sentResult, incomingUserResult, incomingEmailResult] =
    await Promise.all([
      getFounderTeamDashboardSummaries(currentUserId, supabase),
      getReceivedDiscoveryIntroRequests(currentUserId),
      getSentDiscoveryIntroRequests(currentUserId),
      supabase
        .from("invitations")
        .select(INVITATION_COLUMNS)
        .eq("inviter_user_id", currentUserId)
        .order("created_at", { ascending: false }),
      supabase
        .from("invitations")
        .select(INVITATION_COLUMNS)
        .eq("invitee_user_id", currentUserId)
        .order("created_at", { ascending: false }),
      normalizedEmail
        ? supabase
            .from("invitations")
            .select(INVITATION_COLUMNS)
            .eq("invitee_email", normalizedEmail)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (sentResult.error || incomingUserResult.error || incomingEmailResult.error) {
    throw new Error("founder_connections_unavailable");
  }

  const rows = [
    ...((sentResult.data ?? []) as InvitationRow[]),
    ...((incomingUserResult.data ?? []) as InvitationRow[]),
    ...((incomingEmailResult.data ?? []) as InvitationRow[]),
  ]
    .filter(
      (row) =>
        row.inviter_user_id === currentUserId ||
        row.invitee_user_id === currentUserId ||
        (row.invitee_user_id === null && row.invitee_email.trim().toLowerCase() === normalizedEmail)
    )
    .filter((row, index, all) => all.findIndex((candidate) => candidate.id === row.id) === index);
  const profileIds = [
    ...new Set(
      rows.flatMap((row) => [row.inviter_user_id, row.invitee_user_id]).filter(
        (value): value is string => Boolean(value) && value !== currentUserId
      )
    ),
  ];
  const profileResult =
    profileIds.length > 0
      ? await supabase.from("profiles").select("user_id, display_name").in("user_id", profileIds)
      : { data: [], error: null };
  const profileNames = new Map(
    ((profileResult.data ?? []) as ProfileRow[]).map((row) => [
      row.user_id,
      row.display_name?.trim() || null,
    ])
  );

  const invitations: FounderConnectionInvitationRow[] = rows.map((row) => {
    const direction = row.inviter_user_id === currentUserId ? "sent" : "incoming";
    const counterpartUserId = direction === "sent" ? row.invitee_user_id : row.inviter_user_id;
    return {
      id: row.id,
      direction,
      inviterUserId: row.inviter_user_id,
      inviteeUserId: row.invitee_user_id,
      teamContext: normalizeTeamContext(row.team_context),
      status: normalizeStatus(row.status),
      label: row.label?.trim() || null,
      counterpartName:
        (counterpartUserId ? profileNames.get(counterpartUserId) : null) ??
        (direction === "incoming" ? row.inviter_display_name?.trim() || null : null),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  });

  return buildFounderConnectionsReadModel({
    currentUserId,
    teams,
    receivedIntros,
    sentIntros,
    invitations,
  });
}
