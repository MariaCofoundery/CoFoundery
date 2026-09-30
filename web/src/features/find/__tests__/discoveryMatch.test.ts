import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  DISCOVERY_THEMES,
  THEME_IDS,
  assertThemes,
  stepOf,
  stepsOf,
} from "@/features/find/discoveryThemes";
import {
  MIN_COVERAGE,
  NOTICEABLE_DISTANCE,
  STRONG_FIT,
  countVerdicts,
  directedMatch,
  fitComplementary,
  fitSimilar,
  itemDistance,
  mutualMatch,
  normalizePreference,
  themeFit,
  type Answers,
  type ThemePreference,
} from "@/features/find/discoveryMatch";
import { offeredItemsV22 } from "@/features/instruments/align/registries";

const theme = (themeId: string) => DISCOVERY_THEMES.find((entry) => entry.themeId === themeId)!;
const antwort = (itemId: string, stufe: number) => ({ [itemId]: { optionId: `${itemId}_o${stufe}` } });
const praeferenz = (
  themeId: string,
  direction: ThemePreference["direction"],
  importance: ThemePreference["importance"],
): ThemePreference => ({ themeId, direction, importance });

// ---------------------------------------------------------------------------
// Die Themen
// ---------------------------------------------------------------------------

test("sechs Themen, und jede Frage des Bogens steht in genau einem", () => {
  assert.equal(THEME_IDS.length, 6);
  assertThemes();

  const zugeordnet = DISCOVERY_THEMES.flatMap((entry) => entry.items.map((item) => item.itemId));
  assert.equal(new Set(zugeordnet).size, zugeordnet.length, "eine Frage steht zweimal");
  assert.deepEqual(
    [...zugeordnet].sort(),
    offeredItemsV22("founder_profile").map((item) => item.itemId).sort(),
  );
});

test("die Kopie in der Datenbank stimmt mit der Zuordnung im Code überein", () => {
  // ---------------------------------------------------------------------------
  // WARUM ES EINE KOPIE GIBT
  // ---------------------------------------------------------------------------
  //
  // `discovery_theme_distances` darf die Gruppierung nicht vom Aufrufer
  // entgegennehmen: Wer sie bestimmen kann, fragt je Frage ein eigenes „Thema"
  // ab und bekommt damit doch die einzelnen Abstände - und daraus die
  // Antworten der anderen Person. Also steht sie in einer Tabelle.
  //
  // Eine Kopie veraltet. Dieser Test ist der Grund, warum sie es nicht tut.
  const sql = readFileSync(
    join("..", "supabase", "migrations", "20261086120000_discovery_theme_distances.sql"),
    "utf8",
  );
  const start = sql.indexOf("insert into public.discovery_theme_items");
  assert.ok(start > 0, "die Zuordnung steht nicht in der Migration");
  const block = sql.slice(start, sql.indexOf("on conflict", start));

  const inDatenbank = new Map<string, { themeId: string; steps: number; outside: string[] }>();
  for (const match of block.matchAll(
    /\('founder-profile-v1','([A-Z][0-9]{2})','([a-z_]+)',([0-9]+),'\{([^}]*)\}'\)/g,
  )) {
    inDatenbank.set(match[1], {
      themeId: match[2],
      steps: Number(match[3]),
      outside: match[4] ? match[4].split(",") : [],
    });
  }

  const imCode = new Map<string, { themeId: string; steps: number; outside: string[] }>();
  for (const entry of DISCOVERY_THEMES) {
    for (const item of entry.items) {
      // Nur die Fragen, aus denen eine Zahl wird - D01 und T02 stehen nicht in
      // der Tabelle, weil sie keinen Abstand erzeugen.
      if (!item.numeric) continue;
      imCode.set(item.itemId, {
        themeId: entry.themeId,
        steps: stepsOf(item),
        outside: [...item.outsideSequence],
      });
    }
  }

  assert.deepEqual([...inDatenbank.keys()].sort(), [...imCode.keys()].sort());
  for (const [itemId, erwartet] of imCode) {
    assert.deepEqual(inDatenbank.get(itemId), erwartet, itemId);
  }
});

