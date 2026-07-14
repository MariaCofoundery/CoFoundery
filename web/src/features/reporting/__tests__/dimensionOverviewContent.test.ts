import assert from "node:assert/strict";
import test from "node:test";
import { getDimensionOverviewContent } from "@/features/reporting/dimensionOverviewContent";
import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

const SCORES: SelfAlignmentReport["scoresA"] = {
  Unternehmenslogik: 32,
  Entscheidungslogik: 48,
  Risikoorientierung: 65,
  "Arbeitsstruktur & Zusammenarbeit": 51,
  Commitment: 74,
  Konfliktstil: 29,
};

test("dimension overview content returns German labels by default", () => {
  const overview = getDimensionOverviewContent(SCORES);
  const companyLogic = overview.rows.find((row) => row.dimension === "Unternehmenslogik");

  assert.equal(overview.eyebrow, "Übersicht");
  assert.equal(overview.title, "Dein aktueller Stand in 6 Dimensionen");
  assert.equal(companyLogic?.label, "Unternehmenslogik");
  assert.equal(companyLogic?.leftLabel, "substanz & aufbauorientiert");
  assert.equal(companyLogic?.rightLabel, "chancen & hebelorientiert");
});

test("dimension overview content returns English labels for locale en", () => {
  const overview = getDimensionOverviewContent(SCORES, "en");
  const companyLogic = overview.rows.find((row) => row.dimension === "Unternehmenslogik");
  const workStructure = overview.rows.find(
    (row) => row.dimension === "Arbeitsstruktur & Zusammenarbeit"
  );

  assert.equal(overview.eyebrow, "Overview");
  assert.equal(overview.title, "Your current profile across 6 dimensions");
  assert.equal(companyLogic?.label, "Company logic");
  assert.equal(companyLogic?.leftLabel, "substance and build-oriented");
  assert.equal(companyLogic?.rightLabel, "opportunity and leverage-oriented");
  assert.equal(workStructure?.label, "Collaboration");
  assert.equal(workStructure?.rightLabel, "aligned");
});

test("dimension overview content falls back to German for unknown locale", () => {
  assert.deepEqual(
    getDimensionOverviewContent(SCORES, "fr"),
    getDimensionOverviewContent(SCORES, "de")
  );
});

test("dimension overview content keeps dimension keys, order and scores unchanged", () => {
  const overview = getDimensionOverviewContent(SCORES, "en");

  assert.deepEqual(
    overview.rows.map((row) => row.dimension),
    FOUNDER_DIMENSION_ORDER
  );
  assert.deepEqual(
    Object.fromEntries(overview.rows.map((row) => [row.dimension, row.score])),
    SCORES
  );
});
