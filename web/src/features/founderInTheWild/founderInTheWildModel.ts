import {
  FOUNDER_IN_THE_WILD_PACK,
  getFounderInTheWildPack,
  type FounderInTheWildPack,
  type FounderInTheWildResponseType,
  type FounderInTheWildScenario,
} from "./founderInTheWildContent";

export type FounderInTheWildTeam = {
  id: string;
  name: string | null;
  members: Array<{ userId: string; displayName: string | null; avatarId: string | null; avatarUrl: string | null }>;
};

export type FounderInTheWildSlot = {
  responseType: FounderInTheWildResponseType;
  assignmentId: string;
  choiceKeys: string[] | null;
  lockedAt: string | null;
};

export type FounderInTheWildPromptState = {
  roundPromptId: string;
  position: number;
  content: FounderInTheWildScenario;
  move: FounderInTheWildSlot;
  matters: FounderInTheWildSlot;
  need: FounderInTheWildSlot;
  /**
   * Der Tipp, wie der andere entscheiden wuerde - null in Packs, die ihn
   * nicht haben. Er haengt am Pack und nicht am Spiel: Ihn nachtraeglich in
   * ein laufendes Pack zu legen haette jede angefangene Runde unvollstaendig
   * gemacht (siehe Migration 20261002120000).
   */
  guess: FounderInTheWildSlot | null;
  complete: boolean;
};

export type FounderInTheWildRound = {
  id: string;
  status: "active" | "completed";
  team: FounderInTheWildTeam;
  createdByUserId: string;
  partner: FounderInTheWildTeam["members"][number];
  pack: FounderInTheWildPack;
  prompts: FounderInTheWildPromptState[];
  nextPromptPosition: number | null;
  ownStarted: boolean;
  ownAnswerComplete: boolean;
  partnerStarted: boolean;
  partnerAnswerComplete: boolean;
  wholeRoundAnswerComplete: boolean;
  openedPromptPositions: number[];
  canDiscard: boolean;
  canDecline: boolean;
  bothStarted: boolean;
  conversationMarkers: Array<{ roundPromptId: string; participantUserIds: string[] }>;
};

type RevealSide = { move: string[]; matters: string[]; need: string[]; guess: string[] };

export type FounderInTheWildReveal = {
  prompt: FounderInTheWildPromptState;
  own: RevealSide;
  partner: RevealSide;
  /**
   * Ob der eigene Tipp den Zug des anderen getroffen hat.
   *
   * Null, wenn in diesem Pack nicht geraten wird - und ausdruecklich nicht
   * "false", damit die Ansicht ein fehlendes Raten nicht als Fehlschuss zeigt.
   */
  ownGuessHit: boolean | null;
  partnerGuessHit: boolean | null;
};

type Row = Record<string, unknown>;

