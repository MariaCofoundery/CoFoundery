import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildInterviewSummary,
  type SummarySource,
} from "@/features/capability/capabilityInterviewSummary";

/**
 * Der Blick zurück auf ein Gespräch.
 *
 * GEMELDET AM 21.09.2026: "Acht Geschichten erzählt, und am Ende kommt kein
 * Blick zurück." Geprueft wird hier das Verhalten - die Funktion ist rein.
 */

const source = (
  questionId: string,
  areaIds: string[],
  options: { answered?: boolean; sorted?: boolean } = {}
): SummarySource => ({
  questionId,
  areaIds,
  answered: options.answered ?? true,
  sorted: options.sorted ?? true,
});

test("ein Bereich aus drei Geschichten ist etwas anderes als einer aus einer", () => {
  // DIE VERLAESSLICHSTE AUSKUNFT, DIE DIESES VERFAHREN HERGIBT - und sie steht
  // in keinem einzelnen Eintrag. Die Auswertung im Profil kann sie nicht
  // kennen: Fuer sie sind zehn Eintraege aus zehn Geschichten dasselbe wie
  // zehn aus einer.
  const summary = buildInterviewSummary([
    source("owned_last", ["b2b_sales", "pricing"]),
    source("went_wrong", ["b2b_sales"]),
    source("outside_work", ["b2b_sales", "facilitation"]),
  ]);

  assert.deepEqual(summary.recurring, [{ areaId: "b2b_sales", times: 3 }]);
  assert.deepEqual(summary.single, ["facilitation", "pricing"]);
});

test("zweimal derselbe Bereich in EINER Geschichte ist keine Wiederholung", () => {
  const summary = buildInterviewSummary([
    source("owned_last", ["b2b_sales", "b2b_sales"]),
  ]);
  assert.deepEqual(summary.recurring, []);
  assert.deepEqual(summary.single, ["b2b_sales"]);
});

test("was andere an dir sehen, steht getrennt", () => {
  // Frage 6 erhebt keine Selbsteinschaetzung, sondern ein beobachtetes
  // Verhalten anderer. Bei Menschen, die sich selbst niedrig einschaetzen, ist
  // das oft die einzige Stelle, an der eine Staerke sichtbar wird - in
  // denselben Topf gelegt waere sie unsichtbar.
  const summary = buildInterviewSummary([
    source("owned_last", ["pricing"]),
    source("people_come_to_you", ["teaching_mentoring", "data_analytics"]),
  ]);

  assert.deepEqual(summary.observedByOthers.sort(), ["data_analytics", "teaching_mentoring"]);
  // Und sie zaehlen trotzdem normal mit - es ist eine zweite Ansicht, keine
  // zweite Buchhaltung.
  assert.ok(summary.single.includes("teaching_mentoring"));
});

test("beide Richtungen des Wollens kommen aus ihren Fragen", () => {
  // Die Zuordnung laeuft ueber `target` im Leitfaden und nicht ueber die
  // Position: Wer die Reihenfolge aendert, soll nicht aus Versehen das Abgeben
  // als Uebernehmen ausgeben.
  const summary = buildInterviewSummary([
    source("would_hand_over", ["accounting_controlling"]),
    source("want_to_own", ["fundraising"]),
  ]);

  assert.deepEqual(summary.handOver, ["accounting_controlling"]);
  assert.deepEqual(summary.growInto, ["fundraising"]);
});

test("uebersprungen und nicht gefunden sind zwei verschiedene Dinge", () => {
  // Das erste ist eine Entscheidung ("dazu habe ich nichts"), das zweite eine
  // Luecke unserer Begriffsliste. Beides ist kein Mangel der Person, aber es
  // sind nicht dieselben Saetze.
  const summary = buildInterviewSummary([
    source("owned_last", ["pricing"]),
    source("went_wrong", [], { answered: false }),
    source("outside_work", []),
  ]);

  assert.equal(summary.answered, 2);
  assert.equal(summary.skipped, 1);
  assert.equal(summary.withoutArea, 1);
});

test("eine Modellnachfrage ist keine uebersprungene Station", () => {
  // Der Leitfaden hat acht Stationen. Eine Nachfrage des Modells ist eine
  // Vertiefung - sie unbeantwortet zu lassen ist kein Ueberspringen.
  const summary = buildInterviewSummary([
    source("owned_last", ["pricing"]),
    source("model", [], { answered: false }),
  ]);
  assert.equal(summary.skipped, 0);
});

test("noch nicht eingeordnete Antworten machen das Fazit vorlaeufig", () => {
  // Ohne diese Zahl liest sich ein duennes Fazit wie ein Ergebnis, obwohl die
  // Haelfte noch gar nicht eingeordnet ist.
  const summary = buildInterviewSummary([
    source("owned_last", ["pricing"]),
    source("went_wrong", [], { sorted: false }),
  ]);
  assert.equal(summary.unsorted, 1);
});

