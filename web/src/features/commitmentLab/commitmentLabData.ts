import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getFounderTeamHomebase } from "@/features/teams/founderTeamHomebaseData";
import {
  COMMITMENT_LAB_OBLIGATIONS,
  isCommitmentLabFounderReady,
  normalizeCommitmentLabDiscussionMarkers,
  normalizeScenarioAnswers,
  type CommitmentLabDiscussionEntry,
  type CommitmentLabFounderEntry,
  type CommitmentLabObligation,
  type CommitmentLabRealityFit,
} from "@/features/commitmentLab/commitmentLabModel";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getCommitmentLab(
  teamId: string,
  relationshipId: string,
  currentUserId: string,
  client?: Client
) {
  const supabase = client ?? (await createClient());
  const team = await getFounderTeamHomebase(teamId, currentUserId, supabase);
  const alignment = team?.alignment.find((entry) => entry.relationshipId === relationshipId);
  if (!team || !alignment) return null;

  const [labResult, founderResult, discussionResult, setupResult] = await Promise.all([
    supabase.from("commitment_labs").select("relationship_id, shared_reflection, created_at, updated_at").eq("relationship_id", relationshipId).maybeSingle(),
    supabase.from("commitment_lab_founder_entries").select("relationship_id, user_id, current_hours, difficult_week_hours, obligation_categories, change_note, reality_fit, commitment_meaning, priority_reflection, reliability_reflection, transparency_reflection, responsibility_reflection, renegotiation_reflection, scenario_answers, difficult_situation, desired_alternative, discussion_markers, updated_at").eq("relationship_id", relationshipId),
    supabase.from("commitment_lab_discussion_entries").select("id, author_user_id, parent_entry_id, body, created_at").eq("relationship_id", relationshipId).order("created_at", { ascending: true }),
    supabase.from("founder_team_setup_items").select("item_key, working_note").eq("team_id", teamId).in("item_key", ["time_commitment", "changing_commitment"]),
  ]);
  if (labResult.error || founderResult.error || discussionResult.error || setupResult.error) {
    throw new Error("commitment_lab_unavailable");
  }
  const names = new Map(team.members.map((member, index) => [
    member.userId,
    member.displayName ?? `Founder ${index + 1}`,
  ]));
  const founderEntries = ((founderResult.data ?? []) as Array<Record<string, unknown>>).map<CommitmentLabFounderEntry>((row) => ({
    relationshipId: String(row.relationship_id),
    userId: String(row.user_id),
    currentHours: typeof row.current_hours === "number" ? row.current_hours : null,
    difficultWeekHours: typeof row.difficult_week_hours === "number" ? row.difficult_week_hours : null,
    obligationCategories: Array.isArray(row.obligation_categories)
      ? row.obligation_categories.filter((value): value is CommitmentLabObligation =>
          typeof value === "string" && (COMMITMENT_LAB_OBLIGATIONS as readonly string[]).includes(value)
        )
      : [],
    changeNote: typeof row.change_note === "string" ? row.change_note : "",
    realityFit: row.reality_fit === "realistic" || row.reality_fit === "partly" || row.reality_fit === "reconsider"
      ? row.reality_fit as CommitmentLabRealityFit
      : null,
    commitmentMeaning: typeof row.commitment_meaning === "string" ? row.commitment_meaning : "",
    priorityReflection: typeof row.priority_reflection === "string" ? row.priority_reflection : "",
    reliabilityReflection: typeof row.reliability_reflection === "string" ? row.reliability_reflection : "",
    transparencyReflection: typeof row.transparency_reflection === "string" ? row.transparency_reflection : "",
    responsibilityReflection: typeof row.responsibility_reflection === "string" ? row.responsibility_reflection : "",
    renegotiationReflection: typeof row.renegotiation_reflection === "string" ? row.renegotiation_reflection : "",
    scenarioAnswers: normalizeScenarioAnswers(row.scenario_answers),
    difficultSituation: typeof row.difficult_situation === "string" ? row.difficult_situation : "",
    desiredAlternative: typeof row.desired_alternative === "string" ? row.desired_alternative : "",
    discussionMarkers: normalizeCommitmentLabDiscussionMarkers(row.discussion_markers),
    updatedAt: String(row.updated_at),
  }));
  const discussion = ((discussionResult.data ?? []) as Array<Record<string, unknown>>).map<CommitmentLabDiscussionEntry>((row) => ({
    id: String(row.id),
    authorUserId: String(row.author_user_id),
    parentEntryId: typeof row.parent_entry_id === "string" ? row.parent_entry_id : null,
    body: String(row.body),
    createdAt: String(row.created_at),
  }));
  const setupNotes = Object.fromEntries(
    ((setupResult.data ?? []) as Array<{ item_key: string; working_note: string }>).map((row) => [row.item_key, row.working_note])
  );
  const bothFoundersReady = alignment.participantUserIds.every((userId) =>
    isCommitmentLabFounderReady(founderEntries.find((entry) => entry.userId === userId) ?? null)
  );
  return {
    team,
    relationshipId,
    participantUserIds: alignment.participantUserIds,
    participantNames: alignment.participantUserIds.map((id) => names.get(id) ?? "Founder") as [string, string],
    founderEntries,
    sharedDiscussionMarkers: bothFoundersReady
      ? founderEntries.flatMap((entry) =>
          entry.discussionMarkers.map((marker) => ({ userId: entry.userId, marker }))
        )
      : [],
    discussion,
    sharedReflection: (labResult.data as { shared_reflection?: string } | null)?.shared_reflection ?? "",
    started: Boolean(labResult.data || founderEntries.length || discussion.length),
    setupWorkingNotes: {
      time_commitment: setupNotes.time_commitment ?? "",
      changing_commitment: setupNotes.changing_commitment ?? "",
    },
  };
}
