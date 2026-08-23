export type AdvisorInviteClaimIdentityDecision =
  | "allow_new_claim"
  | "allow_existing_claim"
  | "email_mismatch"
  | "already_claimed";

export function normalizeAdvisorInviteEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function getAdvisorInviteClaimIdentityDecision({
  invitedEmail,
  authenticatedEmail,
  linkedAdvisorUserId,
  authenticatedUserId,
}: {
  invitedEmail: string | null | undefined;
  authenticatedEmail: string | null | undefined;
  linkedAdvisorUserId: string | null | undefined;
  authenticatedUserId: string;
}): AdvisorInviteClaimIdentityDecision {
  const normalizedInvitedEmail = normalizeAdvisorInviteEmail(invitedEmail);
  const normalizedAuthenticatedEmail = normalizeAdvisorInviteEmail(authenticatedEmail);

  if (
    !normalizedInvitedEmail ||
    !normalizedAuthenticatedEmail ||
    normalizedInvitedEmail !== normalizedAuthenticatedEmail
  ) {
    return "email_mismatch";
  }

  if (!linkedAdvisorUserId) {
    return "allow_new_claim";
  }

  return linkedAdvisorUserId === authenticatedUserId
    ? "allow_existing_claim"
    : "already_claimed";
}
