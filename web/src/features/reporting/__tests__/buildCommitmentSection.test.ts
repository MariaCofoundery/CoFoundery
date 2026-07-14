import assert from "node:assert/strict";
import test from "node:test";
import { buildCommitmentSection } from "@/features/reporting/buildCommitmentSection";
import { getReportBuilderCopy } from "@/features/reporting/content/builderCopy/builderCopy";
import {
  findEnglishReportCopyQualityIssues,
  findGermanResidueInEnglishReportCopy,
} from "@/features/reporting/content/reportCopyGuards";
import type { DimensionResult } from "@/features/scoring/founderScoring";

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStringValues);
  }

  return [];
}

const mixedCommitmentDimension = {
  dimension: "Commitment",
  fitCategory: "mixed",
  tensionCategory: "elevated",
  tensionScore: 42,
} as unknown as DimensionResult;

test("buildCommitmentSection keeps the German default stable", () => {
  const section = buildCommitmentSection({
    dimensionResult: mixedCommitmentDimension,
    teamContext: "pre_founder",
    builderCopy: getReportBuilderCopy("de"),
  });

  assert.equal(section.dimension, "Commitment");
  assert.equal(
    section.interpretation,
    "Beim Commitment zeigen sich erkennbare Unterschiede, etwa bei Priorisierung, Verfügbarkeit oder dem erwarteten Einsatzniveau im Alltag. Vor einer gemeinsamen Zusammenarbeit lohnt es sich, darüber offen zu sprechen, bevor daraus stille Erwartungen entstehen."
  );
  assert.equal(section.potentialTensions[0]?.topic, "Priorität des Startups");
  assert.equal(section.potentialTensions[1]?.topic, "Einsatzniveau im Alltag");
  assert.equal(section.potentialTensions[2]?.topic, "Umgang mit Belastung");
  assert.equal(section.potentialTensions[3]?.topic, "Fokus und Nebenprojekte");
  assert.equal(
    section.conversationPrompts[0],
    "Welche Rolle soll das Startup aktuell in eurem Alltag und in eurem Leben spielen?"
  );
});

test("buildCommitmentSection returns English section copy for locale en builder copy", () => {
  const section = buildCommitmentSection({
    dimensionResult: mixedCommitmentDimension,
    teamContext: "pre_founder",
    builderCopy: getReportBuilderCopy("en"),
  });

  assert.equal(section.dimension, "Commitment");
  assert.match(section.interpretation, /Commitment shows visible differences/);
  assert.match(section.everydaySignals, /Day to day/);
  assert.deepEqual(
    section.potentialTensions.map((entry) => entry.topic),
    [
      "Startup priority",
      "Day-to-day commitment level",
      "Handling pressure",
      "Focus and side projects",
    ]
  );
  assert.equal(
    section.conversationPrompts[0],
    "What role should the startup play in your everyday work and life right now?"
  );

  const visibleEnglishCopy = collectStringValues(section).join("\n");
  assert.deepEqual(findEnglishReportCopyQualityIssues(visibleEnglishCopy), []);
  assert.deepEqual(findGermanResidueInEnglishReportCopy(visibleEnglishCopy), []);
});

