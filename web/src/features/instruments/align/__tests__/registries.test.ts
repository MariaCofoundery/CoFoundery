import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  FOUNDER_PROFILE,
  VENTURE_ALIGNMENT,
  REGISTRIES,
  SCOPES,
  getItemsV22,
  getItemV22,
  getSectionsV22,
  findItem,
  assertRegistryV22,
  type AssessmentScope,
  type RegistryV22,
} from "@/features/instruments/align/registries";

/** Alle Fragen beider Bögen - fürs Prüfen gegen die gemeinsame Quelle. */
const alleItems = () => SCOPES.flatMap((scope) => getItemsV22(scope));

/**
 * Die Registratur wird gegen ihre Quelle gehalten.
 *
 * Erzeugte Dateien kann man danach von Hand ändern, ohne dass es auffällt.
 * Deshalb wird nicht gegen einen Schnappschuss geprüft - der ginge beim Ändern
 * einfach mit -, sondern gegen die Master-Arbeitsfassung selbst.
 */

const quelle = readFileSync(
  join(process.cwd(), "..", "docs", "CoFoundery_ALIGN_Master_Arbeitsfassung_v0.2.md"),
  "utf8",
);
/** Zeilenumbrüche zusammenziehen: Im Dokument sind Sätze umbrochen. */
const flach = quelle.replace(/\s+/g, " ");

/**
 * Dieselbe Quelle, nur ohne die Schreibweise des Dokuments.
 *
 * Markdown maskiert eckige Klammern („\\[Name\\]“), und React setzt Text so,
 * wie er dasteht - der Backslash war bis zum 29.09.2026 auf dem Bildschirm zu
 * sehen. Die Maskierung herauszunehmen ist keine Umformulierung, aber auch
 * nicht nichts: Deshalb wird sie hier NICHT stillschweigend geglaettet,
 * sondern verlangt, dass die Frage in den dokumentierten Abweichungen steht.
 */