test("D01 und T02 gehören zum Thema, erzeugen aber keine Zahl", () => {
  // Die Spec, Abschnitt 8: D01 ist nominal und bekommt keine künstliche
  // Distanz; T02 ist vom numerischen Match ausgenommen, darf aber qualitativ
  // im Matchdetail auftauchen.
  const numerisch = (itemId: string) =>
    DISCOVERY_THEMES.flatMap((entry) => entry.items).find((item) => item.itemId === itemId)!.numeric;
  assert.equal(numerisch("D01"), false);
  assert.equal(numerisch("T02"), false);
  assert.equal(numerisch("D02"), true);
  assert.equal(numerisch("T01"), true);
});

test("T01 hat vier Stufen und nicht fünf", () => {
  // „situationsabhängig" ist keine fünfte Stufe hinter „nach mehr als einem
  // Arbeitstag", sondern eine Antwort neben der Reihe. Mit fünf Stufen wäre
  // jeder Abstand um ein Viertel zu klein gerechnet.
  const t01 = theme("raising_objections").items.find((item) => item.itemId === "T01")!;
  assert.equal(stepsOf(t01), 4);
  assert.equal(stepOf(t01, { optionId: "T01_o4" }), 4);
  assert.equal(stepOf(t01, { optionId: "T01_o5" }), null, "situationsabhängig ist keine Stufe");

  const a01 = theme("decision_weighing").items[0];
  assert.equal(stepsOf(a01), 5);
});

test("ein Auslassungsgrund ist keine Mitte", () => {
  // Die Spec, Abschnitt 9: „Missing Reasons gehen nicht numerisch ein."
  const a01 = theme("decision_weighing").items[0];
  assert.equal(stepOf(a01, { missingCode: "cannot_assess" }), null);
  assert.equal(stepOf(a01, { missingCode: "prefer_not_to_say", optionId: "A01_o3" }), null);
  assert.equal(stepOf(a01, undefined), null);
  assert.equal(stepOf(a01, { optionId: null }), null);
});

// ---------------------------------------------------------------------------
// Abstand und Passung
// ---------------------------------------------------------------------------

test("der Abstand ist auf 0 bis 1 normiert", () => {
  assert.equal(itemDistance(3, 3, 5), 0);
  assert.equal(itemDistance(1, 5, 5), 1);
  assert.equal(itemDistance(1, 2, 5), 0.25);

  // Zwei Stufen auf einer Vierer-Skala sind weiter auseinander als zwei auf
  // einer Fünfer-Skala - sonst wären Skalen verschiedener Länge nicht
  // vergleichbar.
  assert.ok(itemDistance(1, 3, 4) > itemDistance(1, 3, 5));
  assert.throws(() => itemDistance(1, 1, 1), /scale_too_short/);
});

test("Ähnlichkeit: je näher, desto besser", () => {
  assert.equal(fitSimilar(0), 1);
  assert.equal(fitSimilar(0.25), 0.75);
  assert.equal(fitSimilar(1), 0);
});

test("Ergänzung belohnt moderate und nicht maximale Distanz", () => {
  // Die Beispieltabelle aus Abschnitt 9, Zahl für Zahl.
  assert.equal(fitComplementary(0), 0);
  assert.equal(fitComplementary(0.25), 0.5);
  assert.equal(fitComplementary(0.5), 1);
  assert.equal(fitComplementary(0.75), 0.5);
  assert.equal(fitComplementary(1), 0);

  // „Unterschiedlich bedeutet nicht automatisch möglichst gegensätzlich."
  assert.ok(fitComplementary(0.5) > fitComplementary(1));
});

// ---------------------------------------------------------------------------
// Passung je Thema
// ---------------------------------------------------------------------------

