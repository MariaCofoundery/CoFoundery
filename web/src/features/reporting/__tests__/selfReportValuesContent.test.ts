import assert from "node:assert/strict";
import test from "node:test";
import { findEnglishReportCopyQualityIssues } from "@/features/reporting/content/reportCopyGuards";
import {
  getSelfReportValuesDisplayProfile,
  getSelfReportValuesFallbackText,
} from "@/features/reporting/selfReportValuesContent";
import type { SelfValuesProfile } from "@/features/reporting/types";

const BASE_PROFILE: SelfValuesProfile = {
  primaryArchetypeId: "impact_idealist",
  secondaryArchetypeId: "business_pragmatiker",
  primaryLabel: "Impact-Idealist:in",
  secondaryLabel: "Business-Pragmatiker:in",
  summary:
    "Am ehesten ziehst du zu Entscheidungen, in denen vertretbare Wirkung und klare Leitplanken zuerst zählen. Gleichzeitig verlierst du Tempo, Hebel und wirtschaftliche Wirkung nicht aus dem Blick.",
  insights: [
    "Du gibst einen Schritt eher nicht frei, nur weil er kurzfristig hilft.",
    "Gerade in knappen Situationen merkst du, dass auch Tempo, Hebel und wirtschaftliche Wirkung bei dir mitspielt.",
    "Hilfreich ist, vor heiklen Entscheidungen kurz festzuhalten, was diesmal zuerst zählen soll.",
  ],
  watchouts: [
    "Kritisch wird es weniger bei den einzelnen Prioritäten als bei ihrer Reihenfolge.",
  ],
  answered: 12,
  total: 12,
  clusterScores: {
    impact_idealist: 4.2,
    verantwortungs_stratege: 3.1,
    business_pragmatiker: 4,
  },
};

function collectVisibleText(profile: ReturnType<typeof getSelfReportValuesDisplayProfile>) {
  return [
    profile.primaryLabel,
    profile.secondaryLabel ?? "",
    profile.summary,
    ...profile.insights,
    ...profile.watchouts,
  ].join("\n");
}

test("self report values content keeps German scoring copy stable by default", () => {
  const display = getSelfReportValuesDisplayProfile(BASE_PROFILE);

  assert.equal(display.primaryLabel, BASE_PROFILE.primaryLabel);
  assert.equal(display.secondaryLabel, BASE_PROFILE.secondaryLabel);
  assert.equal(display.summary, BASE_PROFILE.summary);
  assert.deepEqual(display.insights, BASE_PROFILE.insights);
  assert.deepEqual(display.watchouts, BASE_PROFILE.watchouts);
});

test("self report values content returns English display copy for locale en", () => {
  const display = getSelfReportValuesDisplayProfile(BASE_PROFILE, "en");

  assert.equal(display.primaryLabel, "Impact-oriented idealist");
  assert.equal(display.secondaryLabel, "Business pragmatist");
  assert.match(display.summary, /responsible impact and clear guardrails/);
  assert.match(display.insights[0] ?? "", /short term/);
  assert.match(display.watchouts[0] ?? "", /individual priorities/);
});

test("self report values content falls back to German for unknown locale", () => {
  assert.deepEqual(
    getSelfReportValuesDisplayProfile(BASE_PROFILE, "fr"),
    getSelfReportValuesDisplayProfile(BASE_PROFILE, "de")
  );
});

test("English self report values copy passes report copy guards", () => {
  const display = getSelfReportValuesDisplayProfile(BASE_PROFILE, "en");

  assert.deepEqual(findEnglishReportCopyQualityIssues(collectVisibleText(display)), []);
});

test("self report values fallback copy is localized for missing values profiles", () => {
  assert.equal(
    getSelfReportValuesFallbackText("in_progress", "Dein Werteprofil ist in Bearbeitung.", "de"),
    "Dein Werteprofil ist in Bearbeitung."
  );
  assert.equal(
    getSelfReportValuesFallbackText("in_progress", "Dein Werteprofil ist in Bearbeitung.", "en"),
    "Your values profile is in progress. Submit the add-on to see a fuller interpretation."
  );
  assert.equal(
    getSelfReportValuesFallbackText("not_started", "", "fr"),
    "Schließe das Werte-Add-on ab, um eine verdichtete Werte-Einordnung zu erhalten."
  );
});

test("English values fallback copy passes report copy guards", () => {
  const fallbackText = [
    getSelfReportValuesFallbackText("not_started", null, "en"),
    getSelfReportValuesFallbackText("in_progress", null, "en"),
    getSelfReportValuesFallbackText("completed", null, "en"),
  ].join("\n");

  assert.deepEqual(findEnglishReportCopyQualityIssues(fallbackText), []);
});

test("self report values display copy does not change scoring structure", () => {
  const before = structuredClone(BASE_PROFILE);
  const display = getSelfReportValuesDisplayProfile(BASE_PROFILE, "en");

  assert.deepEqual(BASE_PROFILE, before);
  assert.equal(BASE_PROFILE.primaryArchetypeId, "impact_idealist");
  assert.equal(BASE_PROFILE.secondaryArchetypeId, "business_pragmatiker");
  assert.deepEqual(BASE_PROFILE.clusterScores, before.clusterScores);
  assert.equal(typeof display.summary, "string");
});
