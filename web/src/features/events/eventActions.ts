"use server";

import {
  getEventQuestionByKey,
  getEventParticipantByToken,
  getRequiredEventQuestionKeys,
  getLiveEventBySlug,
  isValidEventAnswerValue,
  listEventAnswersForParticipant,
  markEventParticipantCompleted,
  normalizeEventDisplayName,
  normalizeEventEmail,
  normalizeEventSlug,
  upsertEventAnswerRecords,
  upsertEventParticipantRecord,
} from "@/features/events/eventData";
import {
  getEventParticipantTokenFromSession,
  setEventParticipantSession,
} from "@/features/events/eventSession";
import type { EventAnswer, EventAnswerValue, EventParticipant } from "@/features/events/eventTypes";

export type UpsertEventParticipantActionResult =
  | {
      ok: true;
      participant: EventParticipant;
      nextHref: string;
    }
  | {
      ok: false;
      code:
        | "event_not_found"
        | "invalid_name"
        | "invalid_email"
        | "missing_compare_consent"
        | "missing_visibility_consent"
        | "participant_prepare_failed";
      error: string;
    };

export type SaveEventAnswersActionResult =
  | {
      ok: true;
      nextHref: string;
      completed: boolean;
      answers: EventAnswer[];
    }
  | {
      ok: false;
      error: string;
    };

function buildEventCheckHref(eventSlug: string) {
  return `/event/${encodeURIComponent(eventSlug)}/check`;
}

function buildEventProfileHref(eventSlug: string) {
  return `/event/${encodeURIComponent(eventSlug)}/me`;
}

export async function upsertEventParticipant(input: {
  eventSlug: string;
  displayName: string;
  email: string;
  consentCompare: boolean;
  consentVisibility: boolean;
}): Promise<UpsertEventParticipantActionResult> {
  const normalizedSlug = normalizeEventSlug(input.eventSlug);
  const displayName = normalizeEventDisplayName(input.displayName);
  const email = normalizeEventEmail(input.email);

  if (!normalizedSlug) {
    return { ok: false, code: "event_not_found", error: "Event konnte nicht gefunden werden." };
  }
  if (displayName.length < 2) {
    return {
      ok: false,
      code: "invalid_name",
      error: "Bitte einen Anzeigenamen mit mindestens zwei Zeichen eingeben.",
    };
  }
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      code: "invalid_email",
      error: "Bitte eine gueltige E-Mail-Adresse eingeben.",
    };
  }
  if (input.consentCompare !== true) {
    return {
      ok: false,
      code: "missing_compare_consent",
      error: "Bitte stimme der Nutzung deines Event-Profils fuer Vergleiche innerhalb dieses Events zu.",
    };
  }
  if (input.consentVisibility !== true) {
    return {
      ok: false,
      code: "missing_visibility_consent",
      error: "Bitte stimme zu, dass andere Event-Teilnehmer:innen dein Kurzprofil ueber deinen QR-Code vergleichen koennen.",
    };
  }

  const event = await getLiveEventBySlug(normalizedSlug);
  if (!event) {
    return { ok: false, code: "event_not_found", error: "Dieses Event ist aktuell nicht verfuegbar." };
  }

  const participant = await upsertEventParticipantRecord({
    eventId: event.id,
    displayName,
    email,
    consentCompare: input.consentCompare === true,
    consentVisibility: input.consentVisibility === true,
  });

  if (!participant) {
    return {
      ok: false,
      code: "participant_prepare_failed",
      error: "Teilnehmer konnte gerade nicht vorbereitet werden.",
    };
  }

  await setEventParticipantSession(event.slug, participant.participantToken);

  return {
    ok: true,
    participant,
    nextHref: buildEventCheckHref(event.slug),
  };
}

export async function saveEventAnswers(input: {
  eventSlug: string;
  answers: Array<{ questionKey: string; answerValue: number }>;
}): Promise<SaveEventAnswersActionResult> {
  const normalizedSlug = normalizeEventSlug(input.eventSlug);
  if (!normalizedSlug) {
    return { ok: false, error: "Event konnte nicht gefunden werden." };
  }

  const event = await getLiveEventBySlug(normalizedSlug);
  if (!event) {
    return { ok: false, error: "Dieses Event ist aktuell nicht verfuegbar." };
  }
  if (!Array.isArray(input.answers) || input.answers.length === 0) {
    return { ok: false, error: "Bitte zuerst mindestens eine Event-Antwort uebergeben." };
  }

  const participantToken = await getEventParticipantTokenFromSession(event.slug);
  if (!participantToken) {
    return { ok: false, error: "Event-Session nicht gefunden. Bitte starte den Event-Check neu." };
  }

  const participant = await getEventParticipantByToken({
    eventId: event.id,
    participantToken,
  });
  if (!participant) {
    return { ok: false, error: "Teilnehmer konnte diesem Event nicht zugeordnet werden." };
  }

  const answersByQuestionKey = new Map<string, EventAnswerValue>();
  for (const rawAnswer of input.answers) {
    const questionKey = String(rawAnswer.questionKey ?? "").trim();
    const question = getEventQuestionByKey(questionKey);
    if (!question) {
      return { ok: false, error: `Unbekannte Event-Frage: ${questionKey || "leer"}.` };
    }
    if (!isValidEventAnswerValue(rawAnswer.answerValue)) {
      return { ok: false, error: `Antwortwert fuer ${questionKey} ist ungueltig.` };
    }
    answersByQuestionKey.set(question.key, rawAnswer.answerValue);
  }

  const normalizedAnswers = Array.from(answersByQuestionKey.entries()).map(([questionKey, answerValue]) => {
    const question = getEventQuestionByKey(questionKey)!;
    return {
      questionKey,
      answerType: question.kind,
      answerValue,
    };
  });

  const saved = await upsertEventAnswerRecords({
    eventId: event.id,
    participantId: participant.id,
    answers: normalizedAnswers,
  });
  if (!saved) {
    return { ok: false, error: "Event-Antworten konnten gerade nicht gespeichert werden." };
  }

  const savedAnswers = await listEventAnswersForParticipant({ participantId: participant.id });
  const requiredQuestionKeys = getRequiredEventQuestionKeys();
  const allQuestionsAnswered = requiredQuestionKeys.every((questionKey) =>
    savedAnswers.some((answer) => answer.questionKey === questionKey)
  );

  if (allQuestionsAnswered) {
    await markEventParticipantCompleted({ participantId: participant.id });
  }

  return {
    ok: true,
    nextHref: buildEventProfileHref(event.slug),
    completed: allQuestionsAnswered,
    answers: savedAnswers,
  };
}
