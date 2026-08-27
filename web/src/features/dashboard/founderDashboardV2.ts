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
