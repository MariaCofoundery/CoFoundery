import {
  getReadMyMindPack,
  type ReadMyMindPack,
  type ReadMyMindPrompt,
  type ReadMyMindResponseContract,
} from "@/features/collaborationLab/readMyMindContent";

export type ReadMyMindRoundStatus = "forming" | "active" | "completed" | "abandoned";
export type ReadMyMindParticipantState = "pending" | "joined" | "declined";
export type ReadMyMindResponseType = "self" | "guess" | "need";

export type ReadMyMindTeamMember = {
  userId: string;
  displayName: string | null;
  avatarId: string | null;
  avatarUrl: string | null;
};

export type ReadMyMindTeamContext = {
  id: string;
  name: string | null;
  members: ReadMyMindTeamMember[];
};

export type ReadMyMindRoundRow = {
  id: string;
  founder_team_id: string;
  pack_key: string;
  pack_version: number;
  created_by_user_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  abandoned_at: string | null;
};

export type ReadMyMindParticipantRow = {
  round_id: string;
  founder_user_id: string;
  position: number;
  state: string;
  joined_at: string | null;
};

export type ReadMyMindRoundPromptRow = {
  id: string;
  round_id: string;
  prompt_key: string;
  prompt_version: number;
  position: number;
};

export type ReadMyMindAssignmentRow = {
  id: string;
  round_id: string;
  round_prompt_id: string;
  target_user_id: string;
};

export type ReadMyMindOwnResponseRow = {
  id: string;
  round_id: string;
  prompt_assignment_id: string;
  respondent_user_id: string;
  response_type: string;
  choice_keys: string[];
  locked_at: string;
};

export type ReadMyMindOwnReceiptRow = {
  round_id: string;
  round_prompt_id: string;
  participant_user_id: string;
  opened_at: string;
};

export type ReadMyMindConversationMarkerRow = {
  round_id: string;
  round_prompt_id: string;
  participant_user_id: string;
  created_at: string;
};

export type ReadMyMindConversationMarker = {
  roundPromptId: string;
  participantUserIds: string[];
};

export type ReadMyMindRevealResponseRow = {
  round_prompt_id: string;
  prompt_assignment_id: string;
  target_user_id: string;
  respondent_user_id: string;
  response_type: string;
  choice_keys: string[];
  locked_at: string;
};

export type ReadMyMindOwnSlot = {
  responseType: ReadMyMindResponseType;
  assignmentId: string;
  contract: ReadMyMindResponseContract;
  lockedChoiceKeys: string[] | null;
  lockedAt: string | null;
};

export type ReadMyMindPromptState = {
  roundPromptId: string;
  position: number;
  content: ReadMyMindPrompt;
  self: ReadMyMindOwnSlot;
  guess: ReadMyMindOwnSlot;
  need: ReadMyMindOwnSlot | null;
  complete: boolean;
};

export type ReadMyMindRoundReadModel = {
  id: string;
  team: ReadMyMindTeamContext;
  status: ReadMyMindRoundStatus;
  pack: ReadMyMindPack;
  createdAt: string;
  completedAt: string | null;
  abandonedAt: string | null;
  ownParticipantState: ReadMyMindParticipantState;
  partner: ReadMyMindTeamMember;
  prompts: ReadMyMindPromptState[];
  nextPromptPosition: number | null;
  ownAnswerComplete: boolean;
  wholeRoundAnswerComplete: boolean;
  openedPromptPositions: number[];
  nextRevealPosition: number | null;
  ownRevealComplete: boolean;
  conversationMarkers: ReadMyMindConversationMarker[];
};

function participantState(value: string): ReadMyMindParticipantState | null {
  return value === "pending" || value === "joined" || value === "declined" ? value : null;
}

function roundStatus(value: string): ReadMyMindRoundStatus | null {
  return value === "forming" || value === "active" || value === "completed" || value === "abandoned"
    ? value
    : null;
}

function ownSlot(params: {
  responseType: ReadMyMindResponseType;
  assignmentId: string;
  contract: ReadMyMindResponseContract;
  currentUserId: string;
  responses: ReadMyMindOwnResponseRow[];
}): ReadMyMindOwnSlot {
  const response = params.responses.find(
    (row) =>
      row.respondent_user_id === params.currentUserId &&
      row.prompt_assignment_id === params.assignmentId &&
      row.response_type === params.responseType
  );
  return {
    responseType: params.responseType,
    assignmentId: params.assignmentId,
    contract: params.contract,
    lockedChoiceKeys: response ? [...response.choice_keys] : null,
    lockedAt: response?.locked_at ?? null,
  };
}

