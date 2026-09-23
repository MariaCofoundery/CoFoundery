"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Zustimmen, ablehnen, zurücknehmen.
 *
 * DREI WEGE, EINE FUNKTION IN DER DATENBANK
 * (`decide_advisor_person_access`): Es soll nicht drei Stellen geben, an denen
 * `status` gesetzt wird - eine davon wäre irgendwann die, die das Zustimmen
 * überspringt.
 *
 * WIDERRUFEN GEHT IMMER UND SOFORT. Deshalb steht der Knopf neben jedem
 * aktiven Zugang und nicht in einer Einstellung zwei Ebenen tiefer.
 */

const PATH = "/account";
const ANCHOR = "#person-access";

function done(): never {
  revalidatePath(PATH);
  redirect(`${PATH}${ANCHOR}`);
}

async function decide(formData: FormData, decision: "approve" | "decline" | "revoke") {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);

  const grantId = String(formData.get("grantId") ?? "");
  // Wem die Zeile gehört und wer was entscheiden darf, prüft die Datenbank -
  // eine zweite Kopie dieser Regel hier wäre die erste, die ausläuft.
  await client.rpc("decide_advisor_person_access", {
    p_grant_id: grantId,
    p_decision: decision,
  });
  done();
}

export async function approvePersonAccessAction(formData: FormData) {
  return decide(formData, "approve");
}

export async function declinePersonAccessAction(formData: FormData) {
  return decide(formData, "decline");
}

export async function revokePersonAccessAction(formData: FormData) {
  return decide(formData, "revoke");
}
