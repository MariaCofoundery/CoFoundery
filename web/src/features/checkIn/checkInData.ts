import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import {
  DEFAULT_CHECK_IN_INTERVAL,
  isCheckInAnswer,
  isCheckInInterval,
  isCheckInStatus,
  nextCheckInDue,
  normalizeCheckInItems,
  normalizeRetroAnswers,
  type CheckIn,
  type CheckInAnswerRow,
  type CheckInRetroAnswer,
  type CheckInRetroInvite,
  type CheckInTopic,
} from "@/features/checkIn/checkInModel";

type Client = Awaited<ReturnType<typeof createClient>>;

export type CheckInDetail = {
  checkIn: CheckIn;
  topics: CheckInTopic[];
  /** Was die aufrufende Person sehen darf: eigene immer, die anderen erst nach Abgabe aller. */
  answers: CheckInAnswerRow[];
  submittedUserIds: string[];
  retroInvites: CheckInRetroInvite[];
  retroAnswers: CheckInRetroAnswer[];
  /** Der bestaetigte Text zum Zeitpunkt des Starts, je Setup-Thema. */
  agreedText: Record<string, { note: string; confirmedAt: string | null }>;
};

function toCheckIn(row: Record<string, unknown>): CheckIn | null {
  const status = isCheckInStatus(row.status);
  if (!status) return null;
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    status,
    startedAt: String(row.started_at),
    closedAt: typeof row.closed_at === "string" ? row.closed_at : null,
    retroQuestions: normalizeCheckInItems(row.retro_questions),
    retroOfferedBy: typeof row.retro_offered_by_user_id === "string" ? row.retro_offered_by_user_id : null,
  };
}

