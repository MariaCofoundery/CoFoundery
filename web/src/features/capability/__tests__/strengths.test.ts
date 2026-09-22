import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  REFLECTED_GROUPS,
  STRENGTH_FREQUENCIES,
  strengthGap,
} from "@/features/capability/strengthData";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const VIEW = "src/features/capability/StrengthsSection.tsx";
const ACTIONS = "src/features/capability/strengthActions.ts";
const MODEL = "src/features/capability/narrativeAnalysisModel.ts";
const WORKER = "scripts/ai-worker.ts";
const MIGRATION = "../supabase/migrations/20261039120000_person_strengths.sql";
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

const strength = (self: string | null, reflected: string | null) => ({
  id: "x",
  statement: "Bleibt dran",
  origin: "own_words" as const,
  selfFrequency: self as never,
  reflectedFrequency: reflected as never,
  reflectedWho: reflected ? ("former_colleagues" as const) : null,
});

// ---------------------------------------------------------------------------
// Stärken, mit zwei Blickrichtungen
// ---------------------------------------------------------------------------
//
// GEWÜNSCHT AM 22.09.2026: "Dass die Einzelperson ein bisschen was über sich
// erfährt und das auch noch mal ein bisschen selbst einschätzen soll.
// Vielleicht auch noch mal mit so einem Perspektivwechsel: was glaubst du,
// was deine alten Kolleginnen oder Chefs, Freunde, Verwandte sagen würden."

test("gefragt wird nach der Häufigkeit, nicht nach der Ausprägung", () => {
  // "Wie stark ist deine Ausdauer" ist eine Eigenschaftsfrage - sie misst
  // Selbstbild. "Wie oft zeigt sich das" fragt nach etwas, das man beobachten
  // kann. Dieselbe Entscheidung wie beim Fragenkatalog des Interviews.
  assert.deepEqual([...STRENGTH_FREQUENCIES], ["rarely", "sometimes", "often", "almost_always"]);
  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(source(`messages/${locale}/capability.json`)) as {
        strengths: { selfLabel: string; reflectedLabel: string; whoLabel: string };
      }
    ).strengths;
    assert.match(copy.selfLabel, /oft|often/i, `${locale}: es wird nicht nach Häufigkeit gefragt`);
    assert.doesNotMatch(copy.selfLabel, /stark|strong/i, `${locale}: es wird nach Ausprägung gefragt`);
    assert.ok(copy.reflectedLabel && copy.whoLabel, `${locale}: der Perspektivwechsel fehlt`);
  }
});

test("eine Außensicht ohne Angabe, wessen, gibt es nicht", () => {
  // "Was würden meine Geschwister sagen" und "was würde mein letzter Chef
  // sagen" sind zwei verschiedene Fragen. Ohne die Gruppe wäre die Antwort
  // eine Behauptung über alle, die einen kennen. Die Datenbank erzwingt das
  // Paar; der Code nimmt es deshalb nicht einzeln an.
  assert.match(
    sqlCodeOnly(MIGRATION),
    /\(reflected_frequency is null\) = \(reflected_who is null\)/
  );
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /whoValue \? reflectedValue : null/);
  assert.match(actions, /reflectedValue \? whoValue : null/);
  assert.ok(REFLECTED_GROUPS.length >= 4, "zu wenige Gruppen für einen Perspektivwechsel");
});

test("der Unterschied wird benannt, nicht gedeutet", () => {
  // "Hier siehst du dich anders, als du andere vermutest" - nicht "du
  // unterschätzt dich". Die Gründe kennt diese Software nicht.
  assert.equal(strengthGap(strength("sometimes", "often")), "others_see_more");
  assert.equal(strengthGap(strength("often", "sometimes")), "others_see_less");
  assert.equal(strengthGap(strength("often", "often")), null);
  // Ohne beide Antworten gibt es keinen Hinweis - ein Abstand zu einer
  // fehlenden Angabe ist keiner.
  assert.equal(strengthGap(strength("often", null)), null);
  assert.equal(strengthGap(strength(null, "often")), null);

  for (const locale of ["de", "en"]) {
    const gap = (
      JSON.parse(source(`messages/${locale}/capability.json`)) as {
        strengths: { gap: Record<string, string> };
      }
    ).strengths.gap;
    assert.ok(gap.others_see_more && gap.others_see_less, `${locale}: die Hinweise fehlen`);
    assert.doesNotMatch(
      gap.others_see_more,
      /untersch(ä|ae)tzt|underestimate/i,
      `${locale}: der Hinweis deutet statt zu benennen`
    );
  }
});

test("keine Zahl, kein Mittelwert", () => {
  // "Stärke 7,4" wäre Scheinpräzision auf einem Selbstbericht. Es gibt keine
  // Spalte dafür, und es wird nichts verrechnet.
  const all = [codeOnly(VIEW), codeOnly(ACTIONS), codeOnly("src/features/capability/strengthData.ts")].join("\n");
  assert.doesNotMatch(all, /\bscore\b|punktzahl|average|mittelwert|percent/i);
  assert.doesNotMatch(sqlCodeOnly(MIGRATION), /numeric|integer|smallint|real\b/);
});

test("die Stärke des Modells braucht jetzt einen Beleg", () => {
  // SIE WURDE BIS ZUM 22.09.2026 WEGGEWORFEN: Das Modell wurde danach gefragt
  // ("ein kurzer Satz über eine Arbeitsweise, die im Text sichtbar wird"), der
  // Code las das Feld aus - und es endete dort, weil es keinen Ort dafür gab.
  // Deshalb fiel auch nicht auf, dass nichts den Satz stützte.
  const model = codeOnly(MODEL);
  assert.match(model, /isQuoteFromText\(strengthQuote, input\.narrative\)/);
  assert.match(model, /ABOUT_THE_PERSON\.some\(\(pattern\) => pattern\.test\(statement\)\)/);
  // Und der Arbeiter legt sie als Vorschlag ab, nicht als Tatsache.
  assert.match(codeOnly(WORKER), /insert_ai_strength_proposal/);
  assert.match(sqlCodeOnly(MIGRATION), /position\(v_normalized_quote in v_normalized_source\) = 0/);
});

test("ein Satz über die Arbeitsweise, nicht über die Person", () => {
  // Das ist die Grenze, die diesen Bereich von einem Persönlichkeitstest
  // trennt - und sie steht in der Anweisung an das Modell UND im Hinweis an
  // den Menschen, der selbst etwas aufschreibt.
  assert.match(source(MODEL), /Schreibe dort NICHT über die Person selbst/);
  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(source(`messages/${locale}/capability.json`)) as {
        strengths: { addHint: string };
      }
    ).strengths;
    assert.match(copy.addHint, /ARBEITSWEISE|WAY you work/i, `${locale}`);
  }
});

test("bestätigt wird von Hand, und die Herkunft bleibt sichtbar", () => {
  const migration = sqlCodeOnly(MIGRATION);
  // Kein Schreibrecht auf die Vorschläge: Sie entstehen nur über die
  // Arbeiterfunktion mit Zitatprüfung.
  assert.doesNotMatch(migration, /grant insert[^;]*person_strength_proposals/i);
  assert.match(migration, /grant update \(status, decided_at\) on public\.person_strength_proposals/);
  // Und die Herkunft entsteht in der Datenbank aus dem Vergleich, nicht aus
  // einer Behauptung des Aufrufers.
  assert.match(migration, /then 'confirmed_proposal' else 'edited_proposal' end/);
});