test("die Frage ausserhalb der Erwerbsarbeit wird gezaehlt", () => {
  // Sie ist der Grund, warum der Katalog bei nichtlinearen Lebenslaeufen
  // ueberhaupt etwas findet - dass sie beantwortet wurde, ist eine Auskunft
  // wert.
  const summary = buildInterviewSummary([
    source("owned_last", ["pricing"]),
    source("outside_work", ["facilitation"]),
  ]);
  assert.equal(summary.personal, 1);
});

test("ohne beantwortete Frage gibt es nichts zu zeigen", () => {
  const empty = buildInterviewSummary([source("owned_last", [], { answered: false })]);
  assert.equal(empty.hasContent, false);

  // Aber eine beantwortete Frage OHNE Treffer ist etwas: Dann steht da, dass
  // nichts gefunden wurde, und das ist eine ehrliche Auskunft ueber unsere
  // Begriffsliste - kein leerer Bildschirm.
  const nothingFound = buildInterviewSummary([source("owned_last", [])]);
  assert.equal(nothingFound.hasContent, true);
  assert.equal(nothingFound.withoutArea, 1);
});

test("das Fazit rechnet ueber alle bestaetigten Bereiche, nicht nur den fuehrenden", () => {
  // DER GRUND FUER EINE EIGENE TABELLE (20261031120000): Der Beleg haengt nur
  // am fuehrenden Bereich einer Antwort - die Erzaehlung dreimal zu speichern
  // waere dieselbe Geschichte dreimal im Profil. Ohne den Vermerk uebersaehe
  // "was mehrfach vorkam" jeden zweiten und dritten Bereich, und das ist genau
  // die Aussage, um die es hier geht.
  const source = readFileSync("src/features/capability/capabilityInterviewData.ts", "utf8");
  assert.match(source, /from\("capability_interview_turn_areas"\)/);
  // Und NICHT ueber den Beleg: Der kennt nur einen Bereich.
  const loader = source.slice(source.indexOf("export async function getInterviewSummary"));
  assert.doesNotMatch(loader, /person_capability_evidence/, "der Umweg ueber den Beleg ist zurueck");

  // Beim Einordnen werden alle vermerkt, beim Nochmal-Einordnen wieder geloest.
  const actions = readFileSync("src/features/capability/capabilityInterviewActions.ts", "utf8");
  assert.match(actions, /written\.areaIds\.map\(\(areaId\) => \(\{ turn_id: turnId, area_id: areaId \}\)\)/);
  assert.match(
    actions,
    /from\("capability_interview_turn_areas"\)\.delete\(\)\.eq\("turn_id", turnId\)/,
    "die alte Zuordnung bleibt beim Nochmal-Einordnen stehen"
  );
});

test("die Ansicht behauptet keinen Persoenlichkeitstyp", () => {
  // Die Versuchung ist gross: Aus acht Geschichten liesse sich ein "du bist
  // eher der Typ, der ..." formulieren, und es wuerde sich gut lesen. Es waere
  // aber eine Behauptung, die in keiner bestaetigten Einordnung steht - und
  // die Person koennte ihr nicht widersprechen, weil sie nicht aus ihren
  // Angaben folgt.
  // Kommentare UND Importzeilen heraus: `import type` traf sonst die Pruefung,
  // und der Kopfkommentar zitiert absichtlich genau die Formel, die hier
  // verboten ist.
  const view = readFileSync("src/features/capability/InterviewSummaryView.tsx", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/^import .*$/gm, " ");
  assert.doesNotMatch(view, /persönlichkeit|charakter|wesensart/i, "die Ansicht typisiert");

  // Und sie erfindet keine Prosa: Jeder sichtbare Satz kommt aus dem
  // Sprachbundle, wo er in beiden Sprachen stehen muss.
  assert.doesNotMatch(view, />\s*[A-ZÄÖÜ][a-zäöüß]+ [a-zäöüß]/, "es steht deutscher Text im Bauteil");

  // Und die Texte auch nicht.
  for (const locale of ["de", "en"]) {
    const copy = JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      interview: { summary: Record<string, string> };
    };
    const all = Object.values(copy.interview.summary).join(" ");
    assert.doesNotMatch(all, /du bist|you are (a|an|rather)/i, `${locale}: der Text typisiert`);

    // "Einmal genannt" darf nicht abgewertet werden - einmal erzaehlt heisst
    // einmal erzaehlt.
    assert.match(
      copy.interview.summary.singleText,
      locale === "de" ? /nicht weniger wert/ : /not worth less/,
      `${locale}: einmal Genanntes klingt geringer`
    );
  }
});
