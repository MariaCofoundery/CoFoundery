"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isChannel, isPostStatus } from "@/features/advisor/socialCalendarModel";
import { TEAMRAUM_BASE, teamraumHref } from "@/features/advisor/teamraumRoutes";
import { calendarHref } from "@/features/advisor/calendar/calendarModel";

/**
 * Social-Media-Kalender schreiben (20270319120000). Wer darf, entscheidet die Datenbank. Der Rueckweg wird
 * zusammengesetzt, nie uebernommen.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const uuidOrNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  return UUID.test(text) ? text : null;
};
const dateOrNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};
const timeOrNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
};

function backTo(formData: FormData, extra: Record<string, string> = {}) {
  const orgId = uuidOrNull(formData.get("orgId"));
  if (!orgId) return TEAMRAUM_BASE;
  const month = String(formData.get("month") ?? "");
  // Aus dem Kalender (seit 06.11.2026 der einzige Kalender): zurueck dorthin, Posts oeffnen im Panel.
  if (formData.get("calendar") === "1") {
    const { newPost, ...rest } = extra;
    return calendarHref(orgId, {
      ...(/^\d{4}-\d{2}$/.test(month) ? { monat: month } : {}),
      ...(newPost !== undefined ? { neu: "post", ...(newPost ? { tag: newPost } : {}) } : {}),
      ...rest,
    });
  }
  const params = new URLSearchParams();
  if (/^\d{4}-\d{2}$/.test(month)) params.set("month", month);
  const week = String(formData.get("week") ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(week)) {
    params.set("view", "week");
    params.set("week", week);
  }
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  return teamraumHref("social", orgId, Object.fromEntries(params));
}

async function requireUser(next: string) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(next)}`);
  return client;
}

function finish(path: string) {
  revalidatePath("/advisor/teamraum", "layout");
  redirect(path);
}

export async function savePostAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const postId = uuidOrNull(formData.get("postId"));
  const status = formData.get("status");
  const plannedOn = dateOrNull(formData.get("plannedOn"));
  const { data, error } = await client.rpc("save_org_post", {
    p_post_id: postId,
    p_org_id: uuidOrNull(formData.get("orgId")),
    p_title: String(formData.get("title") ?? "").slice(0, 160),
    p_body: String(formData.get("body") ?? "").slice(0, 5000),
    p_channels: formData.getAll("channel").map(String).filter(isChannel),
    p_planned_on: plannedOn,
    p_planned_time: timeOrNull(formData.get("plannedTime")),
    p_status: isPostStatus(status) ? status : "idea",
    p_campaign_id: uuidOrNull(formData.get("campaignId")),
    p_event_id: uuidOrNull(formData.get("eventId")),
    p_assignee_user_id: uuidOrNull(formData.get("assignee")),
  });
  if (error) finish(backTo(formData, { ...(postId ? { post: postId } : { newPost: plannedOn ?? "" }), socialError: "1" }));
  finish(backTo(formData, { ...(plannedOn ? { month: plannedOn.slice(0, 7) } : {}), post: String(data ?? postId ?? ""), socialSaved: "1" }));
}

export async function setPostStatusAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const postId = uuidOrNull(formData.get("postId"));
  const status = formData.get("status");
  const { error } = await client.rpc("move_org_post", { p_post_id: postId, p_planned_on: dateOrNull(formData.get("plannedOn")), p_status: isPostStatus(status) ? status : null });
  finish(backTo(formData, { ...(postId ? { post: postId } : {}), ...(error ? { socialError: "1" } : {}) }));
}

export async function deletePostAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("delete_org_post", { p_post_id: uuidOrNull(formData.get("postId")) });
  finish(backTo(formData, error ? { socialError: "1" } : { socialDeleted: "1" }));
}

export async function deleteCampaignAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  const { error } = await client.rpc("delete_org_campaign", { p_campaign_id: uuidOrNull(formData.get("campaignId")) });
  finish(backTo(formData, error ? { socialError: "1" } : { socialDeleted: "1" }));
}

/**
 * Freigabe aus der Planungshilfe: Kampagne und ihre Postings - erst jetzt wird geschrieben, ueber dieselben
 * Datenbankfunktionen wie von Hand. Postings starten als "Idee"; hoechstens zwanzig.
 */
