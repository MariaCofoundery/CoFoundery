export type ParticipantLike = {
  id: string;
  role: string;
  user_id: string | null;
  invited_email: string | null;
  completed_at: string | null;
  created_at: string | null;
};

// Backward-compatible alias for existing imports/call sites.
export type ParticipantSelectionRow = ParticipantLike;

// TEMP compatibility helper for older call sites.
export function buildResponseCountByParticipant(rows: Array<{ participant_id: string }>) {
  const countByParticipant = new Map<string, number>();
  for (const row of rows) {
    countByParticipant.set(
      row.participant_id,
      (countByParticipant.get(row.participant_id) ?? 0) + 1
    );
  }
  return countByParticipant;
}

export function selectParticipantB<T extends ParticipantLike>(
  participants: T[],
  options?: {
    primary?: T | undefined;
    responseCountByParticipant?: Map<string, number>;
  }
) {
  const primary = options?.primary ?? selectParticipantA(participants, options);
  const primaryUserId = primary?.user_id ?? null;

  const candidates = participants.filter((row) => row.role === "B" || row.role === "partner");
  if (candidates.length === 0) return undefined;

  return [...candidates].sort((a, b) => scoreSecondary(b, primaryUserId) - scoreSecondary(a, primaryUserId))[0];
}

export function selectParticipantA<T extends ParticipantLike>(
  participants: T[],
  options?: {
    responseCountByParticipant?: Map<string, number>;
  }
) {
  void options;
  const candidates = participants.filter((row) => row.role === "A");
  if (candidates.length === 0) return undefined;

  return [...candidates].sort((a, b) => scorePrimary(b) - scorePrimary(a))[0];
}

function scoreSecondary(participant: ParticipantLike, primaryUserId: string | null) {
  const completed = participant.completed_at ? 1 : 0;
  const linked = participant.user_id ? 1 : 0;
  const linkedDifferentUser =
    primaryUserId && participant.user_id && participant.user_id !== primaryUserId ? 1 : 0;
  const invite = participant.invited_email ? 1 : 0;
  const sameUserPenalty =
    primaryUserId && participant.user_id && participant.user_id === primaryUserId ? -1000 : 0;
  const recency = timestampValue(participant.created_at) / 1_000_000_000_000;

  return completed * 1000 + linkedDifferentUser * 80 + linked * 20 + invite * 5 + recency + sameUserPenalty;
}

function scorePrimary(participant: ParticipantLike) {
  const completed = participant.completed_at ? 1 : 0;
  const linked = participant.user_id ? 1 : 0;
  const recency = timestampValue(participant.created_at) / 1_000_000_000_000;

  return completed * 1000 + linked * 20 + recency;
}

function timestampValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
