export type DashboardHeroActionKind =
  | "incoming_invitation"
  | "founder_alignment_continue"
  | "values_continue"
  | "open_team"
  | "open_connections"
  | "invite_cofounder";

export function resolveDashboardHeroAction(params: {
  hasIncomingInvitation: boolean;
  hasSubmittedFounderAlignment: boolean;
  hasStartedFounderAlignment: boolean;
  hasStartedValues: boolean;
  hasTeam: boolean;
  hasConnectionActivity: boolean;
}): DashboardHeroActionKind {
  if (params.hasIncomingInvitation) return "incoming_invitation";
  if (params.hasStartedFounderAlignment && !params.hasSubmittedFounderAlignment) {
    return "founder_alignment_continue";
  }
  if (params.hasStartedValues) return "values_continue";
  if (params.hasTeam) return "open_team";
  if (params.hasConnectionActivity) return "open_connections";
  return "invite_cofounder";
}

export function resolveFounderAlignmentFoundationState(params: {
  submitted: boolean;
  started: boolean;
}) {
  if (params.submitted) return "result_available" as const;
  return params.started ? ("started" as const) : ("not_started" as const);
}

export function resolveValuesFoundationState(params: {
  submitted: boolean;
  started: boolean;
}) {
  if (params.submitted) return "completed" as const;
  return params.started ? ("started" as const) : ("optional" as const);
}

export function resolveDiscoveryFoundationState(
  status: "draft" | "active" | "paused" | null | undefined
) {
  if (status === "active" || status === "paused" || status === "draft") return status;
  return "not_created" as const;
}

/**
 * Die eine Hauptaktion im Begruessungsbereich - oder keine.
 *
 * Seit Phase 9.4A hoechstens eine: Ist das Basisprofil unvollstaendig, geht es
 * darum; sonst um die eigene Arbeitsweise, solange sie nicht abgegeben ist.
 * Alles, was andere betrifft (Einladungen, Freigaben, Bestaetigungen), steht
 * unter "Was gerade ansteht" - es hier zu wiederholen, waere dieselbe Aufgabe
 * zweimal. Ist nichts offen, bleibt der Bereich ruhig.
 */
export type DashboardPrimaryAction = "complete_profile" | "workstyle_start" | "workstyle_continue";

export function resolveDashboardPrimaryAction(params: {
  needsOnboarding: boolean;
  workProfileState: "new" | "legacy" | "started" | "completed";
}): DashboardPrimaryAction | null {
  if (params.needsOnboarding) return "complete_profile";
  if (params.workProfileState === "started") return "workstyle_continue";
  if (params.workProfileState === "new" || params.workProfileState === "legacy") return "workstyle_start";
  return null;
}
