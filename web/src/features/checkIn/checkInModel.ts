/**
 * Check-in eines Teams: gilt das noch so, wie ihr es bestaetigt habt?
 *
 * Es gibt keine Punkte, keine Gesamtbewertung und keinen "Teamzustand". Gezeigt
 * wird nur, wo Antworten auseinandergehen oder jemand sprechen moechte; Themen,
 * bei denen alle "Ja, so" gesagt haben, bleiben ruhig.
 */
export const CHECK_IN_ANSWERS = ["same", "partly", "talk"] as const;
export type CheckInAnswer = (typeof CHECK_IN_ANSWERS)[number];

export const CHECK_IN_INTERVALS = [30, 60, 90] as const;
export type CheckInInterval = (typeof CHECK_IN_INTERVALS)[number];
export const DEFAULT_CHECK_IN_INTERVAL: CheckInInterval = 90;

export const CHECK_IN_STATUSES = ["open", "closed", "skipped"] as const;
export type CheckInStatus = (typeof CHECK_IN_STATUSES)[number];

export const CHECK_IN_LIMITS = { note: 200, customTopic: 160, retroAnswer: 3000, retroQuestion: 200, items: 20 } as const;

export type CheckInItem = { t: string; on: boolean };

export type CheckInTopic = {
  id: string;
  position: number;
  /** Setup-Thema oder null bei einem eigenen Punkt. */
  itemKey: string | null;
  customText: string | null;
  included: boolean;
};

export type CheckInAnswerRow = { topicId: string; userId: string; answer: CheckInAnswer; note: string };

export type CheckIn = {
  id: string;
  teamId: string;
  status: CheckInStatus;
  startedAt: string;
  closedAt: string | null;
  retroQuestions: CheckInItem[];
  retroOfferedBy: string | null;
};

export type CheckInRetroInvite = { userId: string; response: "in" | "out" | null };
export type CheckInRetroAnswer = { userId: string; answers: Array<{ q: string; a: string }> };

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null =>
  typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;

export const isCheckInAnswer = (value: unknown) => oneOf(CHECK_IN_ANSWERS, value);
export const isCheckInStatus = (value: unknown) => oneOf(CHECK_IN_STATUSES, value);
export const isCheckInInterval = (value: unknown): CheckInInterval | null =>
  typeof value === "number" && (CHECK_IN_INTERVALS as readonly number[]).includes(value) ? (value as CheckInInterval) : null;

export function normalizeCheckInItems(value: unknown): CheckInItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is CheckInItem =>
      Boolean(item) && typeof item === "object" &&
      typeof (item as { t?: unknown }).t === "string" && typeof (item as { on?: unknown }).on === "boolean")
    .map((item) => ({ t: item.t.slice(0, CHECK_IN_LIMITS.retroQuestion), on: item.on }))
    .slice(0, CHECK_IN_LIMITS.items);
}

export function normalizeRetroAnswers(value: unknown): Array<{ q: string; a: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { q: string; a: string } =>
      Boolean(item) && typeof item === "object" &&
      typeof (item as { q?: unknown }).q === "string" && typeof (item as { a?: unknown }).a === "string")
    .map((item) => ({ q: item.q, a: item.a }))
    .slice(0, CHECK_IN_LIMITS.items);
}

/**
 * Wann ist der naechste Check-in dran?
 *
 * Ab dem letzten abgeschlossenen oder uebersprungenen Check-in; gab es noch
 * keinen, ab der aeltesten Bestaetigung einer Vereinbarung. Ohne beides gibt es
 * nichts zu pruefen und damit kein Datum.
 */
export function nextCheckInDue(params: {
  intervalDays: number;
  lastClosedAt: string | null;
  earliestConfirmedAt: string | null;
}): Date | null {
  const base = params.lastClosedAt ?? params.earliestConfirmedAt;
  if (!base) return null;
  const due = new Date(base);
  due.setUTCDate(due.getUTCDate() + params.intervalDays);
  return due;
}

export const isCheckInDue = (due: Date | null, now: Date = new Date()) => due !== null && due.getTime() <= now.getTime();

/** Ganze Tage bis zum Datum, aufgerundet; nie unter null. */
export const daysUntil = (date: Date, now: Date = new Date()) =>
  Math.max(0, Math.ceil((date.getTime() - now.getTime()) / 86_400_000));

export type TopicSummary = {
  topicId: string;
  /** Wer hat was gesagt, in der Reihenfolge der Mitglieder. */
  answers: Array<{ userId: string; answer: CheckInAnswer; note: string }>;
  /** Es gibt etwas zu sehen: Antworten gehen auseinander, oder jemand moechte sprechen. */
  notable: boolean;
};

/**
 * Das Ergebnis eines abgeschlossenen Check-ins. Ein Thema ist nur auffaellig,
 * wenn die Antworten verschieden sind oder jemand "Wir sollten sprechen" gewaehlt
 * hat. Haben alle "Ja, so" gesagt, bleibt es ruhig.
 */
export function summarizeCheckIn(
  topics: readonly CheckInTopic[],
  answers: readonly CheckInAnswerRow[],
  memberIds: readonly string[]
): TopicSummary[] {
  return topics
    .filter((topic) => topic.included)
    .sort((a, b) => a.position - b.position)
    .map((topic) => {
      const given = memberIds.flatMap((userId) => {
        const row = answers.find((entry) => entry.topicId === topic.id && entry.userId === userId);
        return row ? [{ userId, answer: row.answer, note: row.note }] : [];
      });
      const distinct = new Set(given.map((entry) => entry.answer));
      return {
        topicId: topic.id,
        answers: given,
        notable: distinct.size > 1 || given.some((entry) => entry.answer === "talk"),
      };
    });
}

export const checkInHref = (teamId: string, result?: string) => {
  const path = `/teams/${encodeURIComponent(teamId)}/check-in`;
  return result ? `${path}?result=${encodeURIComponent(result)}` : path;
};

/** Zum Thema im Setup, damit "Wir sollten sprechen" dort weitergeht. */
export const checkInSetupTopicHref = (teamId: string, itemKey: string) =>
  `/teams/${encodeURIComponent(teamId)}/setup/${encodeURIComponent(itemKey)}`;

export const retroParticipants = (invites: readonly CheckInRetroInvite[]) =>
  invites.filter((invite) => invite.response === "in").map((invite) => invite.userId);

export const isRetroComplete = (invites: readonly CheckInRetroInvite[], answers: readonly CheckInRetroAnswer[]) => {
  const participants = retroParticipants(invites);
  return participants.length >= 2 && participants.every((id) => answers.some((entry) => entry.userId === id));
};