export function buildFounderInTheWildRound(params: {
  currentUserId: string;
  team: FounderInTheWildTeam;
  round: Row;
  participants: Row[];
  prompts: Row[];
  assignments: Row[];
  responses: Row[];
  receipts: Row[];
  markers: Row[];
  answerPhaseComplete: boolean;
  ownStarted?: boolean;
  ownAnswerComplete?: boolean;
  partnerStarted?: boolean;
  partnerAnswerComplete?: boolean;
  canDiscard?: boolean;
  canDecline?: boolean;
  bothStarted?: boolean;
}): FounderInTheWildRound | null {
  const pack = getFounderInTheWildPack(
    typeof params.round.pack_key === "string" ? params.round.pack_key : null
  );
  if (params.round.experience_key !== FOUNDER_IN_THE_WILD_PACK.experienceKey || !pack || params.round.pack_version !== pack.version) return null;
  const status = params.round.status === "active" || params.round.status === "completed" ? params.round.status : null;
  const ownParticipant = params.participants.find((row) => row.founder_user_id === params.currentUserId && row.state === "joined");
  const partnerParticipant = params.participants.find((row) => row.founder_user_id !== params.currentUserId && row.state === "joined");
  const partner = params.team.members.find((member) => member.userId === partnerParticipant?.founder_user_id)
    ?? (typeof partnerParticipant?.founder_user_id === "string" ? { userId: partnerParticipant.founder_user_id, displayName: null, avatarId: null, avatarUrl: null } : null);
  if (!status || params.participants.length !== 2 || !ownParticipant || !partner || params.team.members.length !== 2) return null;

  const promptStates = [...params.prompts].sort((a, b) => Number(a.position) - Number(b.position)).flatMap((row) => {
    const content = pack.scenarios.find((scenario) => scenario.key === row.prompt_key && scenario.position === row.position);
    const assignment = params.assignments.find((entry) => entry.round_prompt_id === row.id && entry.target_user_id === params.currentUserId);
    if (!content || typeof row.id !== "string" || typeof assignment?.id !== "string") return [];
    const slot = (responseType: FounderInTheWildResponseType): FounderInTheWildSlot => {
      const response = params.responses.find((entry) => entry.prompt_assignment_id === assignment.id && entry.respondent_user_id === params.currentUserId && entry.response_type === responseType);
      return { responseType, assignmentId: assignment.id as string, choiceKeys: Array.isArray(response?.choice_keys) ? response.choice_keys as string[] : null, lockedAt: typeof response?.locked_at === "string" ? response.locked_at : null };
    };
    const move = slot("move"); const matters = slot("matters"); const need = slot("need");
    const guess = pack.hasGuess ? slot("guess") : null;
    return [{
      roundPromptId: row.id,
      position: content.position,
      content,
      move,
      matters,
      need,
      guess,
      // Dieselbe Rechnung wie in der Datenbank: Ein Pack mit Tipp ist erst
      // fertig, wenn auch der Tipp steht. Waere das hier laxer, sagte die
      // Seite "fertig" und der Reveal bliebe verschlossen.
      complete: Boolean(move.lockedAt && matters.lockedAt && need.lockedAt && (!guess || guess.lockedAt)),
    }];
  });
  if (promptStates.length !== pack.scenarios.length) return null;
  const markerMap = new Map<string, string[]>();
  for (const marker of params.markers) if (typeof marker.round_prompt_id === "string" && typeof marker.participant_user_id === "string") markerMap.set(marker.round_prompt_id, [...(markerMap.get(marker.round_prompt_id) ?? []), marker.participant_user_id]);
  return {
    id: String(params.round.id), status, team: params.team, createdByUserId: String(params.round.created_by_user_id), partner,
    pack,
    prompts: promptStates,
    nextPromptPosition: promptStates.find((prompt) => !prompt.complete)?.position ?? null,
    ownStarted: Boolean(params.ownStarted),
    ownAnswerComplete: params.ownAnswerComplete ?? promptStates.every((prompt) => prompt.complete),
    partnerStarted: Boolean(params.partnerStarted),
    partnerAnswerComplete: Boolean(params.partnerAnswerComplete),
    wholeRoundAnswerComplete: params.answerPhaseComplete,
    canDiscard: Boolean(params.canDiscard),
    canDecline: Boolean(params.canDecline),
    bothStarted: Boolean(params.bothStarted),
    openedPromptPositions: params.receipts.flatMap((receipt) => {
      const prompt = promptStates.find((entry) => entry.roundPromptId === receipt.round_prompt_id);
      return prompt ? [prompt.position] : [];
    }),
    conversationMarkers: [...markerMap].map(([roundPromptId, participantUserIds]) => ({ roundPromptId, participantUserIds })),
  };
}

export function buildFounderInTheWildReveal(round: FounderInTheWildRound, currentUserId: string, position: number, rows: Row[]): FounderInTheWildReveal | null {
  const prompt = round.prompts.find((entry) => entry.position === position);
  if (!prompt) return null;
  const choices = (userId: string, responseType: string) => {
    const row = rows.find((entry) => entry.respondent_user_id === userId && entry.response_type === responseType);
    return Array.isArray(row?.choice_keys) ? row.choice_keys as string[] : [];
  };
  const response = (userId: string): RevealSide => ({
    move: choices(userId, "move"),
    matters: choices(userId, "matters"),
    need: choices(userId, "need"),
    guess: choices(userId, "guess"),
  });
  const own = response(currentUserId); const partner = response(round.partner.userId);
  const complete = (side: RevealSide) =>
    side.move.length === 1 && side.matters.length >= 1 && side.need.length === 1
      && (!round.pack.hasGuess || side.guess.length === 1);
  if (!complete(own) || !complete(partner)) return null;

  // Getroffen heisst: Mein Tipp ist der Zug, den der andere wirklich gewaehlt
  // hat. Ohne Raten bleibt es null, nicht false.
  const hit = (guess: string[], actualMove: string[]) =>
    round.pack.hasGuess && guess.length === 1 && actualMove.length === 1 ? guess[0] === actualMove[0] : null;

  return {
    prompt,
    own,
    partner,
    ownGuessHit: hit(own.guess, partner.move),
    partnerGuessHit: hit(partner.guess, own.move),
  };
}
