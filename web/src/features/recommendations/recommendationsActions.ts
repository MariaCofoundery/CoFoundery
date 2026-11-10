"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REC_REPORT_CATEGORIES, cleanHttpsUrl, isRecKind, isRecTopic, REC_COMMENT_MAX } from "@/features/recommendations/recommendationsModel";

/** Empfehlungen schreiben (20270414120000). Wer darf was, entscheidet die Datenbank; hier steht nur die Form der Eingabe. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BASE = "/connect/empfehlungen";
const MINE = `${BASE}?meine=1`;

async function signedIn(next: string) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(next)}`);
  return client;
}

export async function createRecommendationAction(formData: FormData) {
  const client = await signedIn(`${BASE}/neu`);
  const kind = String(formData.get("kind") ?? "");
  if (!isRecKind(kind)) redirect(`${BASE}/neu?fehler=invalid`);
  const subject = String(formData.get("subjectUserId") ?? "");
  const venture = String(formData.get("ventureId") ?? "");
  const rawUrl = String(formData.get("url") ?? "").trim();
  const url = rawUrl ? cleanHttpsUrl(rawUrl) : null;
  if (rawUrl && !url) redirect(`${BASE}/neu?art=${kind}&fehler=url`);
  const topics = [...new Set(formData.getAll("topic").map(String).filter(isRecTopic))].slice(0, 3);
  const comment = String(formData.get("comment") ?? "").trim().slice(0, REC_COMMENT_MAX);
  const { error } = await client.rpc("create_recommendation", {
    p_kind: kind, p_title: String(formData.get("title") ?? "").trim().slice(0, 120), p_sub: String(formData.get("sub") ?? "").trim().slice(0, 160) || null,
    p_url: url, p_subject_user_id: kind === "person" && UUID.test(subject) ? subject : null, p_venture_id: kind === "project" && UUID.test(venture) ? venture : null,
    p_topics: topics, p_region: String(formData.get("region") ?? "").trim().slice(0, 60) || null, p_comment: comment, p_guidelines: formData.get("guidelines") === "yes",
  });
  if (error) {
    const code = /guidelines/.test(error.message) ? "guidelines" : /profile_needed/.test(error.message) ? "profile" : "invalid";
    redirect(`${BASE}/neu?art=${kind}&fehler=${code}`);
  }
  revalidatePath(BASE);
  redirect(`${MINE}&neu=${kind === "person" ? "consent" : "review"}`);
}

export async function decideRecommendationConsentAction(formData: FormData) {
  const client = await signedIn(MINE);
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await client.rpc("decide_recommendation_consent", { p_id: id, p_accept: formData.get("accept") === "yes" });
  revalidatePath(BASE);
  redirect(`${MINE}&ok=1`);
}

export async function withdrawRecommendationAction(formData: FormData) {
  const client = await signedIn(MINE);
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await client.rpc("withdraw_recommendation", { p_id: id });
  revalidatePath(BASE);
  redirect(`${MINE}&ok=1`);
}

export async function renewRecommendationAction(formData: FormData) {
  const client = await signedIn(MINE);
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await client.rpc("renew_recommendation", { p_id: id });
  revalidatePath(BASE);
  redirect(`${MINE}&ok=1`);
}

export async function reportRecommendationAction(formData: FormData) {
  const client = await signedIn(BASE);
  const id = String(formData.get("id") ?? "");
  const category = String(formData.get("category") ?? "");
  if (UUID.test(id) && (REC_REPORT_CATEGORIES as readonly string[]).includes(category)) {
    await client.rpc("report_recommendation", { p_id: id, p_category: category, p_comment: String(formData.get("note") ?? "").trim().slice(0, 500) || null });
  }
  revalidatePath(BASE);
  redirect(`${BASE}?gemeldet=1`);
}

export async function adminDecideRecommendationAction(formData: FormData) {
  const client = await createClient();
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await client.rpc("admin_decide_recommendation", { p_id: id, p_approve: formData.get("decision") === "approve", p_note: String(formData.get("note") ?? "").trim().slice(0, 300) || null });
  revalidatePath("/admin/empfehlungen");
  revalidatePath(BASE);
  redirect("/admin/empfehlungen?ok=1");
}
