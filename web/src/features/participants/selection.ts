export type ParticipantSelectionRow = {
  id: string;
  role: string;
  user_id: string | null;
  invited_email: string | null;
  completed_at: string | null;
  created_at: string | null;
};

export function buildResponseCountByParticipant(
  rows: Array<{ participant_id: string }>
) {
  const responseCountByParticipant = new Map<string, number>();
  for (const row of rows) {
    responseCountByParticipant.set(
      row.participant_id,
      (responseCountByParticipant.get(row.participant_id) ?? 0) + 1
    );
  }
  return responseCountByParticipant;
}

export function selectParticipantB(
  participants: ParticipantSelectionRow[],
  options?: {
    primary?: ParticipantSelectionRow | undefined;
    responseCountByParticipant?: Map<string, number>;
  }
) {
  const primary =
    options?.primary ??
    selectParticipantA(participants, { responseCountByParticipant: options?.responseCountByParticipant });
  const candidates = participants.filter((row) => row.role === "B" || row.role === "partner");
  if (candidates.length === 0) return undefined;

  const responseCountByParticipant = options?.responseCountByParticipant ?? new Map<string, number>();
  const primaryUserId = primary?.user_id ?? null;

  return [...candidates].sort((a, b) => {
    return scoreParticipant(b, primaryUserId, responseCountByParticipant)
      - scoreParticipant(a, primaryUserId, responseCountByParticipant);
  })[0];
}

export function selectParticipantA(
  participants: ParticipantSelectionRow[],
  options?: {
    responseCountByParticipant?: Map<string, number>;
  }
) {
  const candidates = participants.filter((row) => row.role === "A");
  if (candidates.length === 0) return undefined;
  const responseCountByParticipant = options?.responseCountByParticipant ?? new Map<string, number>();

  return [...candidates].sort((a, b) => {
    return scorePrimaryParticipant(b, responseCountByParticipant)
      - scorePrimaryParticipant(a, responseCountByParticipant);
  })[0];
}

function scoreParticipant(
  participant: ParticipantSelectionRow,
  primaryUserId: string | null,
  responseCountByParticipant: Map<string, number>
) {
  const completed = participant.completed_at ? 1 : 0;
  const responses = responseCountByParticipant.get(participant.id) ?? 0;
  const linked = participant.user_id ? 1 : 0;
  const linkedDifferentUser =
    primaryUserId && participant.user_id && participant.user_id !== primaryUserId ? 1 : 0;
  const invite = participant.invited_email ? 1 : 0;
  const sameUserPenalty =
    primaryUserId && participant.user_id && participant.user_id === primaryUserId ? -1000 : 0;
  const recency = timestampValue(participant.created_at) / 1_000_000_000_000;

  return (
    completed * 1000 +
    responses * 100 +
    linkedDifferentUser * 80 +
    linked * 20 +
    invite * 5 +
    recency +
    sameUserPenalty
  );
}

function scorePrimaryParticipant(
  participant: ParticipantSelectionRow,
  responseCountByParticipant: Map<string, number>
) {
  const completed = participant.completed_at ? 1 : 0;
  const responses = responseCountByParticipant.get(participant.id) ?? 0;
  const linked = participant.user_id ? 1 : 0;
  const recency = timestampValue(participant.created_at) / 1_000_000_000_000;

  return completed * 1000 + responses * 100 + linked * 20 + recency;
}

function timestampValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
