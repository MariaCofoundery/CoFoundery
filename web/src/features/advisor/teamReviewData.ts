import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Gemeinsame Auswertungen - beide Seiten.
 *
 * Warum das ein eigener Vorgang ist und kein weiterer Umfang, steht in der
 * Migration 20261048120000. Kurz: Eine Aussage über das Verhältnis ZWISCHEN
 * Menschen gehört ihnen allen, und ein Umfang "Vergleich mit anderen" wäre
 * eine Blankozustimmung für Vergleiche mit Menschen, die man noch gar nicht
 * kennt.
 */

export type TeamReviewRequest = {
  reviewId: string;
  status: "requested" | "active";
  myDecision: "pending" | "approved" | "declined" | "revoked";
  holder: "org" | "person";
  orgName: string | null;
  askedByName: string | null;
  requestNote: string | null;
  /** Mit wem verglichen würde. Ohne diese Namen ist keine Zustimmung möglich. */
  otherNames: string[];
  createdAt: string | null;
};

export type AdvisorTeamReview = {
  reviewId: string;
  status: "requested" | "active";
  orgId: string | null;
  requestNote: string | null;
  createdAt: string | null;
  subjectUserIds: string[];
  pendingCount: number;
};

export async function getMyTeamReviewRequests(
  client: SupabaseClient
): Promise<TeamReviewRequest[]> {
  const { data, error } = await client.rpc("get_my_team_review_requests");
  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    reviewId: row.review_id as string,
    status: row.status as TeamReviewRequest["status"],
    myDecision: row.my_decision as TeamReviewRequest["myDecision"],
    holder: row.holder as TeamReviewRequest["holder"],
    orgName: (row.org_name as string) ?? null,
    askedByName: (row.asked_by_name as string) ?? null,
    requestNote: (row.request_note as string) ?? null,
    otherNames: ((row.other_names as string[]) ?? []).filter(Boolean),
    createdAt: (row.created_at as string) ?? null,
  }));
}

export async function getAdvisorTeamReviews(
  client: SupabaseClient
): Promise<AdvisorTeamReview[]> {
  const { data, error } = await client.rpc("get_advisor_team_reviews");
  if (error || !data) return [];

  return (data as Record<string, unknown>[]).map((row) => ({
    reviewId: row.review_id as string,
    status: row.status as AdvisorTeamReview["status"],
    orgId: (row.org_id as string) ?? null,
    requestNote: (row.request_note as string) ?? null,
    createdAt: (row.created_at as string) ?? null,
    subjectUserIds: ((row.subject_user_ids as string[]) ?? []).filter(Boolean),
    pendingCount: Number(row.pending_count ?? 0),
  }));
}
