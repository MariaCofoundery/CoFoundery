"use server";

import { revalidatePath } from "next/cache";
import { sanitizeFounderAlignmentWorkbookPayload } from "@/features/reporting/founderAlignmentWorkbook";
import { resolveRelationshipIdForInvitation } from "@/features/reporting/relationshipAdvisorAccess";
import {
  getWorkbookDeepDiveSetupKey,
  isWorkbookDeepDivePilotStep,
  type WorkbookDeepDivePilotStepId,
} from "@/features/reporting/workbookDeepDivePilot";
import { createClient } from "@/lib/supabase/server";

export type WorkbookDeepDiveHandoffResult =
  | { ok: true; teamId: string; setupHref: string }
  | {
      ok: false;
      reason:
        | "not_authenticated"
        | "unavailable"
        | "three_founder_team"
        | "empty_reflection"
        | "existing_note"
        | "save_failed";
      setupHref?: string;
    };

export async function handoffWorkbookDeepDiveReflectionToFounderSetup(
  invitationId: string,
  stepId: WorkbookDeepDivePilotStepId
): Promise<WorkbookDeepDiveHandoffResult> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId || !isWorkbookDeepDivePilotStep(stepId)) {
    return { ok: false, reason: "unavailable" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_authenticated" };

  const relationshipId = await resolveRelationshipIdForInvitation(
    normalizedInvitationId,
    supabase
  );
  if (!relationshipId) return { ok: false, reason: "unavailable" };

  const [{ data: relationship, error: relationshipError }, { data: workbookRow, error: workbookError }] =
    await Promise.all([
      supabase
        .from("relationships")
        .select("id, user_a_id, user_b_id, founder_team_id")
        .eq("id", relationshipId)
        .maybeSingle(),
      supabase
        .from("founder_alignment_workbooks")
        .select("payload")
        .eq("invitation_id", normalizedInvitationId)
        .maybeSingle(),
    ]);

  const relationshipRow = relationship as {
    user_a_id?: string;
    user_b_id?: string;
    founder_team_id?: string | null;
  } | null;
  if (
    relationshipError ||
    workbookError ||
    !relationshipRow?.founder_team_id ||
    (relationshipRow.user_a_id !== user.id && relationshipRow.user_b_id !== user.id) ||
    !workbookRow
  ) {
    return { ok: false, reason: "unavailable" };
  }

  const teamId = relationshipRow.founder_team_id;
  const setupKey = getWorkbookDeepDiveSetupKey(stepId);
  if (!setupKey) {
    return { ok: false, reason: "unavailable" };
  }
  const setupHref = `/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(setupKey)}`;
  const [memberResult, itemResult] = await Promise.all([
    supabase.from("founder_team_members").select("user_id").eq("team_id", teamId),
    supabase
      .from("founder_team_setup_items")
      .select("id, work_status, working_note")
      .eq("team_id", teamId)
      .eq("item_key", setupKey)
      .maybeSingle(),
  ]);
  if (memberResult.error || itemResult.error) {
    return { ok: false, reason: "unavailable", setupHref };
  }

  const members = (memberResult.data ?? []) as Array<{ user_id: string }>;
  if (!members.some((member) => member.user_id === user.id)) {
    return { ok: false, reason: "unavailable", setupHref };
  }
  if (members.length !== 2) {
    return { ok: false, reason: "three_founder_team", setupHref };
  }
  if (
    !members.some((member) => member.user_id === relationshipRow.user_a_id) ||
    !members.some((member) => member.user_id === relationshipRow.user_b_id)
  ) {
    return { ok: false, reason: "unavailable", setupHref };
  }

  const item = itemResult.data as { work_status?: string; working_note?: string } | null;
  if (item?.working_note?.trim()) {
    return { ok: false, reason: "existing_note", setupHref };
  }

  const workbook = sanitizeFounderAlignmentWorkbookPayload(
    (workbookRow as { payload: unknown }).payload
  );
  const reflectionNote = workbook.steps[stepId].reflectionNote?.trim() ?? "";
  if (!reflectionNote) {
    return { ok: false, reason: "empty_reflection", setupHref };
  }

  // Founder Setup remains the source of truth. This narrow RPC atomically writes only when
  // the working note is still empty; it cannot create a revision or confirmation.
  const { data: copied, error } = await supabase.rpc(
    "handoff_workbook_deep_dive_note_if_empty",
    {
      p_team_id: teamId,
      p_item_key: setupKey,
      p_working_note: reflectionNote,
    }
  );
  if (error) return { ok: false, reason: "save_failed", setupHref };
  if (!copied) return { ok: false, reason: "existing_note", setupHref };

  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/setup`);
  revalidatePath(setupHref);
  return { ok: true, teamId, setupHref };
}
