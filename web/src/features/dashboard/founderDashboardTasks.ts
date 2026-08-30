import type { FounderSetupItemKey } from "@/features/teams/founderSetupCatalog";

export const DASHBOARD_TASK_KINDS = [
  "NEEDS_YOU",
  "CONTINUE_PERSONAL",
  "CONTINUE_SHARED",
] as const;

export type DashboardTaskKind = (typeof DASHBOARD_TASK_KINDS)[number];

export type DashboardTaskType =
  | "incoming_invitation"
  | "discovery_intro"
  | "relationship_advisor_consent"
  | "setup_advisor_consent"
  | "setup_confirmation"
  | "founder_alignment_continue"
  | "values_continue"
  | "read_my_mind_invitation"
  | "read_my_mind_continue"
  | "read_my_mind_reveal"
  | "commitment_lab_continue"
  | "founder_setup_continue";

export type FounderDashboardTask = {
  id: string;
  kind: DashboardTaskKind;
  type: DashboardTaskType;
  href: string;
  createdAt: string;
  contextLabel: string | null;
  personLabel: string | null;
  itemKey: FounderSetupItemKey | null;
  packCount?: number;
};

export type FounderDashboardTaskSignals = {
  currentUserId: string;
  now: string;
  invitations: Array<{
    id: string;
    direction: "sent" | "incoming";
    status: string;
    requiredModules: Array<"base" | "values">;
    inviteeBaseStarted: boolean;
    inviteeBaseSubmitted: boolean;
    inviteeValuesSubmitted: boolean;
    isReportReady: boolean;
    inviterLabel: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
  personal: {
    founderAlignmentStarted: boolean;
    founderAlignmentSubmitted: boolean;
    valuesStarted: boolean;
    valuesSubmitted: boolean;
  };
  discoveryIntros: Array<{
    id: string;
    recipientUserId: string;
    status: string;
    updatedAt: string;
  }>;
  relationships: Array<{
    id: string;
    userAId: string;
    userBId: string;
    teamId: string | null;
    teamLabel: string | null;
    otherFounderLabel: string | null;
  }>;
  relationshipAdvisors: Array<{
    id: string;
    relationshipId: string;
    status: string;
    founderAApproved: boolean;
    founderBApproved: boolean;
    updatedAt: string;
  }>;
  setupAdvisorAccess: Array<{
    grantId: string | null;
    teamId: string;
    teamLabel: string | null;
    status: string;
    accessActive: boolean;
    consentedFounderUserIds: string[];
    updatedAt: string;
  }>;
  setupItems: Array<{
    id: string;
    teamId: string;
    teamLabel: string | null;
    itemKey: FounderSetupItemKey;
    workStatus: string;
    pendingRevisionId: string | null;
    updatedAt: string;
  }>;
  setupConfirmations: Array<{ revisionId: string; userId: string }>;
  commitmentLabs: Array<{
    relationshipId: string;
    updatedAt: string;
  }>;
  readMyMindRounds: Array<{
    id: string;
    teamId: string;
    teamLabel: string | null;
    creatorLabel: string | null;
    handoffReady?: boolean;
    status: string;
    ownParticipantState: string;
    ownAnswerComplete: boolean;
    wholeAnswerComplete: boolean;
    ownRevealComplete: boolean;
    nextRevealPosition: number | null;
    supportedTwoFounderTeam: boolean;
    createdAt: string;
  }>;
};

const KIND_PRIORITY: Record<DashboardTaskKind, number> = {
  NEEDS_YOU: 0,
  CONTINUE_PERSONAL: 1,
  CONTINUE_SHARED: 2,
};

const NEEDS_YOU_PRIORITY: Partial<Record<DashboardTaskType, number>> = {
  incoming_invitation: 0,
  discovery_intro: 1,
  relationship_advisor_consent: 2,
  setup_advisor_consent: 3,
  setup_confirmation: 4,
  read_my_mind_invitation: 2,
};

function isClaimableInvitation(
  invitation: FounderDashboardTaskSignals["invitations"][number],
  now: string
) {
  if (invitation.direction !== "incoming" || invitation.isReportReady) return false;
  if (!["sent", "opened", "accepted"].includes(invitation.status)) return false;
  const expiresAt = Date.parse(invitation.expiresAt);
  if (Number.isFinite(expiresAt) && expiresAt <= Date.parse(now)) return false;
  if (invitation.status === "sent" || invitation.status === "opened") return true;
  if (!invitation.inviteeBaseSubmitted) return true;
  return invitation.requiredModules.includes("values") && !invitation.inviteeValuesSubmitted;
}

function taskOrder(left: FounderDashboardTask, right: FounderDashboardTask) {
  const kindDifference = KIND_PRIORITY[left.kind] - KIND_PRIORITY[right.kind];
  if (kindDifference !== 0) return kindDifference;
  if (left.kind === "NEEDS_YOU" && right.kind === "NEEDS_YOU") {
    const needsDifference =
      (NEEDS_YOU_PRIORITY[left.type] ?? 99) - (NEEDS_YOU_PRIORITY[right.type] ?? 99);
    if (needsDifference !== 0) return needsDifference;
  }
  return right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id);
}

