import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";

export function normalizeAdvisorTeamContext(value: string | null | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

export function buildAdvisorWorkbookHref(
  invitationId: string,
  teamContext?: TeamContext | null
) {
  const search = new URLSearchParams({
    invitationId,
    advisorContext: "1",
  });
  if (teamContext) {
    search.set("teamContext", teamContext);
  }
  return `/founder-alignment/workbook?${search.toString()}`;
}

export function buildAdvisorReportHref(
  invitationId: string,
  teamContext?: TeamContext | null
) {
  const search = new URLSearchParams({ invitationId });
  if (teamContext) {
    search.set("teamContext", teamContext);
  }
  return `/advisor/report?${search.toString()}`;
}

export function buildAdvisorSnapshotHref(
  invitationId: string,
  teamContext?: TeamContext | null
) {
  const search = new URLSearchParams({ invitationId });
  if (teamContext) {
    search.set("teamContext", teamContext);
  }
  return `/advisor/snapshot?${search.toString()}`;
}