export function buildReadMyMindRoundReadModel(params: {
  currentUserId: string;
  team: ReadMyMindTeamContext;
  round: ReadMyMindRoundRow;
  participants: ReadMyMindParticipantRow[];
  roundPrompts: ReadMyMindRoundPromptRow[];
  assignments: ReadMyMindAssignmentRow[];
  ownResponses: ReadMyMindOwnResponseRow[];
  wholeRoundAnswerComplete: boolean;
  ownReceipts?: ReadMyMindOwnReceiptRow[];
  conversationMarkers?: ReadMyMindConversationMarkerRow[];
}): ReadMyMindRoundReadModel | null {
  const status = roundStatus(params.round.status);
  const pack = getReadMyMindPack(params.round.pack_key, params.round.pack_version);
  const ownParticipant = params.participants.find(
    (participant) => participant.founder_user_id === params.currentUserId
  );
  const ownState = ownParticipant ? participantState(ownParticipant.state) : null;
  const partnerParticipant = params.participants.find(
    (participant) => participant.founder_user_id !== params.currentUserId
  );
  const currentPartner = partnerParticipant
    ? params.team.members.find((member) => member.userId === partnerParticipant.founder_user_id)
    : null;
  const partner = partnerParticipant
    ? currentPartner ?? {
        userId: partnerParticipant.founder_user_id,
        displayName: null,
        avatarId: null,
        avatarUrl: null,
      }
    : null;
  const currentMemberIds = new Set(params.team.members.map((member) => member.userId));
  const hasSupportedLiveMembership =
    params.team.members.length === 2 &&
    params.participants.every((participant) => currentMemberIds.has(participant.founder_user_id));
  const hasSupportedCompletedParticipants =
    params.participants.length === 2 &&
    params.participants.every((participant) => participant.state === "joined");

  if (
    !status ||
    !pack ||
    params.round.founder_team_id !== params.team.id ||
    params.participants.length !== 2 ||
    !ownState ||
    !partner ||
    !currentMemberIds.has(params.currentUserId) ||
    (status === "completed" ? !hasSupportedCompletedParticipants : !hasSupportedLiveMembership)
  ) {
    return null;
  }

  // Prompt rows are intentionally hidden from pending participants by RLS. A forming
  // round still needs a narrow invitation/waiting projection, without answer slots.
  if (status === "forming" || status === "abandoned") {
    return {
      id: params.round.id,
      team: params.team,
      status,
      pack,
      createdAt: params.round.created_at,
      completedAt: params.round.completed_at,
      abandonedAt: params.round.abandoned_at,
      ownParticipantState: ownState,
      partner,
      prompts: [],
      nextPromptPosition: null,
      ownAnswerComplete: false,
      wholeRoundAnswerComplete: false,
      openedPromptPositions: [],
      nextRevealPosition: null,
      ownRevealComplete: false,
      conversationMarkers: [],
    };
  }

  // RLS already limits response SELECT to the caller. Keep that boundary explicit in
  // the pure projection as defense in depth for mocked and future data sources.
  const ownResponses = params.ownResponses.filter(
    (response) => response.respondent_user_id === params.currentUserId
  );
  const promptStates = [...params.roundPrompts]
    .sort((left, right) => left.position - right.position)
    .flatMap<ReadMyMindPromptState>((roundPrompt) => {
      const content = pack.prompts.find(
        (prompt) =>
          prompt.key === roundPrompt.prompt_key &&
          prompt.version === roundPrompt.prompt_version &&
          prompt.position === roundPrompt.position
      );
      const selfAssignment = params.assignments.find(
        (assignment) =>
          assignment.round_prompt_id === roundPrompt.id &&
          assignment.target_user_id === params.currentUserId
      );
      const partnerAssignment = params.assignments.find(
        (assignment) =>
          assignment.round_prompt_id === roundPrompt.id &&
          assignment.target_user_id === partner.userId
      );
      if (!content || !selfAssignment || !partnerAssignment) return [];

      const self = ownSlot({
        responseType: "self",
        assignmentId: selfAssignment.id,
        contract: content.selfGuess,
        currentUserId: params.currentUserId,
        responses: ownResponses,
      });
      const guess = ownSlot({
        responseType: "guess",
        assignmentId: partnerAssignment.id,
        contract: content.selfGuess,
        currentUserId: params.currentUserId,
        responses: ownResponses,
      });
      const need = content.needMode === "required" && content.need
        ? ownSlot({
            responseType: "need",
            assignmentId: partnerAssignment.id,
            contract: content.need,
            currentUserId: params.currentUserId,
            responses: ownResponses,
          })
        : null;
      return [{
        roundPromptId: roundPrompt.id,
        position: roundPrompt.position,
        content,
        self,
        guess,
        need,
        complete: Boolean(self.lockedAt && guess.lockedAt && (!need || need.lockedAt)),
      }];
    });

  if (promptStates.length !== pack.prompts.length) return null;
  const nextPrompt = promptStates.find((prompt) => !prompt.complete) ?? null;
  const ownReceiptPromptIds = new Set(
    (params.ownReceipts ?? [])
      .filter((receipt) => receipt.participant_user_id === params.currentUserId)
      .map((receipt) => receipt.round_prompt_id)
  );
  const openedPromptPositions = promptStates
    .filter((prompt) => ownReceiptPromptIds.has(prompt.roundPromptId))
    .map((prompt) => prompt.position);
  const nextReveal = promptStates.find(
    (prompt) => !ownReceiptPromptIds.has(prompt.roundPromptId)
  );
  const participantIds = new Set(params.participants.map((participant) => participant.founder_user_id));
  const promptIds = new Set(promptStates.map((prompt) => prompt.roundPromptId));
  const markersByPrompt = new Map<string, Set<string>>();
  for (const marker of params.conversationMarkers ?? []) {
    if (
      marker.round_id !== params.round.id ||
      !promptIds.has(marker.round_prompt_id) ||
      !participantIds.has(marker.participant_user_id)
    ) continue;
    const markerParticipants = markersByPrompt.get(marker.round_prompt_id) ?? new Set<string>();
    markerParticipants.add(marker.participant_user_id);
    markersByPrompt.set(marker.round_prompt_id, markerParticipants);
  }
  return {
    id: params.round.id,
    team: params.team,
    status,
    pack,
    createdAt: params.round.created_at,
    completedAt: params.round.completed_at,
    abandonedAt: params.round.abandoned_at,
    ownParticipantState: ownState,
    partner,
    prompts: promptStates,
    nextPromptPosition: nextPrompt?.position ?? null,
    ownAnswerComplete: promptStates.every((prompt) => prompt.complete),
    wholeRoundAnswerComplete: params.wholeRoundAnswerComplete,
    openedPromptPositions,
    nextRevealPosition: nextReveal?.position ?? null,
    ownRevealComplete: promptStates.length > 0 && openedPromptPositions.length === promptStates.length,
    conversationMarkers: [...markersByPrompt.entries()].map(([roundPromptId, markerParticipants]) => ({
      roundPromptId,
      participantUserIds: [...markerParticipants],
    })),
  };
}