test("gleiche Antworten bei gewünschter Ähnlichkeit sind ein starker Matchpunkt", () => {
  const beide: Answers = { ...antwort("A01", 4), ...antwort("A02", 2) };
  const result = themeFit(
    theme("decision_weighing"),
    praeferenz("decision_weighing", "similar", 3),
    beide,
    beide,
  );
  assert.equal(result.fit, 1);
  assert.equal(result.distance, 0);
  assert.equal(result.verdict, "strong_match");
  assert.equal(result.comparable, 2);
  assert.equal(result.of, 2);
});

test("zwei Stufen Unterschied sind die gesuchte Ergänzung", () => {
  const a: Answers = { ...antwort("E01", 1), ...antwort("E02", 1), ...antwort("E03", 1) };
  const b: Answers = { ...antwort("E01", 3), ...antwort("E02", 3), ...antwort("E03", 3) };
  const result = themeFit(
    theme("experimentation"),
    praeferenz("experimentation", "complementary", 2),
    a,
    b,
  );
  assert.equal(result.distance, 0.5);
  assert.equal(result.fit, 1);
  assert.equal(result.verdict, "interesting_complement");
});

test("das Gegenteil ist keine Ergänzung", () => {
  const a: Answers = { ...antwort("E01", 1), ...antwort("E02", 1), ...antwort("E03", 1) };
  const b: Answers = { ...antwort("E01", 5), ...antwort("E02", 5), ...antwort("E03", 5) };
  const result = themeFit(
    theme("experimentation"),
    praeferenz("experimentation", "complementary", 2),
    a,
    b,
  );
  assert.equal(result.distance, 1);
  assert.equal(result.fit, 0);
  assert.equal(result.verdict, "worth_a_look");
});

test("ein nicht erfüllter Ähnlichkeitswunsch ist kein Fehler, sondern ein Blick wert", () => {
  const a: Answers = { ...antwort("A01", 1), ...antwort("A02", 1) };
  const b: Answers = { ...antwort("A01", 5), ...antwort("A02", 5) };
  const result = themeFit(
    theme("decision_weighing"),
    praeferenz("decision_weighing", "similar", 3),
    a,
    b,
  );
  assert.equal(result.verdict, "worth_a_look");
});

test("ohne Wunsch gibt es keinen Treffer und keinen Fehltreffer", () => {
  const a: Answers = { ...antwort("A01", 1), ...antwort("A02", 1) };
  const b: Answers = { ...antwort("A01", 5), ...antwort("A02", 5) };
  const unterschied = themeFit(
    theme("decision_weighing"),
    praeferenz("decision_weighing", "neutral", 0),
    a,
    b,
  );
  assert.equal(unterschied.verdict, "difference_without_weight");
  assert.equal(unterschied.fit, null, "ohne Wunsch gibt es keine Passung");
  assert.ok(unterschied.distance !== null, "der Abstand steht trotzdem da");

  const gleich = themeFit(
    theme("decision_weighing"),
    praeferenz("decision_weighing", "neutral", 0),
    a,
    a,
  );
  assert.equal(gleich.verdict, "unremarkable");
});

test("zu wenig gemeinsame Grundlage ist nicht dasselbe wie keine Passung", () => {
  // Ein Thema aus vier Fragen, von denen eine vergleichbar ist.
  const a: Answers = {
    ...antwort("X01", 3),
    X02: { missingCode: "cannot_assess" },
    X03: { missingCode: "cannot_assess" },
    X04: { missingCode: "cannot_assess" },
  };
  const b: Answers = { ...antwort("X01", 3), ...antwort("X02", 3), ...antwort("X03", 3) };
  const result = themeFit(
    theme("open_questions"),
    praeferenz("open_questions", "similar", 3),
    a,
    b,
  );
  assert.equal(result.comparable, 1);
  assert.equal(result.of, 4);
  assert.ok(result.comparable / result.of < MIN_COVERAGE);
  assert.equal(result.verdict, "insufficient_data");
  assert.equal(result.fit, null, "eine 0 wäre die Aussage „passt nicht“");
  assert.equal(result.distance, null);
});

