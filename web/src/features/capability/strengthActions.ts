"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  REFLECTED_GROUPS,
  STRENGTH_FREQUENCIES,
} from "@/features/capability/strengthData";
import { createClient } from "@/lib/supabase/server";

/**
 * Stärken festhalten und einschätzen.
 *
 * DIE EINSCHÄTZUNG IST EIN EIGENER SCHRITT und nicht Teil des Anlegens: Erst
 * steht der Satz, dann entscheidet man, wie oft sich das zeigt. Beides in
 * einem Formular hieße, dass man sich einschätzt, bevor man den Satz gelesen
 * hat.
 *
 * UND SIE IST IMMER ÄNDERBAR. Was jemand über sich denkt, ändert sich - und
 * zwar besonders dann, wenn er zum ersten Mal beides nebeneinander sieht.
 */

const PATH = "/profile";
const ANCHOR = "#strengths";

function back(error: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?error=${encodeURIComponent(error)}${ANCHOR}`);
}

function done(): never {
  revalidatePath(PATH);
  revalidatePath("/me/profile");
  redirect(`${PATH}${ANCHOR}`);
}

async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);
  return { client, userId: user.id };
}

export async function addStrengthAction(formData: FormData) {
  const { client, userId } = await requireUser();
  const statement = String(formData.get("statement") ?? "").trim();
  if (statement.length < 3 || statement.length > 200) back("strength_length");

  const { error } = await client.from("person_strengths").insert({
    user_id: userId,
    statement,
    origin: "own_words",
  });
  if (error) back("save");
  done();
}

export async function removeStrengthAction(formData: FormData) {
  const { client } = await requireUser();
  const id = String(formData.get("strengthId") ?? "");
  const { error } = await client.from("person_strengths").delete().eq("id", id);
  if (error) back("save");
  done();
}

/**
 * Die eigene Einschätzung und die vermutete Außensicht.
 *
 * BEIDE FELDER SIND FREIWILLIG, und ein leeres Feld löscht die Angabe wieder.
 * Wer nicht weiß, was seine früheren Kolleginnen sagen würden, soll nicht
 * raten müssen - eine geratene Außensicht ist schlechter als keine.
 *
 * DIE GRUPPE MUSS DABEISTEHEN, wenn eine Außensicht angegeben wird: "Was
 * würden meine Geschwister sagen" und "was würde mein letzter Chef sagen" sind
 * zwei verschiedene Fragen. Die Datenbank erzwingt das Paar.
 */
export async function assessStrengthAction(formData: FormData) {
  const { client } = await requireUser();
  const id = String(formData.get("strengthId") ?? "");
  const self = String(formData.get("selfFrequency") ?? "");
  const reflected = String(formData.get("reflectedFrequency") ?? "");
  const who = String(formData.get("reflectedWho") ?? "");

  const selfValue = (STRENGTH_FREQUENCIES as readonly string[]).includes(self) ? self : null;
  const reflectedValue = (STRENGTH_FREQUENCIES as readonly string[]).includes(reflected)
    ? reflected
    : null;
  const whoValue = (REFLECTED_GROUPS as readonly string[]).includes(who) ? who : null;

  const { error } = await client
    .from("person_strengths")
    .update({
      self_frequency: selfValue,
      // Ohne Gruppe keine Außensicht - sonst wäre es eine Behauptung über
      // alle, die einen kennen.
      reflected_frequency: whoValue ? reflectedValue : null,
      reflected_who: reflectedValue ? whoValue : null,
    })
    .eq("id", id);
  if (error) back("save");
  done();
}

export async function confirmStrengthProposalAction(formData: FormData) {
  const { client } = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "");
  const statement = String(formData.get("statement") ?? "").trim();

  const { error } = await client.rpc("confirm_strength_proposal", {
    p_proposal_id: proposalId,
    p_statement: statement.length > 0 ? statement : null,
  });
  if (error) back("save");
  done();
}

export async function rejectStrengthProposalAction(formData: FormData) {
  const { client } = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "");
  const { error } = await client
    .from("person_strength_proposals")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("status", "pending");
  if (error) back("save");
  done();
}
