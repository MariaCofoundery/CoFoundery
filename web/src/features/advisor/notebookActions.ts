"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Notizen und Wiedervorlage schreiben - zu einem Menschen oder zu einer
 * gemeinsamen Auswertung.
 *
 * DIE SCHREIBREGEL IST EINE ANDERE ALS DIE LESEREGEL, genau wie im
 * Beziehungsmodell:
 *
 *   Inhalte einer Person LESEN verlangt eine AKTIVE Freigabe.
 *
 *   Die eigene Handakte ERGÄNZEN verlangt nur, dass es das Mandat einmal
 *   gab. Sonst könnte eine Beraterin nach einem Widerruf ihre eigenen
 *   Aufzeichnungen nicht mehr zu Ende schreiben, obwohl die Begleitung
 *   stattgefunden hat.
 *
 *   Dass es NIE eines gab, bleibt ausgeschlossen: ohne Zeile kein Schreiben.
 */

const MAX_NOTE = 20000;
const MAX_FOLLOW_UP_NOTE = 2000;

type Anchor = { kind: "subject" | "review"; id: string };

function backTo(anchor: Anchor, query?: string) {
  const base =
    anchor.kind === "subject" ? `/advisor/person/${anchor.id}` : `/advisor/review/${anchor.id}`;
  return query ? `${base}?${query}#notebook` : `${base}#notebook`;
}

function readAnchor(formData: FormData): Anchor | null {
  const kind = String(formData.get("anchorKind") ?? "");
  const id = String(formData.get("anchorId") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  if (kind !== "subject" && kind !== "review") return null;
  return { kind, id };
}

/** Gab es dieses Mandat jemals? Die Datenbank antwortet, nicht diese Datei. */
async function mayKeepNotes(
  client: Awaited<ReturnType<typeof createClient>>,
  anchor: Anchor,
  userId: string
) {
  if (anchor.kind === "review") {
    const { data } = await client.rpc("was_ever_advisor_for_team_review", {
      p_review_id: anchor.id,
    });
    return data === true;
  }

  // Jeder Status: Auch eine widerrufene Freigabe war ein Mandat. Die
  // Zeilensicherheit auf `advisor_person_grants` zeigt ohnehin nur Zeilen,
  // an denen diese Person oder ihre Organisation beteiligt ist.
  const { data, error } = await client
    .from("advisor_person_grants")
    .select("id")
    .eq("subject_user_id", anchor.id)
    .limit(1)
    .maybeSingle();
  return !error && Boolean((data as { id?: string } | null)?.id);
}

async function prepare(anchor: Anchor) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(backTo(anchor))}`);

  const client = await createClient();
  if (!(await mayKeepNotes(client, anchor, user.id))) redirect(backTo(anchor, "error=forbidden"));
  return { client, userId: user.id };
}

export async function saveAdvisorNoteAction(formData: FormData) {
  const anchor = readAnchor(formData);
  if (!anchor) redirect("/advisor/dashboard");
  const { client, userId } = await prepare(anchor);

  const column = anchor.kind === "subject" ? "subject_user_id" : "review_id";
  const body = String(formData.get("body") ?? "").slice(0, MAX_NOTE);

  const { error } = await client
    .from("advisor_private_notes")
    .upsert(
      { [column]: anchor.id, advisor_user_id: userId, body },
      { onConflict: `${column},advisor_user_id` }
    );

  revalidatePath(backTo(anchor));
  redirect(backTo(anchor, error ? "error=save" : "saved=note"));
}

export async function saveAdvisorFollowUpForAction(formData: FormData) {
  const anchor = readAnchor(formData);
  if (!anchor) redirect("/advisor/dashboard");
  const { client, userId } = await prepare(anchor);

  const dueOn = String(formData.get("dueOn") ?? "").trim();
  // Ein Datum ohne Form waere eine Wiedervorlage, die nie faellig wird.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) redirect(backTo(anchor, "error=due"));

  const column = anchor.kind === "subject" ? "subject_user_id" : "review_id";
  const note = String(formData.get("note") ?? "").slice(0, MAX_FOLLOW_UP_NOTE);

  const { error } = await client.from("advisor_follow_ups").upsert(
    { [column]: anchor.id, advisor_user_id: userId, due_on: dueOn, note, completed_at: null },
    { onConflict: `${column},advisor_user_id` }
  );

  revalidatePath(backTo(anchor));
  redirect(backTo(anchor, error ? "error=save" : "saved=followUp"));
}

export async function completeAdvisorFollowUpForAction(formData: FormData) {
  const anchor = readAnchor(formData);
  if (!anchor) redirect("/advisor/dashboard");
  const { client, userId } = await prepare(anchor);

  const column = anchor.kind === "subject" ? "subject_user_id" : "review_id";
  const { error } = await client
    .from("advisor_follow_ups")
    .update({ completed_at: new Date().toISOString() })
    .eq(column, anchor.id)
    .eq("advisor_user_id", userId);

  revalidatePath(backTo(anchor));
  redirect(backTo(anchor, error ? "error=save" : "saved=done"));
}