export function haveExactChoiceSet(left: string[], right: string[]) {
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.length === rightSorted.length && leftSorted.every((choice, index) => choice === rightSorted[index]);
}

export type ReadMyMindPromptReveal = {
  roundPromptId: string;
  position: number;
  content: ReadMyMindPrompt;
  ownPerspective: { self: string[]; partnerGuess: string[]; exact: boolean };
  partnerPerspective: { self: string[]; ownGuess: string[]; exact: boolean };
  needs: { own: string[]; partner: string[] } | null;
};

export function buildReadMyMindPromptReveal(params: {
  round: ReadMyMindRoundReadModel;
  currentUserId: string;
  rows: ReadMyMindRevealResponseRow[];
  position: number;
}): ReadMyMindPromptReveal | null {
  const prompt = params.round.prompts.find((entry) => entry.position === params.position);
  if (!prompt || !params.round.wholeRoundAnswerComplete || !params.round.openedPromptPositions.includes(params.position)) return null;
  const rows = params.rows.filter((row) => row.round_prompt_id === prompt.roundPromptId);
  const find = (targetUserId: string, respondentUserId: string, responseType: ReadMyMindResponseType) =>
    rows.find((row) => row.target_user_id === targetUserId && row.respondent_user_id === respondentUserId && row.response_type === responseType)?.choice_keys ?? null;
  const ownSelf = find(params.currentUserId, params.currentUserId, "self");
  const partnerGuessOwn = find(params.currentUserId, params.round.partner.userId, "guess");
  const partnerSelf = find(params.round.partner.userId, params.round.partner.userId, "self");
  const ownGuessPartner = find(params.round.partner.userId, params.currentUserId, "guess");
  if (!ownSelf || !partnerGuessOwn || !partnerSelf || !ownGuessPartner) return null;
  const ownNeed = prompt.need ? find(params.round.partner.userId, params.currentUserId, "need") : null;
  const partnerNeed = prompt.need ? find(params.currentUserId, params.round.partner.userId, "need") : null;
  if (prompt.need && (!ownNeed || !partnerNeed)) return null;
  return {
    roundPromptId: prompt.roundPromptId,
    position: prompt.position,
    content: prompt.content,
    ownPerspective: { self: ownSelf, partnerGuess: partnerGuessOwn, exact: haveExactChoiceSet(ownSelf, partnerGuessOwn) },
    partnerPerspective: { self: partnerSelf, ownGuess: ownGuessPartner, exact: haveExactChoiceSet(partnerSelf, ownGuessPartner) },
    needs: ownNeed && partnerNeed ? { own: ownNeed, partner: partnerNeed } : null,
  };
}

export function isValidReadMyMindSelection(
  contract: ReadMyMindResponseContract,
  choiceKeys: string[]
) {
  const unique = [...new Set(choiceKeys)];
  const allowed = new Set(contract.choices.map((choice) => choice.key));
  return (
    unique.length === choiceKeys.length &&
    unique.length >= contract.minSelections &&
    unique.length <= contract.maxSelections &&
    unique.every((choice) => allowed.has(choice))
  );
}

export function fillReadMyMindTarget(template: string, target: string) {
  return template.replaceAll("{target}", target);
}
