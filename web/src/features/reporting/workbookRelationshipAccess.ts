export function resolveWorkbookRelationshipAccess(params: {
  advisorContext: boolean;
  relationshipIdFromAdvisorAccess: string | null;
  relationshipIdFromReportRun: string | null;
  relationshipIdFromInvitation: string | null;
  hasRelationshipAdvisorAccess: boolean;
}) {
  const relationshipId = params.advisorContext
    ? params.relationshipIdFromAdvisorAccess ??
      params.relationshipIdFromReportRun ??
      params.relationshipIdFromInvitation
    : params.relationshipIdFromInvitation ??
      params.relationshipIdFromReportRun ??
      params.relationshipIdFromAdvisorAccess;

  return {
    relationshipId,
    hasRelationshipAdvisorAccess:
      params.hasRelationshipAdvisorAccess || Boolean(params.relationshipIdFromAdvisorAccess),
  };
}
