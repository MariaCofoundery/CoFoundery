/**
 * Misst das Sprachmodell gegen die Begriffsliste.
 *
 *   npm run ai:eval
 *
 * WARUM EIN SKRIPT UND KEIN TEST: Es braucht ein laufendes Ollama. `npm test`
 * muss auf jedem Rechner durchlaufen, auch mit ausgeschaltetem Laptop - ein
 * Test, der von einem lokalen Dienst abhaengt, waere anderswo rot und damit
 * wertlos.
 *
 * WAS ES BEANTWORTET: Ist das Modell bei unseren Texten besser als die Liste?
 * Die Liste ist nicht der Gegner, sondern die Messlatte: Sie kostet nichts,
 * laeuft immer und ist vollstaendig erklaerbar. Das Modell muss den Aufwand
 * rechtfertigen, nicht umgekehrt.
 *
 * KEINE ANTWORT IST NICHT "NICHTS GEFUNDEN".
 *   Der erste Lauf am 20.09.2026 zeigte zehnmal "Modell: –" und darunter
 *   "kein zusaetzliches Rauschen" - in Wahrheit war jeder einzelne Aufruf in
 *   den Zeitablauf gelaufen und das Modell hatte nie geantwortet. Das Urteil
 *   war also ein Lob fuer Schweigen. Seitdem werden Ausfaelle getrennt
 *   gezaehlt und das Ergebnis ist ungueltig, solange es welche gibt.
 */

import { readFileSync } from "node:fs";

import { analyzeNarrativeWithRules, type NarrativeAnalysis } from "@/features/capability/narrativeAnalysis";
import {
  createModelNarrativeAnalyzer,
  type AnalyzableArea,
} from "@/features/capability/narrativeAnalysisModel";
import { getAiModel, isModelReachable } from "@/lib/ai/ollama";

type EvalCase = { id: string; narrative: string; expected: string[]; warum?: string };

const MIGRATION = "../supabase/migrations/20260907160000_create_capability_snapshot_v01.sql";
const LABELS = "messages/de/capability.json";

/**
 * Das Vokabular aus der Migration, die Beschriftungen aus i18n.
 *
 * Beides dort, wo es hingehoert: `capability_areas` ist die eine Wahrheit fuer
 * die IDs, und die Migration sagt selbst, dass Anzeigetexte in i18n liegen.
 * Eine Liste im Skript waere die naechste, die auseinanderlaeuft.
 */
function readAreas(): AnalyzableArea[] {
  const sql = readFileSync(MIGRATION, "utf8");
  const ids = [...sql.matchAll(/\('([a-z_0-9]+)',\s*'[a-z_]+',\s*\d+\)/g)].map((match) => match[1]);
  const labels = (JSON.parse(readFileSync(LABELS, "utf8")) as { areaLabels: Record<string, string> })
    .areaLabels;

  const areas = [...new Set(ids)]
    .filter((id) => id !== "other")
    .map((id) => ({ id, label: labels[id] ?? id }));

  if (areas.length < 20) throw new Error("Vokabular nicht gefunden - hat sich die Migration geaendert?");
  const ohneLabel = areas.filter((area) => area.label === area.id);
  if (ohneLabel.length > 0) {
    console.warn(`Ohne Beschriftung: ${ohneLabel.map((area) => area.id).join(", ")}\n`);
  }
  return areas;
}

function describe(analysis: NarrativeAnalysis) {
  return analysis.areas.length === 0 ? "–" : analysis.areas.map((area) => area.areaId).join(", ");
}

async function main() {
  const areas = readAreas();
  const { cases } = JSON.parse(readFileSync("scripts/ai-eval-cases.json", "utf8")) as {
    cases: EvalCase[];
  };

  if (!(await isModelReachable())) {
    console.error(
      [
        "Das Modell ist nicht erreichbar.",
        "",
        "  ollama serve",
        `  ollama pull ${getAiModel()}`,
        "",
        "Danach noch einmal.",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Modell: ${getAiModel()}   Bereiche: ${areas.length}   Faelle: ${cases.length}\n`);

  // Der Rueckfall ist im Auswertungslauf kein Ergebnis, sondern ein Befund:
  // Hier soll sichtbar werden, was das MODELL antwortet.
  let noAnswer = false;
  const analyzeWithModel = createModelNarrativeAnalyzer({
    areas,
    fallback: async () => {
      noAnswer = true;
      return { areas: [], strength: null, engine: "model" };
    },
  });

  let rulesFound = 0;
  let modelFound = 0;
  let expectedTotal = 0;
  let modelExtra = 0;
  let rulesExtra = 0;
  let failures = 0;
  let totalMs = 0;

  for (const testCase of cases) {
    const expected = new Set(testCase.expected);
    expectedTotal += expected.size;

    const rules = await analyzeNarrativeWithRules({ narrative: testCase.narrative, locale: "de" });

    noAnswer = false;
    const startedAt = Date.now();
    const model = await analyzeWithModel({ narrative: testCase.narrative, locale: "de" });
    const durationMs = Date.now() - startedAt;
    totalMs += durationMs;

    const hit = (analysis: NarrativeAnalysis) =>
      analysis.areas.filter((area) => expected.has(area.areaId)).length;
    const extra = (analysis: NarrativeAnalysis) =>
      analysis.areas.filter((area) => !expected.has(area.areaId)).length;

    rulesFound += hit(rules);
    rulesExtra += extra(rules);
    if (noAnswer) {
      failures += 1;
    } else {
      modelFound += hit(model);
      modelExtra += extra(model);
    }

    const mark = noAnswer ? "?" : extra(model) > 0 ? "!" : hit(model) === expected.size ? "+" : "~";
    console.log(`${mark} ${testCase.id}  (${(durationMs / 1000).toFixed(1)}s)`);
    console.log(`    erwartet: ${[...expected].join(", ") || "–"}`);
    console.log(`    Regeln:   ${describe(rules)}`);
    console.log(
      `    Modell:   ${noAnswer ? "KEINE ANTWORT (Zeitablauf oder nicht erreichbar)" : describe(model)}`
    );
    if (model.strength) console.log(`    Stärke:   ${model.strength}`);
    for (const area of model.areas) {
      console.log(`      ${area.areaId} ← „${area.matchedTerms[0]}“`);
    }
    console.log();
  }

  const answered = cases.length - failures;
  console.log("─".repeat(64));
  console.log(`gefunden    Regeln ${rulesFound}/${expectedTotal}   Modell ${modelFound}/${expectedTotal}`);
  console.log(`zusätzlich  Regeln ${rulesExtra}           Modell ${modelExtra}`);
  console.log(`Dauer       ${(totalMs / cases.length / 1000).toFixed(1)}s je Fall`);
  console.log();

  if (failures > 0) {
    console.log(
      `${failures} von ${cases.length} Fällen ohne Antwort. Das Ergebnis sagt nichts über die Qualität ` +
        `aus, solange das so ist - erst den Ausfall klären.`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    modelExtra > rulesExtra
      ? `Das Modell schlägt mehr Unbelegtes vor als die Liste (${modelExtra} gegen ${rulesExtra}). ` +
          `Das ist der Ausschlussgrund, nicht die Trefferquote.`
      : `Kein zusätzliches Rauschen gegenüber der Liste (${modelExtra} gegen ${rulesExtra}), ` +
          `bei ${answered} beantworteten Fällen.`
  );
}

await main();
