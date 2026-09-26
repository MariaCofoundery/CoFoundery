"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Zustimmen, ablehnen, aussteigen - und anfragen.
 *
 * WER WAS DARF, PRÜFT DIE DATENBANK. Diese Aktionen reichen weiter und
 * entscheiden nichts: Eine zweite Kopie der Regeln hier wäre die erste, die
 * ausläuft - und auslaufen hieße, dass jemand verglichen wird, der nicht
 * gefragt war.
 */

async function requireClient() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/account");
  return client;
}

export async function decideTeamReviewAction(formData: FormData) {
  const client = await requireClient();
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const approve = String(formData.get("approve") ?? "") === "1";
  if (reviewId) {
    await client.rpc("decide_advisor_team_review", {
      p_review_id: reviewId,
      p_approve: approve,
    });
  }
  revalidatePath("/account");
  redirect("/account#person-access");
}

/**
 * Aussteigen - jederzeit, auch nach der Zustimmung.
 *
 * Es beendet die ganze Auswertung und nicht nur den eigenen Anteil: Die
 * Auswertung IST die Zusammenstellung, ohne eine Seite gibt es sie nicht.
 */
export async function revokeTeamReviewAction(formData: FormData) {
  const client = await requireClient();
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  if (reviewId) {
    await client.rpc("revoke_advisor_team_review", { p_review_id: reviewId });
  }
  revalidatePath("/account");
  redirect("/account#person-access");
}

export async function requestTeamReviewAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect("/login?next=/advisor/group");

  const subjects = formData
    .getAll("p")
    .map((value) => String(value))
    .filter((value) => /^[0-9a-f-]{36}$/i.test(value));
  const orgId = String(formData.get("orgId") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  const { error } = await client.rpc("request_advisor_team_review", {
    p_subject_user_ids: subjects,
    p_org_id: orgId,
    p_note: note,
  });

  revalidatePath("/advisor/group");
  const query = new URLSearchParams();
  for (const subject of subjects) query.append("p", subject);
  if (error) query.set("error", "team_review");
  else query.set("status", "team_review_requested");
  redirect(`/advisor/group?${query.toString()}`);
}
