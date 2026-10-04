import { currentTeamForInvitation } from "@/features/teams/currentJourneyData";
import { getInvitationJoinDecision } from "@/features/reporting/actions";
import { logInviteFlowDebug } from "@/features/onboarding/inviteFlowDebug";
import { createClient, getRequestUser } from "@/lib/supabase/server";

type InvitationJoinMode = "needs_questionnaires" | "choice_existing_or_update" | "report_ready";
export type InvitationContinueLabelKey =
  | "report"
  | "completion"
  | "base"
  | "values"
  /** Die neuen Bögen — für Einladungen von Menschen ohne die bisherige Fassung. */
  | "align";

export type InvitationContinueResolution =
  | {
      ok: true;
      mode: InvitationJoinMode;
      invitationId: string;
      labelKey: InvitationContinueLabelKey;
      label: string;
      resolvedHref: string;
      entryHref: string;
    }
  | {
      ok: false;
      invitationId: string;
      reason: string;
      detail?: string;
      fallbackHref: string;
    };

export function buildInvitationDashboardHref(invitationId: string) {
  return `/dashboard?invitationId=${encodeURIComponent(invitationId)}`;
}

export function buildInvitationDoneHref(invitationId: string) {
  return `/invite/${encodeURIComponent(invitationId)}/done`;
}

export function buildInvitationResumeHref(invitationId: string) {
  return `/invite/${encodeURIComponent(invitationId)}/resume`;
}

export function buildInvitationQuestionnaireHref(
  invitationId: string,
  module: "base" | "values",
  options?: {
    flow?: "refresh" | null;
  }
) {
  const search = new URLSearchParams({ invitationId });
  if (options?.flow === "refresh") {
    search.set("flow", "refresh");
  }

  const pathname = module === "base" ? "/me/base" : "/me/values";
  return `${pathname}?${search.toString()}`;
}

/**
 * Der Weg in die neuen Bögen — mit der Einladung im Gepäck.
 *
 * Die Kennung kommt mit, damit auf der anderen Seite steht, warum man dort
 * ist: „Du bist über die Einladung von … hier." Ohne sie landet jemand in
 * einem Fragebogen, den er nicht gesucht hat.
 */
export function buildInvitationAlignHref(invitationId: string) {
  return `/research/workstyle-pretest?version=8.5a-v3&invitationId=${encodeURIComponent(invitationId)}`;
}

export function buildInvitationStartHref(invitationId: string) {
  return `/join/start?invitationId=${encodeURIComponent(invitationId)}`;
}

export async function resolveActiveInvitationIdForCurrentUser(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();

  if (!user?.id) {
    return null;
  }

  const normalizedEmail = (user.email ?? "").trim().toLowerCase();
  const inviteFilter = normalizedEmail
    ? `invitee_user_id.eq.${user.id},invitee_email.eq.${normalizedEmail}`
    : `invitee_user_id.eq.${user.id}`;
  const { data } = await supabase
    .from("invitations")
    .select("id")
    .eq("status", "accepted")
    .is("revoked_at", null)
    .or(inviteFilter)
    .order("accepted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return ((data as { id?: string } | null)?.id ?? "").trim() || null;
}

export async function resolveInvitationContinueTarget(
  invitationId: string
): Promise<InvitationContinueResolution> {
  const normalizedInvitationId = invitationId.trim();
  const fallbackHref = buildInvitationDashboardHref(normalizedInvitationId);
  logInviteFlowDebug("invitationFlow:resolve_start", {
    invitationId: normalizedInvitationId,
    fallbackHref,
  });

  if (!normalizedInvitationId) {
    return {
      ok: false,
      invitationId: normalizedInvitationId,
      reason: "invitation_not_found",
      fallbackHref,
    };
  }

  const client = await createClient();
  const { data: { user } } = await getRequestUser();
  const teamId = user ? await currentTeamForInvitation(client, user.id, normalizedInvitationId) : null;
  if (teamId) return { ok: true, invitationId: normalizedInvitationId, mode: "needs_questionnaires", labelKey: "align", label: "Euer Zusammenspiel", resolvedHref: `/teams/${teamId}/workstyle`, entryHref: buildInvitationStartHref(normalizedInvitationId) };
  const decision = await getInvitationJoinDecision(normalizedInvitationId);
  logInviteFlowDebug("invitationFlow:join_decision", {
    invitationId: normalizedInvitationId,
    decision,
  });
  if (!decision.ok) {
    return {
      ok: false,
      invitationId: normalizedInvitationId,
      reason: decision.reason,
      detail: decision.detail,
      fallbackHref,
    };
  }

  return { ok: true, invitationId: normalizedInvitationId, mode: decision.mode, labelKey: "align", label: "Wie du arbeitest", resolvedHref: buildInvitationAlignHref(normalizedInvitationId), entryHref: buildInvitationStartHref(normalizedInvitationId) };
}
