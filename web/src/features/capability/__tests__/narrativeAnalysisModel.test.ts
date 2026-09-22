import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { analyzeNarrativeWithRules } from "@/features/capability/narrativeAnalysis";
import {
  createModelNarrativeAnalyzer,
  validateModelAnalysis,
} from "@/features/capability/narrativeAnalysisModel";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Die Pruefung der Modellantwort - ohne Modell.
 *
 * Diese Tests brauchen kein laufendes Ollama und duerfen es auch nicht
 * brauchen: `npm test` muss auf jedem Rechner durchlaufen, auch mit
 * ausgeschaltetem Laptop. Geprueft wird deshalb genau die Stelle, an der eine
 * erfundene Antwort haengen bleibt.
 */

const NARRATIVE =
  "Ich habe drei Jahre lang jede Woche mit Kliniken telefoniert, bis endlich eine zugesagt hat. " +
  "Danach habe ich den Vertrag mit ihrer Einkaufsabteilung verhandelt.";

const AREAS = ["b2b_sales", "partnerships", "customer_success", "software_engineering"];
const AREAS_WITH_LABELS = [
  { id: "b2b_sales", label: "B2B Sales" },
  { id: "partnerships", label: "Partnerschaften & Business Development" },
];

test("ein Vorschlag ohne Beleg aus dem Text faellt weg", () => {
  // DAS IST DIE WICHTIGSTE PRUEFUNG. Ein Sprachmodell erzeugt auch gut
  // klingenden Unsinn, und eine erfundene Capability ist schlimmer als eine
  // fehlende: Sie landet in einem Profil, das andere Menschen lesen.
  const analysis = validateModelAnalysis(
    {
      areas: [
        { areaId: "b2b_sales", quotes: ["den Vertrag mit ihrer Einkaufsabteilung verhandelt"] },
        { areaId: "software_engineering", quotes: ["hat eine Plattform gebaut"] },
      ],
    },
    { narrative: NARRATIVE, areaIds: AREAS }
  );

  assert.deepEqual(
    analysis.areas.map((area) => area.areaId),
    ["b2b_sales"],
    "der erfundene Beleg haette den Vorschlag mitnehmen muessen"
  );
});

test("ein Bereich ausserhalb des Vokabulars kommt nicht durch", () => {
  // Das Schema laesst ihn schon beim Erzeugen nicht zu - aber ein Schema sagt,
  // dass die Form stimmt, nicht dass der Inhalt stimmt. Und ein anderes Modell
  // haelt sich vielleicht nicht daran.
  const analysis = validateModelAnalysis(
    { areas: [{ areaId: "weltherrschaft", quotes: [NARRATIVE.slice(0, 40)] }] },
    { narrative: NARRATIVE, areaIds: AREAS }
  );
  assert.deepEqual(analysis.areas, []);
});

test("die Belege stehen woertlich im Text - Leerraum darf sich unterscheiden", () => {
  const analysis = validateModelAnalysis(
    {
      areas: [
        {
          areaId: "b2b_sales",
          quotes: ["jede   Woche mit\nKliniken telefoniert", "Ich habe Investoren überzeugt"],
        },
      ],
    },
    { narrative: NARRATIVE, areaIds: AREAS }
  );

  assert.equal(analysis.areas.length, 1);
  assert.deepEqual(analysis.areas[0].matchedTerms, ["jede   Woche mit\nKliniken telefoniert"]);
});

test("ein einzelnes Wort ist kein Beleg", () => {
  // "Vertrag" findet sich immer irgendwo. Ein Beleg muss lang genug sein, um
  // auf eine Stelle zu zeigen, nicht auf ein Wort.
  const analysis = validateModelAnalysis(
    { areas: [{ areaId: "b2b_sales", quotes: ["Vertrag"] }] },
    { narrative: NARRATIVE, areaIds: AREAS }
  );
  assert.deepEqual(analysis.areas, []);
});