export async function createCampaignAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(formData.get("plan") ?? "null"));
  } catch {
    parsed = null;
  }
  const plan = parsed && typeof parsed === "object" ? (parsed as { name?: unknown; startsOn?: unknown; endsOn?: unknown; posts?: unknown }) : null;
  const orgId = uuidOrNull(formData.get("orgId"));
  const posts = (Array.isArray(plan?.posts) ? plan.posts : []).slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item as Record<string, unknown>;
    const title = typeof entry.title === "string" ? entry.title.trim().slice(0, 160) : "";
    const plannedOn = dateOrNull(entry.plannedOn);
    if (!title || !plannedOn) return [];
    return [{ title, plannedOn, plannedTime: timeOrNull(entry.plannedTime), channels: (Array.isArray(entry.channels) ? entry.channels : []).filter(isChannel), eventId: uuidOrNull(entry.eventId) }];
  });
  if (!plan || !orgId || posts.length === 0) finish(backTo(formData, { socialError: "1" }));
  const name = typeof plan?.name === "string" && plan.name.trim() ? plan.name.trim().slice(0, 120) : "Kampagne";
  const days = posts.map((post) => post.plannedOn).sort();
  const { data: campaignId, error } = await client.rpc("save_org_campaign", {
    p_campaign_id: null,
    p_org_id: orgId,
    p_name: name,
    p_starts_on: days[0],
    p_ends_on: days[days.length - 1],
    p_notes: "",
  });
  if (error || typeof campaignId !== "string") finish(backTo(formData, { socialError: "1" }));
  let created = 0;
  for (const post of posts) {
    const { error: postError } = await client.rpc("save_org_post", {
      p_post_id: null,
      p_org_id: orgId,
      p_title: post.title,
      p_body: "",
      p_channels: post.channels,
      p_planned_on: post.plannedOn,
      p_planned_time: post.plannedTime,
      p_status: "idea",
      p_campaign_id: campaignId,
      p_event_id: post.eventId,
      p_assignee_user_id: null,
    });
    if (!postError) created += 1;
  }
  finish(backTo(formData, { month: days[0].slice(0, 7), socialCreated: String(created) }));
}

/** Aus dem Kalender: ein Posting auf einen anderen Tag ziehen. */
export async function movePostToDayAction(postId: string, day: string): Promise<{ ok: boolean }> {
  if (!UUID.test(postId) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false };
  const client = await createClient();
  const { error } = await client.rpc("move_org_post", { p_post_id: postId, p_planned_on: day, p_status: null });
  if (!error) {
    revalidatePath("/advisor/teamraum", "layout");
    revalidatePath("/advisor/kalender");
  }
  return { ok: !error };
}

/**
 * Post-Vorlagen (20270324120000): "eine Woche vorher LinkedIn und Instagram, einen Tag danach LinkedIn". Die
 * Schritte kommen als JSON aus dem Editor; die Datenbank raeumt sie auf.
 */
export async function savePostTemplateAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  let steps: unknown = [];
  try {
    steps = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    steps = [];
  }
  const { error } = await client.rpc("save_org_post_template", {
    p_template_id: uuidOrNull(formData.get("templateId")),
    p_org_id: uuidOrNull(formData.get("orgId")),
    p_name: String(formData.get("name") ?? "").slice(0, 80),
    p_steps: steps,
  });
  finish(backTo(formData, { reiter: "vorlagen", ...(error ? { templateError: "1" } : { templateSaved: "1" }) }));
}

export async function deletePostTemplateAction(formData: FormData) {
  const client = await requireUser(backTo(formData));
  await client.rpc("delete_org_post_template", { p_template_id: uuidOrNull(formData.get("templateId")) });
  finish(backTo(formData, { reiter: "vorlagen" }));
}

/**
 * Vorgeschlagene Postings zu Veranstaltungen uebernehmen - erst nach "passt". Jedes geht durch save_org_post wie
 * ein einzelnes Posting, als Idee mit Tag, Uhrzeit, einem Kanal und der Veranstaltung. Rueckweg: Plan oder Kalender.
 */
export async function createEventPostsAction(formData: FormData) {
  const orgId = uuidOrNull(formData.get("orgId"));
  // Rueckweg: der Kalender (aus dem Panel eines Termins), der Programmplan von frueher oder der Social-Kalender.
  const fromCalendar = formData.get("back") === "calendar" && orgId !== null;
  const fromPlan = fromCalendar || formData.get("back") === "plan";
  const eventParam = uuidOrNull(formData.get("termin"));
  const back = (extra: Record<string, string>) =>
    fromPlan && orgId
      ? calendarHref(orgId, { ...extra, termin: eventParam, reiter: eventParam ? "social" : null })
      : backTo(formData, extra);
  const client = await requireUser(back({}));
  let rows: unknown[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("posts") ?? "[]"));
    rows = Array.isArray(parsed) ? parsed.slice(0, 60) : [];
  } catch {
    rows = [];
  }
  let created = 0;
  for (const raw of rows) {
    const row = raw as { title?: unknown; plannedOn?: unknown; plannedTime?: unknown; channel?: unknown; eventId?: unknown };
    const plannedOn = dateOrNull(row.plannedOn);
    if (!plannedOn || !isChannel(row.channel)) continue;
    const { error } = await client.rpc("save_org_post", {
      p_post_id: null,
      p_org_id: orgId,
      p_title: String(row.title ?? "").slice(0, 160),
      p_body: "",
      p_channels: [row.channel],
      p_planned_on: plannedOn,
      p_planned_time: timeOrNull(row.plannedTime),
      p_status: "idea",
      p_campaign_id: null,
      p_event_id: uuidOrNull(String(row.eventId ?? "")),
      p_assignee_user_id: null,
    });
    if (!error) created += 1;
  }
  if (fromPlan) {
    revalidatePath("/advisor/kalender");
    revalidatePath("/advisor/organisation");
    revalidatePath("/advisor/teamraum", "layout");
    redirect(back(created > 0 ? { postsCreated: String(created) } : { postsError: "1" }));
  }
  finish(back(created > 0 ? { socialCreated: String(created) } : { socialError: "1" }));
}
