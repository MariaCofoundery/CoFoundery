/**
 * Itemanalyse auf den Forschungsdaten.
 *
 *   npm run item-analysis
 *
 * WOFUER: Die Frage "ist das valide und reliabel" laesst sich nicht
 * beantworten, indem man sie stellt. Dieses Skript beantwortet den Teil, der
 * sich mit den vorhandenen Daten beantworten laesst: Trennen die einzelnen
 * Items? Haengen die sechs Items einer Dimension zusammen? Gibt es Items, die
 * alle gleich beantworten - also nichts messen?
 *
 * WAS ES NICHT BEANTWORTET: ob eine Dimension misst, was ihr Name sagt. Dafuer
 * braucht es eine Faktorenanalyse und irgendwann ein Aussenkriterium (Phase 4
 * und 5 in `docs/founder-compatibility-validation-plan.md`).
 *
 * ES LIEST NUR DEN FORSCHUNGSSTROM. `research_events_analytics_v1` enthaelt
 * pseudonyme Kennungen (`subject_hash`), nicht die Nutzerkennung, und es liegt
 * ausschliesslich dort, wofuer eine Einwilligung vorliegt. Die Rohantworten in
 * `assessment_answers` ruehrt dieses Skript NICHT an - sie gehoeren dem
 * Produkt, nicht der Forschung, auch wenn beide dieselbe Zahl enthalten.
 *
 * ES SCHREIBT NICHTS IN DAS REPOSITORY. Die Ausgabe geht auf die Konsole. Eine
 * Datei mit Auswertungen echter Antworten im Repository waere ein Datensatz,
 * der dorthin nicht gehoert - auch als Aggregat nicht.
 *
 * WAS ES BRAUCHT (in web/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Der Service-Role-Schluessel steht hier, weil der Forschungsstrom
 * ausschliesslich fuer ihn lesbar ist - kein angemeldeter Nutzer kommt daran.
 * Er gehoert in die lokale Umgebung und nirgendwo sonst hin.
 */

import { createClient } from "@supabase/supabase-js";

import {
  analyseScale,
  MIN_RESPONDENTS,
  type ItemValues,
} from "@/features/research/itemAnalysis";
import {
  isActiveFounderCompatibilityItemId,
  mapRegistryFounderChoiceToFounderPercent,
} from "@/features/scoring/founderCompatibilityAnswerRuntime";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type Row = {
  subject_hash: string | null;
  question_id: string | null;
  choice_value: string | null;
  dimension: string | null;
  instrument_version: string | null;
};

/**
 * Die POLARITAET kommt aus derselben Quelle wie im Produkt.
 *
 * Ohne sie waere jede Zahl hier falsch: Ein Item, das auf den linken Pol
 * geschluesselt ist, antwortet gegenlaeufig, und ein Alpha ueber ungedrehte
 * Werte sagt dann "die Items passen nicht zusammen", obwohl sie es tun. Eine
 * eigene Polaritaetsliste in diesem Skript waere die zweite Wahrheit und
 * damit die erste, die auseinanderlaeuft.
 */
function toFounderPercent(questionId: string, rawValue: string) {
  if (!isActiveFounderCompatibilityItemId(questionId)) return null;
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return null;
  return mapRegistryFounderChoiceToFounderPercent(questionId, value);
}

async function main() {
  if (!URL || !KEY) {
    console.log(
      "Nicht eingerichtet: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen.\n" +
        "Beide gehoeren in web/.env.local. Der Service-Role-Schluessel liest den\n" +
        "Forschungsstrom - er gehoert nie in die Anwendung."
    );
    return;
  }

  const client = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await client
    .from("research_events_analytics_v1")
    .select("subject_hash, question_id, choice_value, dimension, instrument_version")
    .not("choice_value", "is", null)
    .not("subject_hash", "is", null)
    .limit(100000);

  if (error) {
    console.error("Konnte den Forschungsstrom nicht lesen:", error.message);
    process.exitCode = 1;
    return;
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    console.log("Keine Antworten mit Einwilligung vorhanden. Nichts zu rechnen.");
    return;
  }

  // Je Dimension: je Item die Antworten, geordnet nach Person. Nur
  // VOLLSTAENDIGE Faelle - wer eine Frage ausgelassen hat, verzerrt sonst
  // jede Korrelation auf seine eigene Weise.
  const byDimension = new Map<string, Map<string, Map<string, number>>>();
  for (const row of rows) {
    if (!row.question_id || !row.choice_value || !row.subject_hash) continue;
    const percent = toFounderPercent(row.question_id, row.choice_value);
    if (percent === null) continue;
    const dimension = row.dimension ?? "ohne Dimension";
    const items = byDimension.get(dimension) ?? new Map<string, Map<string, number>>();
    const subjects = items.get(row.question_id) ?? new Map<string, number>();
    // Die letzte Antwort gilt - wer korrigiert, korrigiert.
    subjects.set(row.subject_hash, percent);
    items.set(row.question_id, subjects);
    byDimension.set(dimension, items);
  }

  const dimensions = [...byDimension.keys()].sort();
  if (dimensions.length === 0) {
    console.log(
      "Keine Antworten, die sich einem aktiven Item zuordnen lassen.\n" +
        "Wahrscheinlich stammen sie aus einer aelteren Fassung des Fragebogens."
    );
    return;
  }

  for (const dimension of dimensions) {
    const itemMap = byDimension.get(dimension)!;
    const itemIds = [...itemMap.keys()].sort();

    // Vollstaendige Faelle: Personen, die jedes Item dieser Dimension
    // beantwortet haben.
    const complete = [...itemMap.get(itemIds[0]!)!.keys()].filter((subject) =>
      itemIds.every((itemId) => itemMap.get(itemId)!.has(subject))
    );

    const items: ItemValues[] = itemIds.map((itemId) => ({
      id: itemId,
      values: complete.map((subject) => itemMap.get(itemId)!.get(subject)!),
    }));

    const report = analyseScale(items);
    console.log(`\n=== ${dimension}`);
    console.log(
      `   ${report.n} vollstaendige Faelle, ${report.itemCount} Items` +
        (report.alpha === null ? ", Alpha nicht berechenbar" : `, Alpha ${report.alpha.toFixed(2)}`)
    );
    if (report.n < MIN_RESPONDENTS) {
      console.log(`   ACHTUNG: unter ${MIN_RESPONDENTS} Faellen sind alle Werte instabil.`);
    }
    for (const note of report.notes) console.log(`   Hinweis: ${note}`);

    for (const item of report.items) {
      const trennschaerfe =
        item.itemTotal === null ? "  n/a" : item.itemTotal.toFixed(2).padStart(5, " ");
      const flags = item.notes.length > 0 ? `  <- ${item.notes.join(", ")}` : "";
      console.log(
        `   ${item.id.padEnd(22)} Trennschaerfe ${trennschaerfe}` +
          `  M ${item.mean.toFixed(1).padStart(5)}  SD ${item.sd.toFixed(1).padStart(4)}${flags}`
      );
    }
  }

  console.log(
    "\nWas diese Zahlen NICHT sagen: ob eine Dimension misst, was ihr Name sagt.\n" +
      "Das ist Phase 4 des Validierungsplans und braucht mehr Faelle."
  );
}

void main();
