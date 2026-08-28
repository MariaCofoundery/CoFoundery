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
  const partner = partnerParticipant
    ? params.team.members.find((member) => member.userId === partnerParticipant.founder_user_id)
    : null;

  if (
    !status ||
    !pack ||
    params.round.founder_team_id !== params.team.id ||
    params.team.members.length !== 2 ||
    params.participants.length !== 2 ||
    !ownState ||
    !partner
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