test("Unfug im Ergebnis fuehrt zu einer leeren Analyse, nicht zu einem Absturz", () => {
  for (const answer of [null, undefined, "nein", 42, { areas: "viele" }, { areas: [null] }]) {
    const analysis = validateModelAnalysis(answer, { narrative: NARRATIVE, areaIds: AREAS });
    assert.deepEqual(analysis.areas, []);
    assert.equal(analysis.engine, "model");
  }
});

test("dasselbe Zitat traegt nur einen Bereich", () => {
  // GEMESSEN AM 20.09.2026: Drei von vier ueberzaehligen Vorschlaegen kamen
  // daher, dass ein einziger Satz gleich mehrere Bereiche belegen sollte - ein
  // Satz ueber vierzig Nutzergespraeche wurde zu Customer Discovery UND User
  // Research UND Product Discovery. Wer fuer den zweiten Bereich keinen
  // eigenen Beleg hat, hat denselben Fund zweimal benannt.
  const quotes = ["jede Woche mit Kliniken telefoniert"];
  const analysis = validateModelAnalysis(
    {
      areas: [
        { areaId: "b2b_sales", quotes },
        { areaId: "partnerships", quotes },
        { areaId: "customer_success", quotes },
      ],
    },
    { narrative: NARRATIVE, areaIds: AREAS }
  );

  assert.deepEqual(analysis.areas.map((area) => area.areaId), ["b2b_sales"]);
});

test("ein eigener Beleg traegt einen eigenen Bereich", () => {
  // Die Gegenprobe: Wer fuer den zweiten Bereich eine ANDERE Stelle im Text
  // anfuehrt, hat auch wirklich etwas Zweites gefunden.
  const analysis = validateModelAnalysis(
    {
      areas: [
        { areaId: "b2b_sales", quotes: ["jede Woche mit Kliniken telefoniert"] },
        { areaId: "partnerships", quotes: ["den Vertrag mit ihrer Einkaufsabteilung verhandelt"] },
      ],
    },
    { narrative: NARRATIVE, areaIds: AREAS }
  );

  assert.deepEqual(analysis.areas.map((area) => area.areaId), ["b2b_sales", "partnerships"]);
});

test("derselbe Bereich zweimal wird einmal gezaehlt, und es bleiben hoechstens drei", () => {
  const analysis = validateModelAnalysis(
    {
      areas: [
        { areaId: "b2b_sales", quotes: ["jede Woche mit Kliniken telefoniert"] },
        { areaId: "b2b_sales", quotes: ["bis endlich eine zugesagt hat"] },
        { areaId: "partnerships", quotes: ["bis endlich eine zugesagt hat"] },
        { areaId: "customer_success", quotes: ["den Vertrag mit ihrer Einkaufsabteilung"] },
        { areaId: "software_engineering", quotes: ["Einkaufsabteilung verhandelt"] },
      ],
    },
    { narrative: NARRATIVE, areaIds: AREAS }
  );

  assert.ok(analysis.areas.length <= 3);
  assert.equal(new Set(analysis.areas.map((a) => a.areaId)).size, analysis.areas.length);
  assert.equal(analysis.areas[0].areaId, "b2b_sales");
});

