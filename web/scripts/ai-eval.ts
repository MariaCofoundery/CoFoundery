/**
 * Misst das Sprachmodell gegen die Begriffsliste.
 *
 *   node --import ./scripts/register-ts-alias.mjs --experimental-strip-types scripts/ai-eval.ts
 *   (oder: npm run ai:eval)
 *
 * WARUM EIN SKRIPT UND KEIN TEST: Es braucht ein laufendes Ollama. `npm test`
 * muss auf jedem Rechner durchlaufen, auch mit ausgeschaltetem Laptop - ein
 * Test, der von einem lokalen Dienst abhaengt, waere auf jedem anderen Rechner
 * rot und damit wertlos.
 *
 * WAS ES BEANTWORTET: Ist das Modell bei unseren Texten besser als die Liste?
 * Die Liste ist dabei nicht der Gegner, sondern die Messlatte: Sie kostet
 * nichts, laeuft immer und ist vollstaendig erklaerbar. Das Modell muss den
 * Aufwand rechtfertigen, nicht umgekehrt.
 *
 * Gezaehlt werden vier Dinge, in dieser Reihenfolge der Wichtigkeit:
 *
 *   ERFUNDEN   Vorschlaege ohne Grundlage im Text. Jeder einzelne ist ein
 *              Ausschlussgrund - eine falsche Capability landet in einem
 *              Profil, das andere Menschen lesen.
 *   GEFUNDEN   Wie viel von dem, was drinsteht, wird erkannt.
 *   RUHE       Faelle, in denen nichts drinsteht und nichts vorgeschlagen wird.
 *   DAUER      Wie lange es braucht.
 */

import { readFileSync } from "node:fs";

import { analyzeNarrativeWithRules, type NarrativeAnalysis } from "@/features/capability/narrativeAnalysis";
import { createModelNarrativeAnalyzer } from "@/features/capability/narrativeAnalysisModel";
import { getAiModel, isModelReachable } from "@/lib/ai/ollama";

type EvalCase = { id: string; narrative: string; expected: string[]; warum?: string };

const MIGRATION = "../supabase/migrations/20260907160000_create_capability_snapshot_v01.sql";

/**
 * Das Vokabular aus der Migration, nicht aus einer Liste im Code.
 *
 * `capability_areas` ist die eine Wahrheit. Eine zweite Aufzaehlung hier waere
 * genau die Drift, vor der die Migration selbst warnt.
 */
function readAreaIds() {
  const sql = readFileSync(MIGRATION, "utf8");
  const ids = [...sql.matchAll(/\('([a-z_0-9]+)',\s*'[a-z_]+',\s*\d+\)/g)].map((match) => match[1]);
  const unique = [...new Set(ids)].filter((id) => id !== "other");
  if (unique.length < 20) throw new Error("Vokabular nicht gefunden - hat sich die Migration geaendert?");
  return unique;
}

function describe(analysis: NarrativeAnalysis) {
  if (analysis.areas.length === 0) return "–";
  return analysis.areas.map((area) => area.areaId).join(", ");
}

async function main() {
  const areaIds = readAreaIds();
  const { cases } = JSON.parse(readFileSync("scripts/ai-eval-cases.json", "utf8")) as {
    cases: EvalCase[];
  };

  if (!(await isModelReachable())) {
    console.error(
      [
        "Das Modell ist nicht erreichbar.",
        "",
        "  1. ollama serve         (laeuft es schon, ist das hier der falsche Port)",
        `  2. ollama pull ${getAiModel()}`,
        "",
        "Danach noch einmal.",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Modell: ${getAiModel()}   Bereiche: ${areaIds.length}   Faelle: ${cases.length}\n`);

  const analyzeWithModel = createModelNarrativeAnalyzer({
    areaIds,
    // Im Auswertungslauf gibt es keinen Rueckfall: Wir wollen sehen, was das
    // Modell antwortet, nicht was die Liste daraus macht.
    fallback: async () => ({ areas: [], strength: null, engine: "model" }),
  });

  let rulesFound = 0;
  let modelFound = 0;
  let expectedTotal = 0;
  let modelExtra = 0;
  let rulesExtra = 0;
  let totalMs = 0;

  for (const testCase of cases) {
    const expected = new Set(testCase.expected);
    expectedTotal += expected.size;

    const rules = await analyzeNarrativeWithRules({ narrative: testCase.narrative, locale: "de" });
    const startedAt = Date.now();
    const model = await analyzeWithModel({ narrative: testCase.narrative, locale: "de" });
    const durationMs = Date.now() - startedAt;
    totalMs += durationMs;

    const hit = (analysis: NarrativeAnalysis) =>
      analysis.areas.filter((area) => expected.has(area.areaId)).length;
    const extra = (analysis: NarrativeAnalysis) =>
      analysis.areas.filter((area) => !expected.has(area.areaId)).length;

    rulesFound += hit(rules);
    modelFound += hit(model);
    rulesExtra += extra(rules);
    modelExtra += extra(model);

    const mark = extra(model) > 0 ? "!" : hit(model) === expected.size ? "+" : "~";
    console.log(`${mark} ${testCase.id}  (${(durationMs / 1000).toFixed(1)}s)`);
    console.log(`    erwartet: ${[...expected].join(", ") || "–"}`);
    console.log(`    Regeln:   ${describe(rules)}`);
    console.log(`    Modell:   ${describe(model)}`);
    if (model.strength) console.log(`    Stärke:   ${model.strength}`);
    for (const area of model.areas) {
      console.log(`      ${area.areaId} ← „${area.matchedTerms[0]}“`);
    }
    console.log();
  }

  console.log("─".repeat(60));
  console.log(`gefunden   Regeln ${rulesFound}/${expectedTotal}   Modell ${modelFound}/${expectedTotal}`);
  console.log(`zusätzlich Regeln ${rulesExtra}          Modell ${modelExtra}`);
  console.log(`Dauer      ${(totalMs / cases.length / 1000).toFixed(1)}s je Fall`);
  console.log();
  console.log(
    modelExtra > rulesExtra
      ? "Das Modell schlägt mehr Unbelegtes vor als die Liste. Das ist der Ausschlussgrund, nicht die Trefferquote."
      : "Kein zusätzliches Rauschen gegenüber der Liste."
  );
}

await main();
