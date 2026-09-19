"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Notizen und Wiedervorlage schreiben.
 *
 * DIE SCHREIBREGEL ist absichtlich eine andere als die Leseregel des uebrigen
 * Advisor-Bereichs:
 *
 *   Lesen von Founder-Inhalten verlangt eine AKTIVE Freigabe beider Founder.
 *
 *   Fuer eigene Notizen genuegt, dass ueberhaupt einmal eine Beziehung als
 *   Advisor bestand - egal in welchem Status. Sonst koennte jemand nach einem
 *   Widerruf seine eigene Handakte nicht mehr ergaenzen, obwohl das Mandat
 *   stattgefunden hat. Dass es NIE eine gab, bleibt ausgeschlossen: Ohne Zeile
 *   in relationship_advisors geht nichts.
 *
 * Gelesen wird ueber denselben angemeldeten Zugang, unter der Policy - die
 * Zeile gehoert der schreibenden Person, und niemand sonst kommt an sie.
 */

const MAX_NOTE = 20000;
const MAX_FOLLOW_UP_NOTE = 2000;

function sessionHref(invitationId: string, query?: string) {
  const base = `/advisor/session?invitationId=${encodeURIComponent(invitationId)}`;
  return query ? `${base}&${query}` : base;
}

/** War oder ist diese Person Advisor dieser Beziehung? */
async function wasEverAdvisor(
  client: Awaited<ReturnType<typeof createClient>>,
  relationshipId: string,
  userId: string
) {
  const { data, error } = await client
    .from("relationship_advisors")
    .select("id")
    .eq("relationship_id", relationshipId)
    .eq("advisor_user_id", userId)
    .limit(1)
    .maybeSingle();
  return !error && Boolean((data as { id?: string } | null)?.id);
}

export async function saveAdvisorPrivateNoteAction(
  invitationId: string,
  relationshipId: string,
  formData: FormData
) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(sessionHref(invitationId))}`);

  const client = await createClient();
  if (!(await wasEverAdvisor(client, relationshipId, user.id))) {
    redirect(sessionHref(invitationId, "error=forbidden"));
  }

  const body = String(formData.get("body") ?? "").slice(0, MAX_NOTE);
  const { error } = await client.from("advisor_private_notes").upsert(
    { relationship_id: relationshipId, advisor_user_id: user.id, body },
    { onConflict: "relationship_id,advisor_user_id" }
  );

  revalidatePath("/advisor/session");
  redirect(sessionHref(invitationId, error ? "error=save" : "saved=note"));
}

export async function saveAdvisorFollowUpAction(
  invitationId: string,
  relationshipId: string,
  formData: FormData
) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(sessionHref(invitationId))}`);

  const client = await createClient();
  if (!(await wasEverAdvisor(client, relationshipId, user.id))) {
    redirect(sessionHref(invitationId, "error=forbidden"));
  }

  const rawDate = String(formData.get("dueOn") ?? "").trim();
  // Leeres Datum heisst: keine Wiedervorlage mehr.
  if (!rawDate) {
    await client
      .from("advisor_follow_ups")
      .delete()
      .eq("relationship_id", relationshipId)
      .eq("advisor_user_id", user.id);
    revalidatePath("/advisor/session");
    redirect(sessionHref(invitationId, "saved=follow_up_cleared"));
  }

  // Nur ein Datum, und keins in der Vergangenheit - eine Wiedervorlage, die
  // schon vorbei ist, erinnert an nichts.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(Date.parse(rawDate))) {
    redirect(sessionHref(invitationId, "error=follow_up_date"));
  }
  const today = new Date().toISOString().slice(0, 10);
  if (rawDate < today) {
    redirect(sessionHref(invitationId, "error=follow_up_past"));
  }

  const note = String(formData.get("followUpNote") ?? "").trim().slice(0, MAX_FOLLOW_UP_NOTE);
  const { error } = await client.from("advisor_follow_ups").upsert(
    {
      relationship_id: relationshipId,
      advisor_user_id: user.id,
      due_on: rawDate,
      note,
      completed_at: null,
    },
    { onConflict: "relationship_id,advisor_user_id" }
  );

  revalidatePath("/advisor/session");
  redirect(sessionHref(invitationId, error ? "error=save" : "saved=follow_up"));
}

export async function completeAdvisorFollowUpAction(
  invitationId: string,
  relationshipId: string
) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(sessionHref(invitationId))}`);

  const client = await createClient();
  const { error } = await client
    .from("advisor_follow_ups")
    .update({ completed_at: new Date().toISOString() })
    .eq("relationship_id", relationshipId)
    .eq("advisor_user_id", user.id);

  revalidatePath("/advisor/session");
  redirect(sessionHref(invitationId, error ? "error=save" : "saved=follow_up_done"));
}