test("eine Staerke braucht einen Beleg, und zu lang wird verworfen statt gekuerzt", () => {
  // Ein abgeschnittener Satz mitten im Wort sieht aus wie ein Fehler der
  // Person, nicht wie einer des Modells.
  //
  // ERWEITERT AM 22.09.2026: Die Staerke traegt jetzt ein Zitat. Bis dahin
  // war sie ein Satz ins Blaue - das Feld wurde ausgelesen und weggeworfen,
  // also fiel nicht auf, dass nichts es stuetzte. Seit sie gespeichert wird
  // und jemandem angezeigt wird, gilt dieselbe Zitatpflicht wie fuer jeden
  // anderen Vorschlag.
  const quote = "drei Jahre lang jede Woche mit Kliniken telefoniert";

  const long = validateModelAnalysis(
    { areas: [], strength: { statement: "x".repeat(400), quote } },
    { narrative: NARRATIVE, areaIds: AREAS }
  );
  assert.equal(long.strength, null);

  // Ohne Beleg gibt es keine Staerke - auch wenn der Satz gut klingt.
  const unquoted = validateModelAnalysis(
    { areas: [], strength: { statement: "Bleibt lange an einer Sache dran.", quote: "steht so nicht im Text" } },
    { narrative: NARRATIVE, areaIds: AREAS }
  );
  assert.equal(unquoted.strength, null);

  // Und kein Satz UEBER die Person: "Du bist hartnaeckig" waere ein Typ.
  const aboutPerson = validateModelAnalysis(
    { areas: [], strength: { statement: "Du bist ein hartnaeckiger Mensch.", quote } },
    { narrative: NARRATIVE, areaIds: AREAS }
  );
  assert.equal(aboutPerson.strength, null);

  const fine = validateModelAnalysis(
    { areas: [], strength: { statement: "Bleibt über lange Zeiträume an einer Sache dran.", quote } },
    { narrative: NARRATIVE, areaIds: AREAS }
  );
  assert.deepEqual(fine.strength, {
    statement: "Bleibt über lange Zeiträume an einer Sache dran.",
    quote,
  });
});

test("ist das Modell nicht erreichbar, antwortet die Begriffsliste", async () => {
  // Der Laptop kann aus sein. Das ist kein Fehler, sondern ein schlechteres
  // Ergebnis - und im `engine` ist zu sehen, welches.
  const previous = process.env.OLLAMA_URL;
  // Eine Adresse, an der nichts lauscht: Der Aufruf scheitert sofort.
  process.env.OLLAMA_URL = "http://127.0.0.1:1";

  try {
    const analyze = createModelNarrativeAnalyzer({
      areas: AREAS_WITH_LABELS,
      fallback: analyzeNarrativeWithRules,
    });
    const analysis = await analyze({ narrative: "Ich habe im B2B Vertrieb gearbeitet.", locale: "de" });

    assert.equal(analysis.engine, "rules", "ein Ausfall darf sich nicht als Modellantwort ausgeben");
    assert.ok(analysis.areas.length > 0, "die Regeln haetten hier etwas finden muessen");
  } finally {
    if (previous === undefined) delete process.env.OLLAMA_URL;
    else process.env.OLLAMA_URL = previous;
  }
});

test("fremder Text geht nie als Anweisung ins Modell", () => {
  // Ein Lebenslauf oder eine erzaehlte Aufgabe kann "Ignore previous
  // instructions" enthalten. Deshalb steht die Aufgabe in der Systemrolle und
  // der fremde Text getrennt davon als Material - sichtbar abgegrenzt.
  const ollama = codeOnly("src/lib/ai/ollama.ts");
  assert.match(ollama, /role: "system", content: call\.instruction/);
  assert.match(ollama, /role: "user"[\s\S]{0,120}<text>/);

  const model = codeOnly("src/features/capability/narrativeAnalysisModel.ts");
  assert.match(model, /niemals/i, "die Regel steht nicht im Prompt");
  // Und das erzwungene Schema, damit die Antwort keine Prosa sein kann.
  assert.match(ollama, /format: call\.schema/);
});

test("nichts davon ist an die Anwendung angeschlossen", () => {
  // Stufe 0 ist eine Messung, kein Umbau: Solange nicht feststeht, ob das
  // Modell besser ist als die Liste, aendert sich am Produkt nichts.
  const actions = codeOnly("src/features/capability/capabilityActions.ts");
  assert.doesNotMatch(actions, /narrativeAnalysisModel|createModelNarrativeAnalyzer/);
  const start = codeOnly("src/features/capability/CapabilitySnapshotStart.tsx");
  assert.doesNotMatch(start, /narrativeAnalysisModel|createModelNarrativeAnalyzer/);
});