test("genau die Hälfte reicht", () => {
  const a: Answers = { ...antwort("X01", 3), ...antwort("X02", 3) };
  const b: Answers = { ...antwort("X01", 3), ...antwort("X02", 4) };
  const result = themeFit(
    theme("open_questions"),
    praeferenz("open_questions", "similar", 1),
    a,
    b,
  );
  assert.equal(result.comparable, 2);
  assert.equal(result.of, 4);
  assert.notEqual(result.verdict, "insufficient_data");
});

test("„situationsabhängig“ nimmt das Paar aus der Rechnung", () => {
  const a: Answers = { T01: { optionId: "T01_o5" } };
  const b: Answers = { T01: { optionId: "T01_o1" } };
  const result = themeFit(
    theme("raising_objections"),
    praeferenz("raising_objections", "similar", 2),
    a,
    b,
  );
  assert.equal(result.comparable, 0);
  assert.equal(result.verdict, "insufficient_data");
});

// ---------------------------------------------------------------------------
// Über alle Themen
// ---------------------------------------------------------------------------

const VOLLSTAENDIG = (stufe: number): Answers =>
  Object.fromEntries(
    offeredItemsV22("founder_profile").map((item) => [
      item.itemId,
      { optionId: `${item.itemId}_o${stufe}` },
    ]),
  );

test("der Rankingwert gewichtet nach Wichtigkeit", () => {
  const gleich = VOLLSTAENDIG(3);
  const match = directedMatch(
    [praeferenz("decision_weighing", "similar", 3), praeferenz("open_questions", "similar", 1)],
    gleich,
    gleich,
  );
  assert.equal(match.rankingScore, 1);
  assert.equal(match.weightedThemes, 2);

  // Ein Thema trifft, das andere nicht - und das wichtigere zieht.
  const anders: Answers = { ...gleich, ...antwort("A01", 1), ...antwort("A02", 1) };
  const gemischt = directedMatch(
    [praeferenz("decision_weighing", "similar", 3), praeferenz("open_questions", "similar", 1)],
    gleich,
    anders,
  );
  // decision_weighing: Abstand 0.5 -> fit 0.5, Gewicht 3.
  // open_questions:    Abstand 0   -> fit 1,   Gewicht 1.
  assert.equal(gemischt.rankingScore, (0.5 * 3 + 1 * 1) / 4);
});

test("wer nichts als wichtig markiert hat, bekommt keinen Rankingwert", () => {
  const gleich = VOLLSTAENDIG(3);
  const match = directedMatch([], gleich, gleich);
  assert.equal(match.rankingScore, null);
  assert.equal(match.weightedThemes, 0);
  // Und trotzdem sechs Themen mit Befund - die Suche funktioniert, nur ohne
  // Aussage über Arbeitsweisen.
  assert.equal(match.themes.length, 6);
  for (const entry of match.themes) assert.equal(entry.importance, 0);
});

test("Themen ohne Grundlage gehen nicht in den Rankingwert ein", () => {
  const a = VOLLSTAENDIG(3);
  const b: Answers = { ...VOLLSTAENDIG(3), X01: {}, X02: {}, X03: {}, X04: {} };
  const match = directedMatch(
    [praeferenz("decision_weighing", "similar", 2), praeferenz("open_questions", "similar", 3)],
    a,
    b,
  );
  assert.equal(match.weightedThemes, 1);
  assert.equal(match.rankingScore, 1, "das Thema ohne Grundlage zieht nicht nach unten");
});

test("die Zählung ersetzt die Prozentzahl", () => {
  const gleich = VOLLSTAENDIG(3);
  const counts = countVerdicts(
    directedMatch([praeferenz("decision_weighing", "similar", 3)], gleich, gleich),
  );
  assert.equal(counts.strong_match, 1);
  assert.equal(counts.unremarkable, 5);
  assert.equal(
    Object.values(counts).reduce((sum, value) => sum + value, 0),
    6,
  );
});