export function sortFounderDashboardTasks(tasks: FounderDashboardTask[]) {
  return [...new Map(tasks.map((task) => [task.id, task])).values()].sort(taskOrder);
}

export function splitFounderDashboardTasks(tasks: FounderDashboardTask[], limit = 3) {
  const sorted = sortFounderDashboardTasks(tasks);
  return {
    initial: sorted.slice(0, limit),
    remaining: sorted.slice(limit),
    hasMore: sorted.length > limit,
  };
}

export function buildFounderDashboardTasks(
  signals: FounderDashboardTaskSignals
): FounderDashboardTask[] {
  const tasks: FounderDashboardTask[] = [];
  const relationshipById = new Map(
    signals.relationships
      .filter(
        (relationship) =>
          relationship.userAId === signals.currentUserId ||
          relationship.userBId === signals.currentUserId
      )
      .map((relationship) => [relationship.id, relationship])
  );

  for (const invitation of signals.invitations) {
    if (!isClaimableInvitation(invitation, signals.now)) continue;
    tasks.push({
      id: `invitation:${invitation.id}`,
      kind: "NEEDS_YOU",
      type: "incoming_invitation",
      href: `/invite/${encodeURIComponent(invitation.id)}/resume`,
      createdAt: invitation.createdAt,
      contextLabel: null,
      personLabel: invitation.inviterLabel,
      itemKey: null,
    });
  }

  for (const intro of signals.discoveryIntros) {
    if (intro.recipientUserId !== signals.currentUserId || intro.status !== "pending") continue;
    tasks.push({
      id: `discovery-intro:${intro.id}`,
      kind: "NEEDS_YOU",
      type: "discovery_intro",
      href: "/discovery/intros",
      createdAt: intro.updatedAt,
      contextLabel: null,
      personLabel: null,
      itemKey: null,
    });
  }

  const readMyMindInvitationsByTeam = new Map<string, FounderDashboardTaskSignals["readMyMindRounds"]>();
  for (const round of signals.readMyMindRounds) {
    if (!round.supportedTwoFounderTeam) continue;
    if (round.status === "forming" && round.ownParticipantState === "pending" && round.handoffReady) {
      const existing = readMyMindInvitationsByTeam.get(round.teamId) ?? [];
      existing.push(round);
      readMyMindInvitationsByTeam.set(round.teamId, existing);
    }
  }
  for (const [teamId, rounds] of readMyMindInvitationsByTeam) {
    const newest = [...rounds].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]!;
    tasks.push({ id: `read-my-mind:${teamId}:invitations`, kind: "NEEDS_YOU", type: "read_my_mind_invitation", href: rounds.length > 1 ? `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind` : `/teams/${encodeURIComponent(teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(newest.id)}`, createdAt: newest.createdAt, contextLabel: newest.teamLabel, personLabel: newest.creatorLabel, itemKey: null, packCount: rounds.length });
  }

  for (const round of signals.readMyMindRounds) {
    if (!round.supportedTwoFounderTeam) continue;
    if (round.status === "forming" && round.ownParticipantState === "joined" && !round.handoffReady && !round.ownAnswerComplete) {
      tasks.push({ id: `read-my-mind:${round.id}`, kind: "CONTINUE_SHARED", type: "read_my_mind_continue", href: `/teams/${encodeURIComponent(round.teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(round.id)}`, createdAt: round.createdAt, contextLabel: round.teamLabel, personLabel: null, itemKey: null });
    } else if (round.status === "active" && round.ownParticipantState === "joined" && !round.ownAnswerComplete) {
      tasks.push({ id: `read-my-mind:${round.id}`, kind: "CONTINUE_SHARED", type: "read_my_mind_continue", href: `/teams/${encodeURIComponent(round.teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(round.id)}`, createdAt: round.createdAt, contextLabel: round.teamLabel, personLabel: null, itemKey: null });
    } else if (round.status === "active" && round.ownParticipantState === "joined" && round.wholeAnswerComplete && !round.ownRevealComplete && round.nextRevealPosition !== null) {
      tasks.push({ id: `read-my-mind:${round.id}`, kind: "CONTINUE_SHARED", type: "read_my_mind_reveal", href: `/teams/${encodeURIComponent(round.teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(round.id)}/reveal/${round.nextRevealPosition}`, createdAt: round.createdAt, contextLabel: round.teamLabel, personLabel: null, itemKey: null });
    }
  }

  for (const advisor of signals.relationshipAdvisors) {
    const relationship = relationshipById.get(advisor.relationshipId);
    if (!relationship || advisor.status === "revoked" || advisor.status === "linked") continue;
    const ownApproval =
      relationship.userAId === signals.currentUserId
        ? advisor.founderAApproved
        : advisor.founderBApproved;
    if (ownApproval) continue;
    tasks.push({
      id: `relationship-advisor:${advisor.id}`,
      kind: "NEEDS_YOU",
      type: "relationship_advisor_consent",
      href: relationship.teamId
        ? `/teams/${encodeURIComponent(relationship.teamId)}#relationship-advisor-access`
        : "/connections",
      createdAt: advisor.updatedAt,
      contextLabel: relationship.teamLabel,
      personLabel: relationship.otherFounderLabel,
      itemKey: null,
    });
  }

  for (const access of signals.setupAdvisorAccess) {
    if (
      !access.grantId ||
      access.status !== "pending" ||
      access.accessActive ||
      access.consentedFounderUserIds.includes(signals.currentUserId)
    ) {
      continue;
    }
    tasks.push({
      id: `setup-advisor:${access.grantId}`,
      kind: "NEEDS_YOU",
      type: "setup_advisor_consent",
      href: `/teams/${encodeURIComponent(access.teamId)}/setup#advisor-setup-access`,
      createdAt: access.updatedAt,
      contextLabel: access.teamLabel,
      personLabel: null,
      itemKey: null,
    });
  }

  const ownConfirmedRevisionIds = new Set(
    signals.setupConfirmations
      .filter((confirmation) => confirmation.userId === signals.currentUserId)
      .map((confirmation) => confirmation.revisionId)
  );
  const teamsWithConcreteTask = new Set(
    tasks
      .filter(
        (task) =>
          task.type === "setup_advisor_consent" ||
          task.type === "relationship_advisor_consent"
      )
      .flatMap((task) => {
        const match = task.href.match(/^\/teams\/([^/#]+)/);
        return match ? [decodeURIComponent(match[1])] : [];
      })
  );

  for (const item of signals.setupItems) {
    if (item.pendingRevisionId) {
      teamsWithConcreteTask.add(item.teamId);
    }
    if (item.pendingRevisionId && !ownConfirmedRevisionIds.has(item.pendingRevisionId)) {
      tasks.push({
        id: `setup-confirmation:${item.pendingRevisionId}:${signals.currentUserId}`,
        kind: "NEEDS_YOU",
        type: "setup_confirmation",
        href: `/teams/${encodeURIComponent(item.teamId)}/setup/${encodeURIComponent(item.itemKey)}`,
        createdAt: item.updatedAt,
        contextLabel: item.teamLabel,
        personLabel: null,
        itemKey: item.itemKey,
      });
    }
  }

  if (signals.personal.founderAlignmentStarted && !signals.personal.founderAlignmentSubmitted) {
    tasks.push({
      id: "personal:founder-alignment",
      kind: "CONTINUE_PERSONAL",
      type: "founder_alignment_continue",
      href: "/me/base",
      createdAt: signals.now,
      contextLabel: null,
      personLabel: null,
      itemKey: null,
    });
  }
  if (signals.personal.valuesStarted && !signals.personal.valuesSubmitted) {
    tasks.push({
      id: "personal:values",
      kind: "CONTINUE_PERSONAL",
      type: "values_continue",
      href: "/me/values",
      createdAt: signals.now,
      contextLabel: null,
      personLabel: null,
      itemKey: null,
    });
  }

  for (const lab of signals.commitmentLabs) {
    const relationship = relationshipById.get(lab.relationshipId);
    if (!relationship?.teamId) continue;
    tasks.push({
      id: `commitment-lab:${lab.relationshipId}`,
      kind: "CONTINUE_SHARED",
      type: "commitment_lab_continue",
      href: `/teams/${encodeURIComponent(relationship.teamId)}/commitment-lab/${encodeURIComponent(lab.relationshipId)}`,
      createdAt: lab.updatedAt,
      contextLabel: relationship.teamLabel,
      personLabel: relationship.otherFounderLabel,
      itemKey: null,
    });
  }

  const setupItemsByTeam = new Map<string, FounderDashboardTaskSignals["setupItems"]>();
  for (const item of signals.setupItems) {
    const existing = setupItemsByTeam.get(item.teamId) ?? [];
    existing.push(item);
    setupItemsByTeam.set(item.teamId, existing);
  }
  for (const [teamId, items] of setupItemsByTeam) {
    if (teamsWithConcreteTask.has(teamId)) continue;
    const activeItem = items
      .filter((item) => item.workStatus === "discussing")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (!activeItem) continue;
    tasks.push({
      id: `founder-setup:${teamId}`,
      kind: "CONTINUE_SHARED",
      type: "founder_setup_continue",
      href: `/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(activeItem.itemKey)}`,
      createdAt: activeItem.updatedAt,
      contextLabel: activeItem.teamLabel,
      personLabel: null,
      itemKey: activeItem.itemKey,
    });
  }

  return sortFounderDashboardTasks(tasks);
}
