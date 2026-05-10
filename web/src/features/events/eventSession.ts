import "server-only";

import { cookies } from "next/headers";

const EVENT_SESSION_COOKIE_PREFIX = "cofoundery_event_participant_";

function normalizeEventSlugForCookie(eventSlug: string) {
  return eventSlug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
}

function eventCookiePath(eventSlug: string) {
  return `/event/${eventSlug.trim()}`;
}

export function getEventParticipantSessionCookieName(eventSlug: string) {
  return `${EVENT_SESSION_COOKIE_PREFIX}${normalizeEventSlugForCookie(eventSlug)}`;
}

export async function setEventParticipantSession(eventSlug: string, participantToken: string) {
  const cookieStore = await cookies();
  cookieStore.set(getEventParticipantSessionCookieName(eventSlug), participantToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: eventCookiePath(eventSlug),
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getEventParticipantTokenFromSession(eventSlug: string) {
  const cookieStore = await cookies();
  return cookieStore.get(getEventParticipantSessionCookieName(eventSlug))?.value?.trim() || null;
}

export async function clearEventParticipantSession(eventSlug: string) {
  const cookieStore = await cookies();
  cookieStore.set(getEventParticipantSessionCookieName(eventSlug), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: eventCookiePath(eventSlug),
    maxAge: 0,
  });
}
