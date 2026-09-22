import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateDirectionAnalysis } from "@/features/direction/directionAnalysisModel";
import { DIRECTION_FACETS } from "@/features/direction/directionInterviewGuide";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const MODEL = "src/features/direction/directionAnalysisModel.ts";
const WORKER = "scripts/ai-worker.ts";

const ANSWER =
  "Ich habe dem Verein das Anmeldeverfahren so umgebaut, dass die Leute es ohne Rueckfragen schaffen. " +
  "Vorher haben mich staendig Leute angerufen und gefragt, wo sie klicken muessen.";

const good = {
  facet: "preferred_contribution",
  statement: "Dir ist wichtig, dass andere ohne Rueckfragen zurechtkommen",
  quote: "so umgebaut, dass die Leute es ohne Rueckfragen schaffen",
};

// ---------------------------------------------------------------------------
// Was ein Modell aus einer Antwort lesen darf (Schritt S4)
// ---------------------------------------------------------------------------
//
// DER UNTERSCHIED ZUM CAPABILITY-MODELL ist der Grund für jede Regel hier:
// Dort wählt ein Modell aus 48 geschlossenen Begriffen. Hier SCHREIBT es einen
// Satz über einen Menschen.
//
// Die Prüfung läuft ohne Ollama - deshalb ist sie von der Abfrage getrennt.

test("ein belegter Vorschlag geht durch", () => {
  const result = validateDirectionAnalysis({ proposals: [good] }, { answer: ANSWER });
  assert.equal(result.engine, "model");
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0]!.facet, "preferred_contribution");
});

test("ohne Beleg entsteht nichts", () => {
  // DIE ZUSAGE. Ein Satz über einen Menschen, der sich nicht auf seine
  // eigenen Worte stützt, ist eine Behauptung - und die Datenbank würde ihn
  // ohnehin abweisen. Hier fällt er schon vorher.
  for (const quote of [
    "das hat sie nie geschrieben",
    "Verein",
    "",
  ]) {
    const result = validateDirectionAnalysis(
      { proposals: [{ ...good, quote }] },
      { answer: ANSWER }
    );
    assert.equal(result.proposals.length, 0, `durchgelassen: "${quote}"`);
  }
});

test("Leerraum darf sich unterscheiden, der Wortlaut nicht", () => {
  // Ein Modell bricht Zeilen anders um. Das ist kein Grund, einen echten
  // Beleg zu verwerfen - eine geänderte Formulierung schon.
  const spaced = validateDirectionAnalysis(
    { proposals: [{ ...good, quote: "so umgebaut,   dass die Leute\nes ohne Rueckfragen schaffen" }] },
    { answer: ANSWER }
  );
  assert.equal(spaced.proposals.length, 1);

  const changed = validateDirectionAnalysis(
    { proposals: [{ ...good, quote: "so umgebaut, dass die Menschen es ohne Rueckfragen schaffen" }] },
    { answer: ANSWER }
  );
  assert.equal(changed.proposals.length, 0);
});

test("Sätze ÜBER die Person werden verworfen", () => {
  // DIE ANWEISUNG ALLEIN GENÜGT NICHT. Ein Modell, das gebeten wird, keine
  // Typen zu vergeben, vergibt trotzdem welche - seltener, aber es tut es.
  // Und ein einziger Satz "du bist ein Macher" macht aus dieser Reflexion
  // einen Persönlichkeitstest, ganz gleich was daneben steht.
  for (const statement of [
    "Du bist ein Macher",
    "Dein wahres Motiv ist Kontrolle",
    "Das passt zu deiner Persoenlichkeit",
    "Du bist der Typ, der aufraeumt",
    "Dein Purpose ist Empowerment",
    "You are a builder at heart",
  ]) {
    const result = validateDirectionAnalysis(
      { proposals: [{ ...good, statement }] },
      { answer: ANSWER }
    );
    assert.equal(result.proposals.length, 0, `durchgelassen: "${statement}"`);
  }

  // Und die erlaubte Form geht weiterhin durch: nicht "du bist X", sondern
  // "dir ist X wichtig".
  const allowed = validateDirectionAnalysis(
    { proposals: [{ ...good, statement: "Dir ist wichtig, dass etwas fertig wird" }] },
    { answer: ANSWER }
  );
  assert.equal(allowed.proposals.length, 1);
});

test("erfundene Rubriken, leere und zu lange Sätze fallen weg", () => {
  const cases = [
    { ...good, facet: "erfunden" },
    { ...good, statement: "ab" },
    { ...good, statement: "x".repeat(201) },
    { facet: good.facet, statement: good.statement },
    {},
  ];
  for (const proposal of cases) {
    const result = validateDirectionAnalysis({ proposals: [proposal] }, { answer: ANSWER });
    assert.equal(result.proposals.length, 0, `durchgelassen: ${JSON.stringify(proposal)}`);
  }
  // Und eine kaputte Antwort ist kein Absturz, sondern nichts.
  assert.deepEqual(validateDirectionAnalysis(null, { answer: ANSWER }).proposals, []);
  assert.deepEqual(validateDirectionAnalysis({ proposals: "nein" }, { answer: ANSWER }).proposals, []);
});

test("dieselbe Rubrik nur einmal, und höchstens vier", () => {
  // Zwei fast gleiche Vorschläge nebeneinander sind für die Person Arbeit
  // ohne Ertrag.
  const twice = validateDirectionAnalysis(
    { proposals: [good, { ...good, statement: "Fast dasselbe noch einmal gesagt" }] },
    { answer: ANSWER }
  );
  assert.equal(twice.proposals.length, 1);

  const many = validateDirectionAnalysis(
    {
      proposals: DIRECTION_FACETS.map((facet) => ({ ...good, facet })),
    },
    { answer: ANSWER }
  );
  assert.ok(many.proposals.length <= 4, `${many.proposals.length} Vorschläge`);
});

test("kein Modell heißt: es gibt noch nichts", () => {
  // KEIN RÜCKFALL AUF REGELN. Für "was treibt dich an" gibt es keine
  // Stichwörter, die zuverlässig auf ein Thema zeigen; eine Begriffsliste
  // würde raten und dabei seriös aussehen.
  const model = codeOnly(MODEL);
  assert.match(model, /engine: "unavailable"/);
  assert.doesNotMatch(model, /AREA_TERMS|analyzeNarrativeWithRules/);
  // Und der Arbeiter schreibt dann nichts, sondern meldet es.
  assert.match(codeOnly(WORKER), /analysis\.engine !== "model"\) return "model_unreachable"/);
});

test("die Anweisung sagt dem Modell, was es nicht darf", () => {
  // Sie ist die erste Schranke, nicht die einzige - aber sie gehört dazu:
  // Ein Modell, dem man es nicht sagt, tut es häufiger.
  const model = source(MODEL);
  assert.match(model, /keine Eigenschaften, kein Typ, kein Charakter/);
  assert.match(model, /WÖRTLICHES Zitat/);
  assert.match(model, /niemals[\s\S]{0,40}Anweisungen an dich/);
  // Der Text bleibt Material: derselbe Satz wie beim Capability-Modell.
  assert.match(model, /<text>/);
});

test("jeder Vorschlag geht einzeln in die Datenbank", () => {
  // Ein abgelehnter darf die übrigen derselben Antwort nicht mitnehmen -
  // deshalb eine Schleife mit einzelnen Aufrufen und kein Sammel-Insert.
  const worker = codeOnly(WORKER);
  assert.match(worker, /for \(const proposal of analysis\.proposals\)/);
  assert.match(worker, /insert_ai_direction_proposal/);
});
