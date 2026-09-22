"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DIRECTION_FACETS,
  STATEMENT_MAX_LENGTH,
  STATEMENT_MIN_LENGTH,
} from "./directionInterviewGuide";

/**
 * Eigene Aussagen über die eigene Richtung.
 *
 * SCHRITT S3: Die Anwendung schreibt ausschließlich `origin: 'own_words'`.
 * Die beiden anderen Herkünfte - ein bestätigter und ein umformulierter
 * Vorschlag - entstehen erst in Schritt S4, und zwar durch eine Funktion in
 * der Datenbank. Würde die Anwendung sie schon jetzt schreiben können, wäre
 * die Herkunft eine Behauptung des Aufrufers statt einer Tatsache.
 *
 * WARUM DER MENSCH ZUERST DRAN IST und nicht das Modell: Wer den
 * Bestätigungsweg nachträglich um einen fertigen Vorschlagsstrom herumbaut,
 * bekommt einen Bestätigungsknopf. Wer ihn zuerst baut, bekommt eine
 * Entscheidung - und das Modell muss sich später in einen Ablauf einfügen,
 * der den Menschen schon kennt.
 */

const PATH = "/profile/direction";

function back(error: string): never {
  revalidatePath(PATH);
  redirect(`${PATH}?error=${encodeURIComponent(error)}#direction-statements`);
}

function done(): never {
  revalidatePath(PATH);
  revalidatePath("/profile");
  redirect(`${PATH}#direction-statements`);
}

async function requireUser() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);
  return { client, userId: user.id };
}

function readStatement(formData: FormData) {
  const statement = String(formData.get("statement") ?? "").trim();
  if (statement.length < STATEMENT_MIN_LENGTH) back("statement_short");
  if (statement.length > STATEMENT_MAX_LENGTH) back("statement_long");
  return statement;
}

export async function addDirectionStatementAction(formData: FormData) {
  const { client, userId } = await requireUser();
  const facet = String(formData.get("facet") ?? "");
  if (!(DIRECTION_FACETS as readonly string[]).includes(facet)) back("facet");
  const statement = readStatement(formData);

  const { error } = await client.from("direction_statements").insert({
    user_id: userId,
    facet,
    statement,
    // Selbst geschrieben heisst: so gesagt. Die anderen Stufen entstehen aus
    // Beispielen und gehoeren deshalb zur Auswertung, nicht zum Eintippen.
    confidence: "stated",
    origin: "own_words",
  });
  if (error) back("save");
  done();
}

export async function editDirectionStatementAction(formData: FormData) {
  const { client } = await requireUser();
  const id = String(formData.get("statementId") ?? "");
  const statement = readStatement(formData);

  // Die Zeilensicherheit prueft die Zugehoerigkeit - eine fremde Kennung
  // trifft auf keine Zeile.
  const { error } = await client
    .from("direction_statements")
    .update({ statement })
    .eq("id", id);
  if (error) back("save");
  done();
}

/**
 * Entfernen heisst entfernen.
 *
 * Kein "verborgen"-Merkmal: Wer eine Aussage ueber sich zuruecknimmt, will
 * nicht, dass sie irgendwo weiterlebt. Und weil diese Tabelle die einzige
 * ist, die andere Bereiche jemals lesen, ist die Zeile weg auch wirklich weg.
 */
export async function removeDirectionStatementAction(formData: FormData) {
  const { client } = await requireUser();
  const id = String(formData.get("statementId") ?? "");
  const { error } = await client.from("direction_statements").delete().eq("id", id);
  if (error) back("save");
  done();
}
