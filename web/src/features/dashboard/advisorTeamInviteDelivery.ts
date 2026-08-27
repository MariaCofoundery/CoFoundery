export type AdvisorInviteRecipientEmailStatus = "sent" | "failed";
export type AdvisorInviteEmailStatus = "sent" | "partial" | "not_sent";

export function deriveAdvisorInviteEmailStatus(
  founderA: AdvisorInviteRecipientEmailStatus,
  founderB: AdvisorInviteRecipientEmailStatus
): AdvisorInviteEmailStatus {
  if (founderA === "sent" && founderB === "sent") return "sent";
  if (founderA === "failed" && founderB === "failed") return "not_sent";
  return "partial";
}
