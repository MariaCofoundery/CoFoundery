import { getInvitationJoinDecision } from "@/features/reporting/actions";

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

export async function resolveInvitationContinueTarget(
  invitationId: string
): Promise<InvitationContinueResolution> {
  const normalizedInvitationId = invitationId.trim();
  const fallbackHref = buildInvitationDashboardHref(normalizedInvitationId);

  if (!normalizedInvitationId) {
    return {
      ok: false,
      invitationId: normalizedInvitationId,
      reason: "invitation_not_found",
      fallbackHref,
    };
  }

  const decision = await getInvitationJoinDecision(normalizedInvitationId);
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
    return {
      ok: true,
      invitationId: normalizedInvitationId,
      mode: decision.mode,
      label: decision.mode === "report_ready" ? "Zum Report" : "Zum Abschluss",
      resolvedHref: buildInvitationDoneHref(normalizedInvitationId),
      entryHref: buildInvitationStartHref(normalizedInvitationId),
    };
  }

  const nextModule = decision.missing_modules.includes("base") ? "base" : "values";
  return {
    ok: true,
    invitationId: normalizedInvitationId,
    mode: decision.mode,
    label: nextModule === "base" ? "Zum Basis-Fragebogen" : "Zum Werte-Modul",
    resolvedHref: buildInvitationQuestionnaireHref(normalizedInvitationId, nextModule),
    entryHref: buildInvitationStartHref(normalizedInvitationId),
  };
}
