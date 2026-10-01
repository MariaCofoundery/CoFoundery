"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  RESOURCE_KINDS,
  RESOURCE_LABEL_MAX,
  RESOURCE_LABEL_MIN,
  type ResourceKind,
} from "@/features/ai/resourceExtraction";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Netzwerk, Zugänge und Angebote selbst eintragen.
 *
 * ---------------------------------------------------------------------------
 * KEIN ZWEITES MODELL, KEINE ZWEITE TABELLE
 * ---------------------------------------------------------------------------
 *
 * `person_resources` konnte das längst. Die Spalten standen seit der
 * Vorschlagsmechanik da, mit genau den richtigen Voreinstellungen:
 *
 *     origin  default 'self'
 *     status  default 'confirmed'
 *
 * und zwei Bedingungen, die zusammen genau das erlauben, was hier gebraucht
 * wird:
 *
 *     person_resources_self_is_confirmed   origin='self' muss confirmed sein
 *     person_resources_evidence_required   nur ein Modell braucht einen Beleg
 *
 * Es fehlte nie die Tabelle, es fehlte das Formular.
 *
 * ---------------------------------------------------------------------------
 * `origin` WIRD NIE GESCHRIEBEN
 * ---------------------------------------------------------------------------
 *
 * Beim Anlegen nicht, weil die Voreinstellung 'self' richtig ist und die
 * Zeilensicherheit ohnehin nichts anderes zulässt
 * (`person_resources_insert_own` verlangt `origin = 'self'`).
 *
 * Beim Ändern nicht, weil die Herkunft einer Zeile nicht davon abhängt, dass
 * jemand sie später angefasst hat. Ein stilles Überschreiben würde aus einem
 * bestätigten Modellvorschlag rückwirkend eine eigene Eingabe machen.
 *
 * ---------------------------------------------------------------------------
 * EIN BESTÄTIGTER MODELLVORSCHLAG LÄSST SICH NICHT UMSCHREIBEN
 * ---------------------------------------------------------------------------
 *
 * Er trägt sein Zitat: die Stelle im eigenen Text, auf die er sich stützt.
 * Ändert man den Satz, stützt das Zitat ihn nicht mehr - und es lässt sich
 * auch nicht entfernen, weil `person_resources_evidence_required` für
 * `origin = 'model'` einen Beleg verlangt.
 *
 * Bliebe, `origin` auf 'self' zu setzen. Das ist genau das stille
 * Überschreiben von oben.
 *
 * Deshalb: Modellzeilen lassen sich löschen, nicht ändern. Wer den Satz
 * anders haben will, verwirft den Vorschlag und schreibt seinen eigenen -
 * und das Ergebnis ist dann ehrlich eine eigene Eingabe.
 */

const PFAD = "/profile";
const SCHRITT = "/profile?step=resources";

/** Die Schluessel, die `/profile` kennt - siehe ERROR_KEYS und SAVED_KEYS dort. */
type Rueckmeldung =
  | "error=resource_empty"
  | "error=resource_duplicate"
  | "error=resource_save"
  | "saved=resource_added"
  | "saved=resource_updated"
  | "saved=resource_removed";

function zurueck(query: Rueckmeldung): never {
  revalidatePath(PFAD);
  revalidatePath("/me/profile");
  redirect(`${SCHRITT}&${query}#ressourcen`);
}

async function kontext() {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(SCHRITT)}`);
  return { user, client: await createClient() };
}

function parseKind(value: FormDataEntryValue | null): ResourceKind | null {
  const kind = String(value ?? "").trim();
  return (RESOURCE_KINDS as readonly string[]).includes(kind) ? (kind as ResourceKind) : null;
}

/**
 * Leer heißt nicht gespeichert.
 *
 * `btrim` wie in der Datenbank: Ein Eintrag aus Leerzeichen ist keiner, und
 * die Bedingung dort würde ihn ohnehin abweisen - nur mit einer Fehlermeldung,
 * die niemand versteht.
 */
function parseLabel(value: FormDataEntryValue | null): string | null {
  const label = String(value ?? "").trim();
  if (label.length < RESOURCE_LABEL_MIN) return null;
  return label.slice(0, RESOURCE_LABEL_MAX);
}

/** Derselbe Eintrag zweimal ist kein Fehler der Person, sondern eine Dublette. */
function istDublette(message: string | undefined) {
  return Boolean(message && /person_resources_unique_label|duplicate key/.test(message));
}

export async function addResourceAction(formData: FormData): Promise<void> {
  const kind = parseKind(formData.get("kind"));
  const label = parseLabel(formData.get("label"));
  if (!kind || !label) zurueck("error=resource_empty");

  const { user, client } = await kontext();

  // NUR DREI SPALTEN. `origin` und `status` kommen aus der Voreinstellung -
  // sie hier zu wiederholen hiesse, zwei Stellen zu pflegen, an denen
  // dieselbe Entscheidung steht.
  const { error } = await client
    .from("person_resources")
    .insert({ user_id: user.id, kind, label });

  if (error) zurueck(istDublette(error.message) ? "error=resource_duplicate" : "error=resource_save");
  zurueck("saved=resource_added");
}

export async function updateResourceAction(formData: FormData): Promise<void> {
  const id = String(formData.get("resource_id") ?? "").trim();
  const kind = parseKind(formData.get("kind"));
  const label = parseLabel(formData.get("label"));
  if (!id || !kind || !label) zurueck("error=resource_empty");

  const { user, client } = await kontext();

  // `origin` steht nicht in der Änderung, und `eq("origin", "self")` begrenzt
  // sie zusätzlich auf eigene Einträge: Ein bestätigter Modellvorschlag
  // behält seinen Satz und sein Zitat (Begründung oben).
  const { error, count } = await client
    .from("person_resources")
    .update({ kind, label }, { count: "exact" })
    .eq("id", id)
    // Ausdrücklich, obwohl die Zeilensicherheit dasselbe tut: Eine Abfrage,
    // deren Begrenzung nur aus einer Policy kommt, liest sich beim nächsten
    // Mal wie ein Fehler.
    .eq("user_id", user.id)
    .eq("origin", "self");

  if (error) zurueck(istDublette(error.message) ? "error=resource_duplicate" : "error=resource_save");
  // Kein Treffer heißt: fremde Zeile, geratene Kennung oder ein
  // Modellvorschlag. Kein Erfolg melden, wo nichts geschehen ist.
  if (!count) zurueck("error=resource_save");
  zurueck("saved=resource_updated");
}

/**
 * Löschen heißt löschen.
 *
 * KEIN SOFT DELETE. Die Tabelle kennt `rejected` - aber das ist der Zustand
 * eines VORSCHLAGS, den jemand nicht wollte, und er bleibt stehen, damit
 * derselbe Vorschlag nicht wiederkommt. Ein eigener Eintrag, den jemand
 * entfernt, hat nichts, was wiederkommen könnte; ihn als „abgelehnt"
 * aufzubewahren wäre ein Archiv, um das niemand gebeten hat.
 */
export async function deleteResourceAction(formData: FormData): Promise<void> {
  const id = String(formData.get("resource_id") ?? "").trim();
  if (!id) zurueck("error=resource_save");

  const { user, client } = await kontext();

  const { error } = await client
    .from("person_resources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) zurueck("error=resource_save");
  zurueck("saved=resource_removed");
}