const flachOhneMaskierung = flach.replace(/\\([[\]*_`])/g, "$1");

/**
 * Die zweite Quelle: das Sprachreview.
 *
 * ---------------------------------------------------------------------------
 * ZWEI DOKUMENTE, ZWEI FRAGEN
 * ---------------------------------------------------------------------------
 *
 * Die Master-Arbeitsfassung sagt, WAS gefragt wird. Das Sprachreview vom
 * 29.09.2026 sagt, WIE es dasteht. Seitdem stammt der Wortlaut aus dem Review
 * und nicht mehr aus der Master-Fassung - und beides muss geprüft werden,
 * sonst könnte eine Umformulierung ein anderes Konstrukt einführen, ohne dass
 * es auffällt.
 *
 * Deshalb hier: Der Wortlaut muss im Review stehen, und die Frage selbst muss
 * es in der Master-Fassung geben.
 */
const review = readFileSync(
  join(
    process.cwd(), "..", "docs",
    "CoFoundery_ALIGN_Sprachreview_S01_MissingReasons_v0.1.md",
  ),
  "utf8",
).replace(/\s+/g, " ");

/**
 * Und die dritte Schicht: das UX-Review.
 *
 * Das Arbeitsprofil ist am 30.09.2026 noch einmal ueberarbeitet worden - am
 * Stueck gelesen klangen die Fragen nach Fragebogen. Seine Wortlaute stehen
 * seitdem dort und nicht mehr im Sprachreview.
 *
 * Das Venture-Alignment ist ausdruecklich NICHT dabei: "Separat als UX-Flow
 * ueberarbeiten. Nicht automatisch Master-Sprache 1:1 in die UI uebernehmen."
 * Eine halbe Ueberarbeitung waere dort schlimmer als keine.
 */
const uxReview = readFileSync(
  join(process.cwd(), "..", "docs", "ALIGN_UX_QA_Teil1_Founderprofil_v0.2.md"),
  "utf8",
).replace(/\s+/g, " ");

const quelleFuer = (scope: AssessmentScope) =>
  scope === "founder_profile" ? uxReview : review;

/**
 * Zurückgezogene Fragen werden nicht mehr überarbeitet.
 *
 * Die alte S01 steht noch in der Registratur, damit gespeicherte Antworten
 * lesbar bleiben - im Sprachreview hat sie keinen Wortlaut mehr, weil sie
 * niemandem mehr vorgelegt wird. Einen Wortlaut von ihr zu verlangen hiesse,
 * eine Frage zu pflegen, die es nicht mehr gibt.
 *
 * Die Liste ist leer und bleibt es hoffentlich: Sie ist da, damit eine
 * Ausnahme benannt werden MUSS, statt sich als weiche Regel einzuschleichen.
 */
const NOCH_NICHT_UEBERARBEITET = new Set<string>([]);

test("jeder Fragetext steht so in seinem Review", () => {
  for (const scope of SCOPES) {
  for (const item of getItemsV22(scope)) {
    if (NOCH_NICHT_UEBERARBEITET.has(item.itemId) || item.retired) continue;
    const review = quelleFuer(scope);
    if (review.includes(item.prompt)) continue;

    // W02 bis W06 stehen im Dokument als zwei Bloecke: erst die Lage, dann die
    // Frage. Zusammengesetzt ergeben sie den Fragetext - und deshalb wird
    // SATZWEISE geprueft statt am Stueck. Erfinden laesst sich damit trotzdem
    // nichts: Jeder Satz muss dort stehen.
    for (const satz of item.prompt.split(/(?<=\.)\s+/)) {
      assert.ok(
        review.includes(satz.trim()),
        `${item.itemId}: dieser Satz steht in keinem Review:\n${satz}`,
      );
    }
  }
  }
});

test("jede Frage gibt es auch in der fachlichen Quelle", () => {
  // Das Sprachreview darf umformulieren, nicht erfinden. Eine Kennung, die es
  // in der Master-Fassung nicht gibt, waere eine neue Frage ohne fachliche
  // Grundlage - und die braeuchte eine eigene Kennung und eine eigene
  // Begruendung.
  for (const item of alleItems()) {
    // S01a bis S01f und S01_top gibt es in der Master-Fassung nicht - sie
    // entstehen erst im Sprachreview, das S01 ausdruecklich ERSETZT statt
    // umzuformulieren. Die Begruendung steht in den Abweichungen.
    if (/^S01[a-f]$|^S01_/.test(item.itemId)) continue;
    assert.ok(
      new RegExp(`\\*\\*${item.itemId}\\*\\*`).test(flach),
      `${item.itemId} steht in keiner Master-Fassung`,
    );
  }
});

test("die Gegenprobe: ein erfundener Wortlaut faellt auf", () => {
  // Ohne sie koennte die Pruefung oben alles durchlassen, wenn das Dokument
  // nur lang genug ist.
  assert.ok(!review.includes("Wie sehr vertraust du deinem Bauchgefuehl?"));
});

test("jede Antwortmöglichkeit steht in einer der beiden Quellen - oder ist als Abweichung verzeichnet", () => {
  // Der Waechter hat beim Bauen meine eigene Umformulierung gefangen (R12,
  // „Datum“ → „an einem bestimmten Datum“). Genau so soll er arbeiten: Was
  // nicht in einer Quelle steht, muss begruendet dastehen - nicht am Test
  // vorbei.
  const begruendet = JSON.stringify(SCOPES.map((scope) => REGISTRIES[scope].deviationsFromSource));

  for (const item of alleItems()) {
    for (const option of item.options) {
      if (
        flach.includes(option.label) ||
        review.includes(option.label) ||
        uxReview.includes(option.label)
      ) continue;
      assert.ok(
        begruendet.includes(item.itemId),
        `${item.itemId}/${option.optionId}: „${option.label}“ steht weder in der Quelle ` +
          "noch in den dokumentierten Abweichungen",
      );
    }
  }
});

test("die Gegenprobe: eine unbegründete Umformulierung fällt auf", () => {
  // Ohne diesen Test koennte der Test oben alles durchlassen, sobald es
  // ueberhaupt eine Abweichung gibt.
  const erfunden = "eine Antwort, die so niemand geschrieben hat";
  assert.ok(!flach.includes(erfunden));
  assert.ok(!JSON.stringify(SCOPES.map((s) => REGISTRIES[s].deviationsFromSource)).includes(erfunden));
});

test("die Registratur erfindet keine Fragen", () => {
  const inQuelle = new Set(
    [...quelle.matchAll(/^\*\*([A-Z][0-9]{2})\*\*/gm)].map((match) => match[1]),
  );
  assert.ok(inQuelle.size >= 50, `zu wenige Items in der Quelle gefunden: ${inQuelle.size}`);

  // Die sieben S01-Nachfolger stehen im Sprachreview, nicht in der
  // Master-Fassung: Dort wird S01 ERSETZT statt umformuliert, und die
  // Begruendung steht in den Abweichungen. Sie werden deshalb hier
  // ausdruecklich benannt und nicht ueber ein Muster durchgewinkt - kaeme ein
  // achter dazu, faellt er auf.
  const AUS_DEM_SPRACHREVIEW = new Set([
    "S01a", "S01b", "S01c", "S01d", "S01e", "S01f", "S01_top",
  ]);

  for (const item of alleItems()) {
    if (AUS_DEM_SPRACHREVIEW.has(item.itemId)) {
      assert.ok(
        review.includes(item.itemId),
        `${item.itemId} steht in keiner der beiden Quellen`,
      );
      continue;
    }
    assert.ok(inQuelle.has(item.itemId), `${item.itemId} steht nicht in der Quelle`);
  }

  assert.equal(
    alleItems().length,
    inQuelle.size + AUS_DEM_SPRACHREVIEW.size,
    "es fehlen Fragen aus einer der beiden Quellen",
  );
});

test("weder Gesamtwert noch Dimensionswerte - in beiden Bögen", () => {
  for (const scope of SCOPES) {
    const registry = REGISTRIES[scope];
    assert.equal(registry.overallScore, false, scope);
    assert.equal(registry.dimensionScores, false, scope);
    assert.ok(!/"weight"|"score"\s*:\s*\d|"points"|"mean"/.test(JSON.stringify(registry)), scope);
  }
});

test("A und I stehen nebeneinander, nicht gegeneinander", () => {
  // "A und I niemals zu einem Analytisch-vs.-Intuitiv-Gesamtwert
  // verschmelzen" - Abschnitt 8.1 der Quelle. Beide koennen gleichzeitig hoch
  // sein; eine Achse dazwischen waere eine erfundene Gegensaetzlichkeit.
  const a = alleItems().filter((item) => item.itemId.startsWith("A"));
  const i = alleItems().filter((item) => item.itemId.startsWith("I"));
  assert.ok(a.length >= 2 && i.length >= 3);
  assert.notEqual(a[0].section, i[0].section, "A und I liegen im selben Abschnitt");
});

test("die fünf Stufen sind als ordinal gekennzeichnet, Handlungswahlen nicht", () => {
  // Die Quelle sagt es bei einigen selbst ("Nominal; keine Rangfolge"). Wer
  // beides gleich behandelt, hat die Information verloren, bevor die erste
  // Auswertung beginnt.
  for (const id of ["A01", "A02", "I01", "I02", "I03", "X01", "X04", "U01", "D02"]) {
    assert.equal(getItemV22(id)?.answerFormat, "ordinal_choice", `${id} ist ordinal`);
  }
  for (const id of ["K01", "K04", "D01", "G01", "T01"]) {
    assert.equal(getItemV22(id)?.answerFormat, "single_choice", `${id} ist nominal`);
  }
});

test("jede Frage lässt sich auslassen", () => {
  // Ohne Ausweg muss jemand eine Stufe ankreuzen, die er nicht meint. Daran
  // ist v1 gescheitert.
  for (const item of alleItems()) {
    assert.ok(item.missing.length >= 1, `${item.itemId}: kein Auslassungsgrund`);
    for (const entry of item.missing) {
      assert.ok(entry.label.length > 3, `${item.itemId}: Grund ohne Satz`);
    }
  }
});

test("kein Auslassungsgrund ist als Antwortmöglichkeit stehen geblieben", () => {
  // In der Quelle stehen "nicht angeben" und "noch nicht entschieden" in
  // derselben Zeile wie die Antworten. Als Wert gespeichert wuerden sie
  // mitgemittelt - genau so sind sie in v1 unsichtbar geworden.
  const verraeter = [
    "nicht angeben", "noch nicht entschieden", "noch offen",
    "noch nicht einschätzbar", "zunächst vertraulich klären",
  ];
  for (const item of alleItems()) {
    for (const option of item.options) {
      assert.ok(
        !verraeter.includes(option.label),
        `${item.itemId}: „${option.label}“ ist ein Auslassungsgrund und keine Antwort`,
      );
    }
  }
});

test("jede Abweichung von der Quelle ist begründet und verantwortet", () => {
  const alle = SCOPES.flatMap((scope) => REGISTRIES[scope].deviationsFromSource);
  assert.ok(alle.length >= 1);
  for (const abweichung of alle) {
    assert.ok(abweichung.reason.length > 30, "Abweichung ohne Begründung");
    assert.ok(abweichung.decidedBy.length > 0, "Abweichung ohne Verantwortlichen");
  }
});

test("die Wertefälle haben beide Anliegen und beide Wege", () => {
  const faelle = alleItems().filter((item) => item.answerFormat === "value_case");
  assert.equal(faelle.length, 6);
  for (const fall of faelle) {
    assert.equal(fall.concerns?.length, 2, `${fall.itemId}: Anliegen`);
    assert.equal(fall.paths?.length, 2, `${fall.itemId}: Wege`);
    for (const text of [...(fall.concerns ?? []), ...(fall.paths ?? [])]) {
      assert.ok(text.length > 10, `${fall.itemId}: „${text}“`);
    }
  }
});

test("eine Anschlussfrage hängt an einer Frage, die es gibt", () => {
  const anschluss = alleItems().filter((item) => item.showAfter);
  assert.ok(anschluss.length >= 2, "keine Anschlussfragen gefunden");
  for (const item of anschluss) {
    assert.ok(getItemV22(item.showAfter!), `${item.itemId} → ${item.showAfter}`);
  }
});

test("die Abschnitte decken alle Fragen ab und keiner ist leer", () => {
  for (const scope of SCOPES) {
    const sections = getSectionsV22(scope);
    assert.equal(
      sections.reduce((sum, entry) => sum + entry.items.length, 0),
      getItemsV22(scope).length,
      scope,
    );
    for (const section of sections) {
      assert.ok(section.items.length > 0, `${scope}: Abschnitt ohne Fragen: ${section.section}`);
    }
  }
});

test("die Prüfung beim Laden schlägt an, wenn etwas fehlt", () => {
  // Ohne diesen Test waere nicht belegt, dass assertRegistryV22 ueberhaupt
  // etwas tut - eine Pruefung, die nie ausloest, sieht aus wie eine, die
  // schuetzt.
  const ohneAusweg = JSON.parse(JSON.stringify(FOUNDER_PROFILE)) as RegistryV22;
  ohneAusweg.items[0].missing = [];
  assert.throws(() => assertRegistryV22(ohneAusweg), /kein Auslassungsgrund/);

  const mitWert = JSON.parse(JSON.stringify(FOUNDER_PROFILE)) as RegistryV22;
  (mitWert as unknown as { dimensionScores: boolean }).dimensionScores = true;
  assert.throws(() => assertRegistryV22(mitWert), /Dimensionswert/);

  const verwaist = JSON.parse(JSON.stringify(VENTURE_ALIGNMENT)) as RegistryV22;
  verwaist.items[0].showAfter = "Z99";
  assert.throws(() => assertRegistryV22(verwaist), /das es nicht gibt/);
});

// ---------------------------------------------------------------------------
// Die Teilung selbst
// ---------------------------------------------------------------------------

test("die beiden Bögen teilen die Fragen vollständig und ohne Überschneidung", () => {
  const profil = getItemsV22("founder_profile").map((item) => item.itemId);
  const venture = getItemsV22("venture_alignment").map((item) => item.itemId);

  const doppelt = profil.filter((id) => venture.includes(id));
  assert.deepEqual(doppelt, [], "diese Fragen stehen in beiden Bögen");
  assert.equal(profil.length + venture.length, alleItems().length);
  assert.ok(profil.length >= 10 && venture.length >= 20);
});

test("das Arbeitsprofil enthält nur, was portabel ist", () => {
  // Die Quelle, Abschnitt 1: A/I/E/T/D/X sind "relativ portabel". U/K sind es
  // NICHT - sie sind "team-/rollenabhaengig" und gehoeren deshalb zum
  // Vorhaben, obwohl sie wie Praeferenzen aussehen.
  for (const item of getItemsV22("founder_profile")) {
    assert.match(item.itemId, /^[AIETDX]/, `${item.itemId} gehört nicht ins Arbeitsprofil`);
  }
  for (const item of getItemsV22("venture_alignment")) {
    assert.match(item.itemId, /^[UKSRGBWL]/, `${item.itemId} gehört nicht zum Vorhaben`);
  }
  // Und zwar konkret: U und K liegen beim Vorhaben.
  assert.equal(findItem("U01")?.scope, "venture_alignment");
  assert.equal(findItem("K01")?.scope, "venture_alignment");
});

test("jeder Bogen sagt, wofür seine Antworten gelten", () => {
  // Ohne diesen Satz waere die Teilung eine Ordnerstruktur und keine Aussage.
  assert.match(FOUNDER_PROFILE.validity, /portabel|Person/i);
  assert.match(VENTURE_ALIGNMENT.validity, /Vorhaben|Zeitraum/i);
  assert.notEqual(FOUNDER_PROFILE.validity, VENTURE_ALIGNMENT.validity);
});

test("die beiden Fassungen tragen eigene Kennungen und können getrennt wachsen", () => {
  // Der Grund fuer die Teilung: Bisher hiess jede Aenderung an einem Teil eine
  // neue Gesamtfassung - v2, v2.1, v2.2 in drei Tagen.
  assert.notEqual(FOUNDER_PROFILE.instrumentId, VENTURE_ALIGNMENT.instrumentId);
  for (const scope of SCOPES) {
    assert.equal(REGISTRIES[scope].scope, scope);
    assert.equal(REGISTRIES[scope].status, "draft");
  }
});

test("eine Frage lässt sich finden, ohne ihren Bogen zu kennen - mit Bogen als Antwort", () => {
  // Wer nur das Item bekaeme, muesste danach raten, wo die Antwort hingehoert -
  // und genau diese Unklarheit soll die Teilung beseitigen.
  const gefunden = findItem("R01");
  assert.equal(gefunden?.scope, "venture_alignment");
  assert.equal(gefunden?.item.itemId, "R01");
  assert.equal(findItem("Z99"), null);
});
