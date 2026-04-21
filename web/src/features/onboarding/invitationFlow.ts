import { getInvitationJoinDecision } from "@/features/reporting/actions";
import { logInviteFlowDebug } from "@/features/onboarding/inviteFlowDebug";
import { createClient } from "@/lib/supabase/server";

type InvitationJoinMode = "needs_questionnaires" | "choice_existing_or_update" | "report_ready";

export type InvitationContinueResolution =
  | {
      ok: true;
      mode: InvitationJoinMode;
      invitationId: string;
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

export function buildInvitationStartHref(invitationId: string) {
  return `/join/start?invitationId=${encodeURIComponent(invitationId)}`;
}

export async function resolveActiveInvitationIdForCurrentUser(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  if (decision.mode === "report_ready" || decision.mode === "choice_existing_or_update") {
    const result = {
      ok: true,
      invitationId: normalizedInvitationId,
      mode: decision.mode,
      label: decision.mode === "report_ready" ? "Zum Report" : "Zum Abschluss",
      resolvedHref: buildInvitationDoneHref(normalizedInvitationId),
      entryHref: buildInvitationStartHref(normalizedInvitationId),
    } satisfies Extract<InvitationContinueResolution, { ok: true }>;
    logInviteFlowDebug("invitationFlow:resolve_result", result);
    return result;
  }

  const nextModule = decision.missing_modules.includes("base") ? "base" : "values";
  const result = {
    ok: true,
    invitationId: normalizedInvitationId,
    mode: decision.mode,
    label: nextModule === "base" ? "Zum Basis-Fragebogen" : "Zum Werte-Modul",
    resolvedHref: buildInvitationQuestionnaireHref(normalizedInvitationId, nextModule),
    entryHref: buildInvitationStartHref(normalizedInvitationId),
  } satisfies Extract<InvitationContinueResolution, { ok: true }>;
  logInviteFlowDebug("invitationFlow:resolve_result", result);
  return result;
}
