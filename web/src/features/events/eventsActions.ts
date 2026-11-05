"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { eventFilterOf, isRegion } from "@/features/events/eventsModel";

/**
 * Event-Kalender: vorschlagen, merken, zurueckziehen; fuer Admins freigeben und Quellen pflegen. Alles ueber die
 * Datenbankfunktionen (20270323120000), die Rechte und Bestaetigung pruefen. Rueckwege sind feste Adressen.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidOrNull = (value: FormDataEntryValue | null) => (UUID.test(String(value ?? "")) ? String(value) : null);
const text = (value: FormDataEntryValue | null, max: number) => String(value ?? "").trim().slice(0, max);

async function requireClient(next: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return client;
}

/** Zurueck in die Liste mit Filter und Region, wie sie war. */
function listPath(formData: FormData, extra: Record<string, string> = {}) {
  const filter = eventFilterOf(formData.get("filter"));
  const region = String(formData.get("region") ?? "");
  const params = new URLSearchParams({
    ...(filter !== "all" ? { filter } : {}),
    ...(isRegion(region) || region === "online" ? { region } : {}),
    ...extra,
  });
  return params.size > 0 ? `/events?${params.toString()}` : "/events";
}

/** Datum und Uhrzeit aus dem Formular (Berlin) als Zeitpunkt. */
function berlinTime(day: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const clock = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "00:00";
  const [year, month, date] = day.split("-").map(Number);
  const [hour, minute] = clock.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, date, hour, minute);
  const format = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const parts = Object.fromEntries(format.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
  const offset = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute)) - guess;
  return new Date(guess - offset).toISOString();
}

export async function submitEventAction(formData: FormData) {
  const client = await requireClient("/events/neu");
  const day = text(formData.get("day"), 10);
  const allDay = formData.get("allDay") === "yes";
  const startsAt = berlinTime(day, allDay ? "00:00" : text(formData.get("startTime"), 5));
  const endTime = text(formData.get("endTime"), 5);
  const endsAt = !allDay && endTime ? berlinTime(day, endTime) : null;
  const region = String(formData.get("region") ?? "");
  const url = text(formData.get("url"), 500);
  const { error } = await client.rpc("submit_ecosystem_event", {
    p_org_id: uuidOrNull(formData.get("orgId")),
    p_title: text(formData.get("title"), 200),
    p_starts_at: startsAt,
    p_ends_at: endsAt && startsAt && endsAt >= startsAt ? endsAt : null,
    p_all_day: allDay,
    p_place: text(formData.get("place"), 160),
    p_region: isRegion(region) ? region : null,
    p_online: formData.get("online") === "yes",
    p_organizer: text(formData.get("organizer"), 120),
    p_url: url,
    p_confirmed: formData.get("confirmed") === "yes",
  });
  if (error) {
    const reason = /not_confirmed/.test(error.message) ? "confirm" : /too_many/.test(error.message) ? "tooMany" : /not_allowed/.test(error.message) ? "notAllowed" : /url/.test(error.message) || !/^https:\/\//.test(url) ? "url" : "invalid";
    redirect(`/events/neu?error=${reason}`);
  }
  revalidatePath("/events");
  redirect("/events?submitted=1#mine");
}

export async function toggleEventSaveAction(formData: FormData) {
  const client = await requireClient("/events");
  await client.rpc("toggle_ecosystem_event_save", { p_event_id: uuidOrNull(formData.get("eventId")) });
  revalidatePath("/events");
  redirect(`${listPath(formData)}#${String(formData.get("eventId") ?? "")}`);
}

export async function deleteEventAction(formData: FormData) {
  const client = await requireClient("/events");
  await client.rpc("delete_ecosystem_event", { p_event_id: uuidOrNull(formData.get("eventId")) });
  revalidatePath("/events");
  revalidatePath("/admin/events");
  redirect(formData.get("back") === "admin" ? "/admin/events" : `${listPath(formData)}#mine`);
}

export async function reviewEventAction(formData: FormData) {
  const client = await requireClient("/admin/events");
  await client.rpc("review_ecosystem_event", {
    p_event_id: uuidOrNull(formData.get("eventId")),
    p_publish: formData.get("decision") === "publish",
    p_note: text(formData.get("note"), 300),
  });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events");
}

export async function saveEventSourceAction(formData: FormData) {
  const client = await requireClient("/admin/events");
  const region = String(formData.get("region") ?? "");
  const { error } = await client.rpc("save_ecosystem_event_source", {
    p_key: text(formData.get("key"), 40).toLowerCase(),
    p_name: text(formData.get("name"), 120),
    p_homepage_url: text(formData.get("homepageUrl"), 500),
    p_feed_kind: "ics",
    p_feed_url: text(formData.get("feedUrl"), 500),
    p_region: isRegion(region) ? region : null,
    p_license: text(formData.get("license"), 120),
    p_license_url: text(formData.get("licenseUrl"), 500),
    p_attribution: text(formData.get("attribution"), 200),
    p_permission_note: text(formData.get("permissionNote"), 500),
  });
  revalidatePath("/admin/events");
  redirect(error ? "/admin/events?sourceError=1#sources" : "/admin/events?sourceSaved=1#sources");
}

export async function setEventSourceEnabledAction(formData: FormData) {
  const client = await requireClient("/admin/events");
  await client.rpc("set_ecosystem_event_source_enabled", { p_source_id: uuidOrNull(formData.get("sourceId")), p_enabled: formData.get("enabled") === "yes" });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  redirect("/admin/events#sources");
}
