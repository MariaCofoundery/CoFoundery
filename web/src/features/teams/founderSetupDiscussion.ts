import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

export type FounderSetupDiscussionEntry = {
  id: string;
  teamId: string;
  itemKey: FounderSetupItemKey;
  authorUserId: string;
  parentEntryId: string | null;
  body: string;
  createdAt: string;
};

export type FounderSetupDiscussionThread = {
  root: FounderSetupDiscussionEntry;
  replies: FounderSetupDiscussionEntry[];
};

export function groupFounderSetupDiscussionEntries(
  entries: FounderSetupDiscussionEntry[]
): FounderSetupDiscussionThread[] {
  const roots = entries.filter((entry) => !entry.parentEntryId);
  return roots.map((root) => ({
    root,
    replies: entries.filter((entry) => entry.parentEntryId === root.id),
  }));
}
