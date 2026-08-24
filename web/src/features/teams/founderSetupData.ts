import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getFounderTeamDashboardSummaries } from "@/features/teams/founderTeamHomebaseData";
import {
  buildFounderSetupReadModel,
  type FounderSetupConfirmationRow,
  type FounderSetupItemRow,
  type FounderSetupReadModel,
  type FounderSetupRevisionRow,
} from "@/features/teams/founderSetupModel";
import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";
import type { FounderSetupDiscussionEntry } from "@/features/teams/founderSetupDiscussion";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getFounderSetup(
  teamId: string,
  currentUserId: string,
  client?: SupabaseServerClient
): Promise<FounderSetupReadModel | null> {
  const supabase = client ?? (await createClient());
  const team = (await getFounderTeamDashboardSummaries(currentUserId, supabase)).find(
    (summary) => summary.id === teamId
  );
  if (!team) return null;

  const itemResult = await supabase
    .from("founder_team_setup_items")
    .select(
      "id, team_id, item_key, work_status, working_note, current_confirmed_revision_id, pending_revision_id"
    )
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });
  if (itemResult.error) throw new Error("founder_team_setup_unavailable");

  const itemRows = (itemResult.data ?? []) as FounderSetupItemRow[];
  const itemIds = itemRows.map((item) => item.id);
  const pointerIds = [
    ...new Set(
      itemRows.flatMap((item) =>
        [item.current_confirmed_revision_id, item.pending_revision_id].filter(
          (id): id is string => Boolean(id)
        )
      )
    ),
  ];

  const revisionResult =
    itemIds.length > 0
      ? await supabase
          .from("founder_team_setup_revisions")
          .select(
            "id, setup_item_id, resolution_status, note, documentation_reference, proposed_by_user_id, created_at, confirmed_at"
          )
          .in("id", pointerIds.length > 0 ? pointerIds : ["00000000-0000-0000-0000-000000000000"])
          .in("setup_item_id", itemIds)
      : { data: [], error: null };
  if (revisionResult.error) throw new Error("founder_team_setup_unavailable");

  const revisionRows = (revisionResult.data ?? []) as FounderSetupRevisionRow[];
  const revisionIds = revisionRows.map((revision) => revision.id);
  const confirmationResult =
    revisionIds.length > 0
      ? await supabase
          .from("founder_team_setup_confirmations")
          .select("revision_id, user_id, confirmed_at")
          .in("revision_id", revisionIds)
      : { data: [], error: null };
  if (confirmationResult.error) throw new Error("founder_team_setup_unavailable");

  return buildFounderSetupReadModel({
    teamId,
    currentUserId,
    members: team.members.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
    })),
    itemRows,
    revisionRows,
    confirmationRows: (confirmationResult.data ?? []) as FounderSetupConfirmationRow[],
  });
}

export async function getFounderSetupStarted(
  teamId: string,
  _currentUserId: string,
  client?: SupabaseServerClient
) {
  const supabase = client ?? (await createClient());
  const result = await supabase
    .from("founder_team_setup_items")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  if (result.error) return { started: false, unavailable: true };
  return { started: (result.count ?? 0) > 0, unavailable: false };
}

export async function getFounderSetupDiscussion(
  teamId: string,
  itemKey: FounderSetupItemKey,
  client?: SupabaseServerClient
): Promise<FounderSetupDiscussionEntry[]> {
  const supabase = client ?? (await createClient());
  const result = await supabase
    .from("founder_team_setup_discussion_entries")
    .select("id, team_id, item_key, author_user_id, parent_entry_id, body, created_at")
    .eq("team_id", teamId)
    .eq("item_key", itemKey)
    .order("created_at", { ascending: true });
  if (result.error) throw new Error("founder_team_setup_discussion_unavailable");
  return ((result.data ?? []) as Array<{
    id: string;
    team_id: string;
    item_key: FounderSetupItemKey;
    author_user_id: string;
    parent_entry_id: string | null;
    body: string;
    created_at: string;
  }>).map((entry) => ({
    id: entry.id,
    teamId: entry.team_id,
    itemKey: entry.item_key,
    authorUserId: entry.author_user_id,
    parentEntryId: entry.parent_entry_id,
    body: entry.body,
    createdAt: entry.created_at,
  }));
}
