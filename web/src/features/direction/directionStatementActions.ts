"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDirectionAnswers } from "@/features/direction/directionInterviewData";
import { findDirectionRuleFindings } from "@/features/direction/directionRulesAnalysis";
import { createClient } from "@/lib/supabase/server";
import {
  DIRECTION_FACETS,
  STATEMENT_MAX_LENGTH,
  STATEMENT_MIN_LENGTH,
} from "@/features/direction/directionInterviewGuide";

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

/**
 * Das Modell um Vorschläge bitten - für EINE eigene Antwort.
 *
 * NICHTS LÄUFT VON SELBST LOS. Der privateste Text im Produkt geht nicht
 * deshalb an ein Modell, weil jemand eine Seite geöffnet hat. Die Prüfung, wem
 * die Antwort gehört, macht die Datenbank
 * (`request_direction_statement_proposals`).
 */
export async function askForDirectionProposalsAction(formData: FormData) {
  const { client } = await requireUser();
  const turnId = String(formData.get("turnId") ?? "");

  const { error } = await client.rpc("request_direction_statement_proposals", {
    p_turn_id: turnId,
  });
  // Ein abgelehnter Auftrag ist kein Drama: Vielleicht läuft schon einer.
  if (error) back("ask");
  done();
}

/**
 * Alle Antworten auf einmal lesen lassen.
 *
 * GEMELDET AM 22.09.2026: "Wenn du das sechsmal anklicken musst, ist das ein
 * bisschen unhandlich." Stimmt - der Knopf stand an jeder einzelnen Antwort,
 * und wer sein Gespräch fertig hat, will nicht sechsmal dasselbe entscheiden.
 *
 * ES BLEIBT EINE ENTSCHEIDUNG, nur eine statt sechs: Nichts läuft von selbst
 * los, und es steht weiterhin dabei, wohin die Antworten gehen.
 *
 * DIE ANTWORTEN WERDEN HIER GELESEN, nicht aus dem Formular genommen: Sonst
 * bestimmte der Browser, welche Zeilen an ein Modell gehen. Die Datenbank
 * prüft ohnehin jede einzelne (`request_direction_statement_proposals`), aber
 * eine Liste, die von außen kommt, wäre eine unnötige zweite Stelle, an der
 * etwas falsch sein kann.
 *
 * Ein laufender Auftrag wird nicht verdoppelt - das entscheidet
 * `enqueue_ai_job` selbst.
 */
export async function askForAllDirectionProposalsAction() {
  const { client } = await requireUser();
  const answers = await getDirectionAnswers(client);

  for (const answer of answers) {
    // Einzeln, und ein Fehler bei einer Antwort nimmt die übrigen nicht mit.
    await client.rpc("request_direction_statement_proposals", { p_turn_id: answer.id });
  }
  done();
}

/**
 * Die eigenen Antworten durchsehen - ohne Modell.
 *
 * GEWÜNSCHT AM 22.09.2026: "Es muss ja auch ohne KI gehen, dass der Text mal
 * ein bisschen analysiert wird."
 *
 * ES LÄUFT HIER UND JETZT, nicht über die Warteschlange: Es gibt kein Modell,
 * auf das zu warten wäre, und nichts verlässt den Server. Deshalb auch kein
 * Auftrag, kein Wartezustand, kein Nachladen.
 *
 * WAS ENTSTEHT, IST EIN ZITAT MIT EINER RUBRIK - der Satz, in dem die Person
 * selbst gesagt hat, was ihr wichtig war. Die Datenbank prüft, dass auch der
 * Vorschlag selbst wörtlich in der Antwort steht
 * (`insert_rule_direction_proposal`); ein Regelweg, der formuliert, wäre genau
 * der, den wir nicht wollen.
 */
export async function readDirectionAnswersWithRulesAction() {
  const { client } = await requireUser();
  const answers = await getDirectionAnswers(client);

  for (const answer of answers) {
    if (!answer.answer) continue;
    for (const finding of findDirectionRuleFindings(answer.answer)) {
      // Einzeln: Ein abgelehnter Fund darf die übrigen nicht mitnehmen. Und
      // doppelte fängt die Datenbank (ein Fund je Vorgang, Rubrik und
      // Herkunft).
      await client.rpc("insert_rule_direction_proposal", {
        p_turn_id: answer.id,
        p_facet: finding.facet,
        p_statement: finding.statement,
        p_quote: finding.quote,
      });
    }
  }
  done();
}

/**
 * Einen Vorschlag annehmen - unverändert oder umformuliert.
 *
 * Die Herkunft entsteht in der Datenbank aus dem Vergleich mit dem, was das
 * Modell geschrieben hat (`confirm_direction_proposal`). Sie ist damit eine
 * Tatsache und keine Behauptung dieser Datei.
 */
export async function confirmDirectionProposalAction(formData: FormData) {
  const { client } = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "");
  const statement = String(formData.get("statement") ?? "").trim();

  const { error } = await client.rpc("confirm_direction_proposal", {
    p_proposal_id: proposalId,
    p_statement: statement.length > 0 ? statement : null,
  });
  if (error) back("save");
  done();
}

/**
 * Einen Vorschlag ablehnen.
 *
 * Er bleibt als abgelehnt stehen, statt gelöscht zu werden: So bekommt man
 * denselben Vorschlag nicht wieder, wenn dieselbe Antwort noch einmal gelesen
 * wird. Gezeigt wird er nie mehr.
 */
export async function rejectDirectionProposalAction(formData: FormData) {
  const { client } = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "");

  const { error } = await client
    .from("direction_statement_proposals")
    .update({ status: "rejected", decided_at: new Date().toISOString() })
    .eq("id", proposalId)
    .eq("status", "pending");
  if (error) back("save");
  done();
}
