import {
  isFounderSetupItemKey,
  type FounderSetupItemKey,
} from "@/features/teams/founderSetupCatalog";
import type { FounderSetupResolutionStatus } from "@/features/teams/founderSetupModel";

export type FounderSetupAdvisorGrantStatus = "not_granted" | "pending" | "active";
export type AdvisorFounderSetupAccessStatus =
  | "not_granted"
  | "pending"
  | "active"
  | "paused"
  | "revoked";

export type AdvisorFounderSetupAccessState = {
  status: AdvisorFounderSetupAccessStatus;
  consentCount: number;
  memberCount: number;
  confirmedItemCount: number;
};

export type FounderSetupAdvisorAccess = {
  sourceRelationshipAdvisorId: string;
  advisorName: string | null;
  grantId: string | null;
  status: FounderSetupAdvisorGrantStatus;
  consentedFounderUserIds: string[];
  accessActive: boolean;
};

export type AdvisorConfirmedFounderSetupItem = {
  itemKey: FounderSetupItemKey;
  resolutionStatus: FounderSetupResolutionStatus;
  note: string;
  documentationReference: string | null;
  confirmedAt: string;
};

export type FounderSetupAdvisorAccessRow = {
  source_relationship_advisor_id: string;
  advisor_name: string | null;
  grant_id: string | null;
  grant_status: string;
  consented_founder_user_ids: string[] | null;
  access_active: boolean;
};

export type AdvisorConfirmedFounderSetupRow = {
  item_key: string;
  resolution_status: string;
  note: string;
  documentation_reference: string | null;
  confirmed_at: string;
};

export type AdvisorFounderSetupAccessStatusRow = {
  access_status: string;
  consent_count: number;
  member_count: number;
  confirmed_item_count: number;
};

export function buildAdvisorFounderSetupAccessState(
  row: AdvisorFounderSetupAccessStatusRow | null | undefined
): AdvisorFounderSetupAccessState {
  const allowed: AdvisorFounderSetupAccessStatus[] = [
    "not_granted",
    "pending",
    "active",
    "paused",
    "revoked",
  ];
  return {
    status: allowed.includes(row?.access_status as AdvisorFounderSetupAccessStatus)
      ? (row!.access_status as AdvisorFounderSetupAccessStatus)
      : "not_granted",
    consentCount: Math.max(0, Number(row?.consent_count ?? 0)),
    memberCount: Math.max(0, Number(row?.member_count ?? 0)),
    confirmedItemCount: Math.max(0, Number(row?.confirmed_item_count ?? 0)),
  };
}

function grantStatus(value: string): FounderSetupAdvisorGrantStatus {
  if (value === "active" || value === "pending") return value;
  return "not_granted";
}

function resolutionStatus(value: string): FounderSetupResolutionStatus | null {
  if (value === "clarified" || value === "documented" || value === "not_relevant") {
    return value;
  }
  return null;
}

export function buildFounderSetupAdvisorAccess(
  rows: FounderSetupAdvisorAccessRow[]
): FounderSetupAdvisorAccess[] {
  return rows.flatMap((row) => {
    if (!row.source_relationship_advisor_id) return [];
    return [{
      sourceRelationshipAdvisorId: row.source_relationship_advisor_id,
      advisorName: row.advisor_name?.trim() || null,
      grantId: row.grant_id,
      status: grantStatus(row.grant_status),
      consentedFounderUserIds: [...new Set(row.consented_founder_user_ids ?? [])],
      accessActive: row.access_active === true,
    }];
  });
}

export function buildAdvisorConfirmedFounderSetup(
  rows: AdvisorConfirmedFounderSetupRow[]
): AdvisorConfirmedFounderSetupItem[] {
  return rows.flatMap((row) => {
    const status = resolutionStatus(row.resolution_status);
    if (!isFounderSetupItemKey(row.item_key) || !status || !row.confirmed_at) return [];
    return [{
      itemKey: row.item_key,
      resolutionStatus: status,
      note: row.note,
      documentationReference: row.documentation_reference,
      confirmedAt: row.confirmed_at,
    }];
  });
}