// ---------------------------------------------------------------------------
// Zwei Menschen, zwei Suchen
// ---------------------------------------------------------------------------

test("A nach B und B nach A werden getrennt gerechnet", () => {
  const a = VOLLSTAENDIG(1);
  const b = VOLLSTAENDIG(3);

  // A sucht Ähnlichkeit, B sucht Ergänzung - derselbe Abstand, zwei Urteile.
  const match = mutualMatch(
    [praeferenz("decision_weighing", "similar", 3)],
    a,
    [praeferenz("decision_weighing", "complementary", 3)],
    b,
  );
  const hin = match.outgoing.themes.find((entry) => entry.themeId === "decision_weighing")!;
  const zurueck = match.incoming!.themes.find((entry) => entry.themeId === "decision_weighing")!;

  assert.equal(hin.distance, zurueck.distance, "der Abstand ist derselbe");
  assert.equal(hin.verdict, "worth_a_look");
  assert.equal(zurueck.verdict, "interesting_complement");
});

test("wer nichts festgelegt hat, bekommt kein erfundenes Neutral", () => {
  const match = mutualMatch(
    [praeferenz("decision_weighing", "similar", 2)],
    VOLLSTAENDIG(3),
    null,
    VOLLSTAENDIG(3),
  );
  assert.equal(match.incoming, null);
  assert.deepEqual(match.mutualStrongPoints, []);
});

test("gegenseitig stark heißt: für jede Seite erfüllt, nicht dasselbe gewünscht", () => {
  const a = VOLLSTAENDIG(1);
  const b = VOLLSTAENDIG(3);

  // A sucht Ergänzung und findet sie; B sucht ebenfalls Ergänzung.
  const beide = mutualMatch(
    [praeferenz("experimentation", "complementary", 2)],
    a,
    [praeferenz("experimentation", "complementary", 1)],
    b,
  );
  assert.deepEqual(beide.mutualStrongPoints, ["experimentation"]);

  // Sucht eine Seite Ähnlichkeit, ist es für sie nicht erfüllt - und damit
  // für beide zusammen nicht.
  const einseitig = mutualMatch(
    [praeferenz("experimentation", "complementary", 2)],
    a,
    [praeferenz("experimentation", "similar", 1)],
    b,
  );
  assert.deepEqual(einseitig.mutualStrongPoints, []);
});

// ---------------------------------------------------------------------------
// Widerspruchsfreiheit
// ---------------------------------------------------------------------------

test("neutral und Gewicht schließen sich aus", () => {
  assert.deepEqual(normalizePreference(praeferenz("x", "neutral", 3)), praeferenz("x", "neutral", 0));
  assert.deepEqual(normalizePreference(praeferenz("x", "similar", 0)), praeferenz("x", "neutral", 0));
  assert.deepEqual(normalizePreference(praeferenz("x", "similar", 2)), praeferenz("x", "similar", 2));
});

test("die beiden Grenzen stehen an einer Stelle und sind benannt", () => {
  // Sie stehen nicht in der Spec. Wer sie ändert, ändert Produktverhalten -
  // und soll es an einer Stelle tun.
  assert.equal(STRONG_FIT, 0.75);
  assert.equal(NOTICEABLE_DISTANCE, 0.25);

  // Auf einer Fünfer-Skala heißt STRONG_FIT bei Ähnlichkeit: höchstens eine
  // Stufe daneben. Bei Ergänzung: genau zwei Stufen.
  assert.ok(fitSimilar(itemDistance(3, 4, 5)) >= STRONG_FIT);
  assert.ok(fitSimilar(itemDistance(3, 5, 5)) < STRONG_FIT);
  assert.ok(fitComplementary(itemDistance(1, 3, 5)) >= STRONG_FIT);
  assert.ok(fitComplementary(itemDistance(1, 2, 5)) < STRONG_FIT);
});
