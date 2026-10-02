export const moderationStatuses = ["open", "reviewed", "closed"] as const;
export type ModerationStatus = (typeof moderationStatuses)[number];
export const moderationPageSize = 25;

export function isModerationStatus(value: unknown): value is ModerationStatus {
  return moderationStatuses.some((status) => status === value);
}

export function moderationFilter(value: unknown): ModerationStatus | null {
  return isModerationStatus(value) ? value : null;
}

export function moderationPage(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) return 0;
  return Number(value);
}

export function moderationUrl(status: ModerationStatus | null, page = 0) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page) params.set("page", String(page));
  return `/admin/moderation${params.size ? `?${params}` : ""}`;
}

export type ModerationReport = {
  id: string; created_at: string; category: "spam" | "harassment" | "misleading" | "other";
  comment: string | null; status: ModerationStatus; admin_note: string | null;
  moderated_at: string | null; moderated_by: string | null;
  reporter_user_id: string; reporter_name: string | null;
  reported_user_id: string; reported_name: string | null;
  conversation_id: string | null; contact_request_id: string | null;
  participant_a_user_id: string | null; participant_b_user_id: string | null;
  origin: "contact_request" | "problem_interest" | "find_intro" | "unavailable";
  context_title: string | null; problem_id: string | null; approach_id: string | null;
  discovery_intro_request_id: string | null;
};
