"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Eine Einladung auf /einladungen annehmen oder ablehnen - ohne den Link aus der Mail. Dieselben Pruefungen wie beim
 * Link (Adresse, offen, nicht abgelaufen) macht die Datenbank. Annehmen einer Organisation macht zum Mitglied; die Bitte
 * um Einblick erzeugt nur Anfragen - freigegeben wird danach unter Konto.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PATH = "/einladungen";

async function requireClient() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);
  return client;
}

export async function acceptInviteAction(formData: FormData) {
  const client = await requireClient();
  const id = String(formData.get("inviteId") ?? "");
  const kind = formData.get("kind") === "person" ? "person" : "org";
  if (!UUID.test(id)) redirect(`${PATH}?error=1`);
  if (kind === "org") {
    const { data, error } = await client.rpc("claim_advisor_org_invite_by_id", { p_invite_id: id });
    if (error) redirect(`${PATH}?error=1`);
    revalidatePath("/", "layout");
    redirect(typeof data === "string" && UUID.test(data) ? `/advisor/organisation?org=${data}&tab=members` : "/advisor/organisation");
  }
  const { error } = await client.rpc("claim_advisor_person_invite_by_id", { p_invite_id: id });
  if (error) redirect(`${PATH}?error=1`);
  revalidatePath("/", "layout");
  redirect("/account?notice=invite_claimed#person-access");
}

export async function declineInviteAction(formData: FormData) {
  const client = await requireClient();
  const id = String(formData.get("inviteId") ?? "");
  const kind = formData.get("kind") === "person" ? "person" : "org";
  if (!UUID.test(id)) redirect(`${PATH}?error=1`);
  const { error } = await client.rpc("decline_my_invite", { p_kind: kind, p_invite_id: id });
  revalidatePath("/", "layout");
  redirect(error ? `${PATH}?error=1` : `${PATH}?declined=1`);
}
