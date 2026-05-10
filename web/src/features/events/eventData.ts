import "server-only";

import { randomBytes } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import {
  EVENT_ANSWER_SCALE,
  EVENT_QUESTIONS,
} from "@/features/events/eventQuestions";
import { deriveEventProfile } from "@/features/events/eventProfile";
import {
  getEventParticipantTokenFromSession,
} from "@/features/events/eventSession";
import {
  type EventAnswer,
  type EventAnswerValue,
  type EventParticipant,
  type EventParticipantProfileResult,
  type EventQuestion,
  type EventQuestionKind,
  type EventRecord,
} from "@/features/events/eventTypes";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;

type EventRow = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "live" | "closed";
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type EventParticipantRow = {
  id: string;
  event_id: string;
  display_name: string;
  email: string;
  participant_token: string;
  consent_compare: boolean;
  consent_visibility: boolean;
  assessment_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type EventAnswerRow = {
  question_key: string;
  answer_type: EventQuestionKind;
  answer_value: number;
  created_at: string;
  updated_at: string;
};

function createPrivilegedClient(): SupabaseLikeClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function mapEventRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
  };
}

function mapEventParticipantRow(row: EventParticipantRow): EventParticipant {
  return {
    id: row.id,
    eventId: row.event_id,
    displayName: row.display_name,
    email: row.email,
    participantToken: row.participant_token,
    consentCompare: row.consent_compare,
    consentVisibility: row.consent_visibility,
    assessmentCompletedAt: row.assessment_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEventAnswerRow(row: EventAnswerRow): EventAnswer {
  return {
    questionKey: row.question_key,
    answerType: row.answer_type,
    answerValue: row.answer_value as EventAnswerValue,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeEventSlug(value: string) {
  return value.trim();
}

export function normalizeEventEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeEventDisplayName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function createEventParticipantToken() {
  return randomBytes(24).toString("hex");
}

export function isValidEventAnswerValue(value: unknown): value is EventAnswerValue {
  return typeof value === "number" && EVENT_ANSWER_SCALE.includes(value as EventAnswerValue);
}

export function getEventQuestionByKey(questionKey: string): EventQuestion | null {
  return EVENT_QUESTIONS.find((question) => question.key === questionKey) ?? null;
}

export function getRequiredEventQuestionKeys() {
  return EVENT_QUESTIONS.map((question) => question.key);
}

export async function getLiveEventBySlug(slug: string): Promise<EventRecord | null> {
  const normalizedSlug = normalizeEventSlug(slug);
  if (!normalizedSlug) return null;

  const privileged = createPrivilegedClient();
  if (!privileged) {
    return null;
  }

  const { data, error } = await privileged
    .from("events")
    .select("id, slug, name, status, starts_at, ends_at, created_at")
    .eq("slug", normalizedSlug)
    .eq("status", "live")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapEventRow(data as EventRow);
}

export async function getEventParticipantByEmail(params: {
  eventId: string;
  email: string;
}): Promise<EventParticipant | null> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return null;
  }

  const { data, error } = await privileged
    .from("event_participants")
    .select(
      "id, event_id, display_name, email, participant_token, consent_compare, consent_visibility, assessment_completed_at, created_at, updated_at"
    )
    .eq("event_id", params.eventId)
    .eq("email", normalizeEventEmail(params.email))
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapEventParticipantRow(data as EventParticipantRow);
}

export async function getEventParticipantByToken(params: {
  eventId: string;
  participantToken: string;
}): Promise<EventParticipant | null> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return null;
  }

  const { data, error } = await privileged
    .from("event_participants")
    .select(
      "id, event_id, display_name, email, participant_token, consent_compare, consent_visibility, assessment_completed_at, created_at, updated_at"
    )
    .eq("event_id", params.eventId)
    .eq("participant_token", params.participantToken.trim())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapEventParticipantRow(data as EventParticipantRow);
}

