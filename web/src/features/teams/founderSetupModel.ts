import {
  FOUNDER_SETUP_CATALOG,
  type FounderSetupCategoryKey,
  type FounderSetupItemKey,
} from "@/features/teams/founderSetupCatalog";

export type FounderSetupWorkStatus = "open" | "discussing";
export type FounderSetupResolutionStatus = "clarified" | "documented" | "not_relevant";
export type FounderSetupDisplayStatus =
  | FounderSetupWorkStatus
  | FounderSetupResolutionStatus
  | "confirmation_pending";

export type FounderSetupMember = {
  userId: string;
  displayName: string | null;
};

export type FounderSetupRevision = {
  id: string;
  resolutionStatus: FounderSetupResolutionStatus;
  note: string;
  documentationReference: string | null;
  proposedByUserId: string;
  createdAt: string;
  confirmedAt: string | null;
  confirmations: { userId: string; confirmedAt: string }[];
};

export type FounderSetupItem = {
  key: FounderSetupItemKey;
  category: FounderSetupCategoryKey;
  legalNote: boolean;
  persisted: boolean;
  workStatus: FounderSetupWorkStatus;
  workingNote: string;
  displayStatus: FounderSetupDisplayStatus;
  currentConfirmedRevision: FounderSetupRevision | null;
  pendingRevision: FounderSetupRevision | null;
};

export type FounderSetupReadModel = {
  teamId: string;
  currentUserId: string;
  members: FounderSetupMember[];
  items: FounderSetupItem[];
  started: boolean;
};

export type FounderSetupItemRow = {
  id: string;
  team_id: string;
  item_key: string;
  work_status: string;
  working_note: string;
  current_confirmed_revision_id: string | null;
  pending_revision_id: string | null;
};

export type FounderSetupRevisionRow = {
  id: string;
  setup_item_id: string;
  resolution_status: string;
  note: string;
  documentation_reference: string | null;
  proposed_by_user_id: string;
  created_at: string;
  confirmed_at: string | null;
};

export type FounderSetupConfirmationRow = {
  revision_id: string;
  user_id: string;
  confirmed_at: string;
};

function resolutionStatus(value: string): FounderSetupResolutionStatus {
  if (value === "documented" || value === "not_relevant") return value;
  return "clarified";
}

export function buildFounderSetupReadModel(params: {
  teamId: string;
  currentUserId: string;
  members: FounderSetupMember[];
  itemRows: FounderSetupItemRow[];
  revisionRows: FounderSetupRevisionRow[];
  confirmationRows: FounderSetupConfirmationRow[];
}): FounderSetupReadModel {
  const revisions = new Map(
    params.revisionRows.map((row) => {
      const revision: FounderSetupRevision = {
        id: row.id,
        resolutionStatus: resolutionStatus(row.resolution_status),
        note: row.note,
        documentationReference: row.documentation_reference,
        proposedByUserId: row.proposed_by_user_id,
        createdAt: row.created_at,
        confirmedAt: row.confirmed_at,
        confirmations: params.confirmationRows
          .filter((confirmation) => confirmation.revision_id === row.id)
          .map((confirmation) => ({
            userId: confirmation.user_id,
            confirmedAt: confirmation.confirmed_at,
          })),
      };
      return [row.id, revision] as const;
    })
  );
  const rows = new Map(params.itemRows.map((row) => [row.item_key, row]));

  const items = FOUNDER_SETUP_CATALOG.map((catalogItem): FounderSetupItem => {
    const row = rows.get(catalogItem.key);
    const current = row?.current_confirmed_revision_id
      ? revisions.get(row.current_confirmed_revision_id) ?? null
      : null;
    const pending = row?.pending_revision_id
      ? revisions.get(row.pending_revision_id) ?? null
      : null;
    const workStatus: FounderSetupWorkStatus = row?.work_status === "discussing" ? "discussing" : "open";
    return {
      ...catalogItem,
      persisted: Boolean(row),
      workStatus,
      workingNote: row?.working_note ?? "",
      currentConfirmedRevision: current,
      pendingRevision: pending,
      displayStatus: pending ? "confirmation_pending" : current?.resolutionStatus ?? workStatus,
    };
  });

  return {
    teamId: params.teamId,
    currentUserId: params.currentUserId,
    members: params.members,
    items,
    started: params.itemRows.length > 0,
  };
}

export function countFounderSetupStatuses(model: FounderSetupReadModel) {
  return model.items.reduce<Record<FounderSetupDisplayStatus, number>>(
    (counts, item) => {
      counts[item.displayStatus] += 1;
      return counts;
    },
    {
      open: 0,
      discussing: 0,
      confirmation_pending: 0,
      clarified: 0,
      documented: 0,
      not_relevant: 0,
    }
  );
}

export function safeDocumentationHref(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