export async function getTeamCheckIn(teamId: string, currentUserId: string, client?: Client) {
  const supabase = client ?? (await createClient());
  const setup = await getFounderSetup(teamId, currentUserId, supabase);
  if (!setup) return null;
  const setupItems = setup.items;

  const [settingsResult, checkInsResult] = await Promise.all([
    supabase.from("team_check_in_settings").select("interval_days").eq("team_id", teamId).maybeSingle(),
    supabase
      .from("team_check_ins")
      .select("id, team_id, status, started_at, closed_at, retro_questions, retro_offered_by_user_id")
      .eq("team_id", teamId)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);
  if (settingsResult.error || checkInsResult.error) throw new Error("team_check_in_unavailable");

  const intervalDays = isCheckInInterval(settingsResult.data?.interval_days) ?? DEFAULT_CHECK_IN_INTERVAL;
  const checkIns = ((checkInsResult.data ?? []) as Array<Record<string, unknown>>)
    .map(toCheckIn)
    .filter((entry): entry is CheckIn => entry !== null);
  const open = checkIns.find((entry) => entry.status === "open") ?? null;
  const lastClosed = checkIns.find((entry) => entry.status === "closed") ?? null;
  const lastFinishedAt = checkIns.find((entry) => entry.status !== "open" && entry.closedAt)?.closedAt ?? null;

  const confirmedDates = setup.items
    .map((item) => item.currentConfirmedRevision?.confirmedAt ?? null)
    .filter((value): value is string => Boolean(value))
    .sort();
  const eligibleCount = setup.items.filter(
    (item) => item.currentConfirmedRevision && item.outcome !== "not_relevant"
  ).length;
  const due = nextCheckInDue({
    intervalDays,
    lastClosedAt: lastFinishedAt,
    earliestConfirmedAt: confirmedDates[0] ?? null,
  });

  async function detail(checkIn: CheckIn | null): Promise<CheckInDetail | null> {
    if (!checkIn) return null;
    const [topicResult, answerResult, submissionResult, inviteResult, retroResult] = await Promise.all([
      supabase.from("team_check_in_topics").select("id, position, item_key, custom_text, included, revision_id").eq("check_in_id", checkIn.id).order("position"),
      supabase.from("team_check_in_answers").select("topic_id, user_id, answer, note").eq("check_in_id", checkIn.id),
      supabase.from("team_check_in_submissions").select("user_id").eq("check_in_id", checkIn.id),
      supabase.from("team_check_in_retro_invites").select("user_id, response").eq("check_in_id", checkIn.id),
      supabase.from("team_check_in_retro_answers").select("user_id, answers").eq("check_in_id", checkIn.id),
    ]);
    if (topicResult.error || answerResult.error || submissionResult.error || inviteResult.error || retroResult.error) {
      throw new Error("team_check_in_unavailable");
    }
    const topics = ((topicResult.data ?? []) as Array<Record<string, unknown>>).map<CheckInTopic>((row) => ({
      id: String(row.id),
      position: typeof row.position === "number" ? row.position : 0,
      itemKey: typeof row.item_key === "string" ? row.item_key : null,
      customText: typeof row.custom_text === "string" ? row.custom_text : null,
      included: row.included !== false,
    }));
    const answers = ((answerResult.data ?? []) as Array<Record<string, unknown>>).flatMap<CheckInAnswerRow>((row) => {
      const answer = isCheckInAnswer(row.answer);
      return answer ? [{ topicId: String(row.topic_id), userId: String(row.user_id), answer, note: typeof row.note === "string" ? row.note : "" }] : [];
    });
    const agreedText: CheckInDetail["agreedText"] = {};
    for (const topic of topics) {
      if (!topic.itemKey) continue;
      const item = setupItems.find((entry) => entry.key === topic.itemKey);
      // Der Text zum Zeitpunkt des Starts waere die gespeicherte Fassung; gilt noch dieselbe
      // bestaetigte Fassung, ist es dieselbe. Sonst zeigt die Karte den aktuellen Stand.
      if (item?.currentConfirmedRevision) {
        agreedText[topic.itemKey] = { note: item.currentConfirmedRevision.note, confirmedAt: item.currentConfirmedRevision.confirmedAt };
      }
    }
    return {
      checkIn,
      topics,
      answers,
      submittedUserIds: ((submissionResult.data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id),
      retroInvites: ((inviteResult.data ?? []) as Array<{ user_id: string; response: string | null }>).map((row) => ({
        userId: row.user_id,
        response: row.response === "in" || row.response === "out" ? row.response : null,
      })),
      retroAnswers: ((retroResult.data ?? []) as Array<{ user_id: string; answers: unknown }>).map((row) => ({
        userId: row.user_id,
        answers: normalizeRetroAnswers(row.answers),
      })),
      agreedText,
    };
  }

  const [openDetail, closedDetail] = await Promise.all([detail(open), detail(lastClosed)]);
  return {
    teamId,
    members: setup.members,
    intervalDays,
    due,
    eligibleCount,
    open: openDetail,
    lastClosed: closedDetail,
  };
}

export type TeamCheckInView = NonNullable<Awaited<ReturnType<typeof getTeamCheckIn>>>;

export type CheckInCardState = {
  state: "none" | "due" | "scheduled" | "open";
  due: Date | null;
};

/**
 * Nur das, was die Team-Uebersicht braucht: laeuft einer, ist einer faellig, wann
 * kommt der naechste. Fehlt die Tabelle noch oder schlaegt die Abfrage fehl, gibt es
 * keinen Zustand - die Karte bleibt dann beim Link.
 */
export async function getCheckInCardState(
  teamId: string,
  setupItems: ReadonlyArray<{ outcome: string | null; currentConfirmedRevision: { confirmedAt: string | null } | null }>,
  client?: Client
): Promise<CheckInCardState | null> {
  const supabase = client ?? (await createClient());
  const [settingsResult, checkInsResult] = await Promise.all([
    supabase.from("team_check_in_settings").select("interval_days").eq("team_id", teamId).maybeSingle(),
    supabase.from("team_check_ins").select("status, closed_at").eq("team_id", teamId).order("started_at", { ascending: false }).limit(10),
  ]);
  if (settingsResult.error || checkInsResult.error) return null;
  const rows = (checkInsResult.data ?? []) as Array<{ status: string; closed_at: string | null }>;
  if (rows.some((row) => row.status === "open")) return { state: "open", due: null };
  const eligible = setupItems.filter((item) => item.currentConfirmedRevision && item.outcome !== "not_relevant");
  if (eligible.length === 0) return { state: "none", due: null };
  const confirmed = eligible
    .map((item) => item.currentConfirmedRevision?.confirmedAt ?? null)
    .filter((value): value is string => Boolean(value))
    .sort();
  const due = nextCheckInDue({
    intervalDays: isCheckInInterval(settingsResult.data?.interval_days) ?? DEFAULT_CHECK_IN_INTERVAL,
    lastClosedAt: rows.find((row) => row.status !== "open" && row.closed_at)?.closed_at ?? null,
    earliestConfirmedAt: confirmed[0] ?? null,
  });
  return { state: due && due.getTime() <= Date.now() ? "due" : "scheduled", due };
}