export async function upsertEventParticipantRecord(params: {
  eventId: string;
  displayName: string;
  email: string;
  consentCompare: boolean;
  consentVisibility: boolean;
}): Promise<EventParticipant | null> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return null;
  }

  const normalizedEmail = normalizeEventEmail(params.email);
  const normalizedDisplayName = normalizeEventDisplayName(params.displayName);
  const existingParticipant = await getEventParticipantByEmail({
    eventId: params.eventId,
    email: normalizedEmail,
  });

  if (existingParticipant) {
    const { data, error } = await privileged
      .from("event_participants")
      .update({
        display_name: normalizedDisplayName,
        consent_compare: params.consentCompare,
        consent_visibility: params.consentVisibility,
      })
      .eq("id", existingParticipant.id)
      .select(
        "id, event_id, display_name, email, participant_token, consent_compare, consent_visibility, assessment_completed_at, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      return null;
    }

    return mapEventParticipantRow(data as EventParticipantRow);
  }

  const { data, error } = await privileged
    .from("event_participants")
    .insert({
      event_id: params.eventId,
      display_name: normalizedDisplayName,
      email: normalizedEmail,
      participant_token: createEventParticipantToken(),
      consent_compare: params.consentCompare,
      consent_visibility: params.consentVisibility,
    })
    .select(
      "id, event_id, display_name, email, participant_token, consent_compare, consent_visibility, assessment_completed_at, created_at, updated_at"
    )
    .single();

  if (error || !data) {
    return null;
  }

  return mapEventParticipantRow(data as EventParticipantRow);
}

export async function listEventAnswersForParticipant(params: {
  participantId: string;
}): Promise<EventAnswer[]> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return [];
  }

  const { data, error } = await privileged
    .from("event_answers")
    .select("question_key, answer_type, answer_value, created_at, updated_at")
    .eq("participant_id", params.participantId);

  if (error || !data) {
    return [];
  }

  return (data as EventAnswerRow[]).map(mapEventAnswerRow);
}

export async function upsertEventAnswerRecords(params: {
  eventId: string;
  participantId: string;
  answers: Array<{ questionKey: string; answerType: EventQuestionKind; answerValue: EventAnswerValue }>;
}): Promise<boolean> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return false;
  }

  const { error } = await privileged.from("event_answers").upsert(
    params.answers.map((answer) => ({
      event_id: params.eventId,
      participant_id: params.participantId,
      question_key: answer.questionKey,
      answer_type: answer.answerType,
      answer_value: answer.answerValue,
    })),
    { onConflict: "participant_id,question_key" }
  );

  return !error;
}

export async function markEventParticipantCompleted(params: {
  participantId: string;
}): Promise<boolean> {
  const privileged = createPrivilegedClient();
  if (!privileged) {
    return false;
  }

  const { error } = await privileged
    .from("event_participants")
    .update({ assessment_completed_at: new Date().toISOString() })
    .eq("id", params.participantId);

  return !error;
}

export async function getCurrentEventParticipantProfile(
  eventSlug: string
): Promise<EventParticipantProfileResult> {
  const event = await getLiveEventBySlug(eventSlug);
  if (!event) {
    return { ok: false, reason: "event_not_found" };
  }

  const participantToken = await getEventParticipantTokenFromSession(event.slug);
  if (!participantToken) {
    return { ok: false, reason: "participant_not_found" };
  }

  const participant = await getEventParticipantByToken({
    eventId: event.id,
    participantToken,
  });
  if (!participant) {
    return { ok: false, reason: "participant_not_found" };
  }
  if (participant.eventId !== event.id) {
    return { ok: false, reason: "participant_event_mismatch" };
  }

  const answers = await listEventAnswersForParticipant({ participantId: participant.id });
  const missingQuestionKeys = getRequiredEventQuestionKeys().filter(
    (questionKey) => !answers.some((answer) => answer.questionKey === questionKey)
  );
  const completed = missingQuestionKeys.length === 0;

  return {
    ok: true,
    event,
    participant,
    answers,
    profile: deriveEventProfile({ participant, answers }),
    completed,
    missingQuestionKeys,
  };
}
