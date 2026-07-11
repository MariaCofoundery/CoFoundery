import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_GLOSSARY, getReportGlossaryEntry } from "@/features/reporting/content/reportGlossary";
import {
  REPORT_COPY_QUALITY_PRINCIPLES,
  REPORT_TONE_GUIDELINES,
} from "@/features/reporting/content/reportToneGuidelines";
import {
  findEnglishReportCopyQualityIssues,
  findForbiddenEnglishReportPhrases,
  findGermanResidueInEnglishReportCopy,
  findHardPercentageClaims,
} from "@/features/reporting/content/reportCopyGuards";

test("report glossary defines stable German and English terms for core report concepts", () => {
  assert.ok(REPORT_GLOSSARY.length >= 12);
  assert.deepEqual(getReportGlossaryEntry("dynamics_report"), {
    key: "dynamics_report",
    de: "Dynamik-Report",
    en: "Founder dynamics report",
    notes: "Use for the product report, not as a psychological diagnosis.",
  });
  assert.equal(getReportGlossaryEntry("operating_agreement")?.en, "Operating Agreement");
});

test("report tone guidelines keep future fachcopy non-diagnostic and conversation-led", () => {
  const rules = REPORT_TONE_GUIDELINES.map((guideline) => guideline.key);

  assert.ok(rules.includes("no_diagnostic_language"));
  assert.ok(rules.includes("no_hard_fit_claims"));
  assert.ok(rules.includes("no_fake_precision"));
  assert.ok(rules.includes("no_raw_answers"));
  assert.equal(REPORT_COPY_QUALITY_PRINCIPLES.stance, "Careful, practical, and non-diagnostic.");
});

test("copy guards flag forbidden English report phrases without failing on neutral copy", () => {
  const neutralCopy =
    "This tension field gives the team a practical conversation prompt for the next decision.";
  const riskyCopy =
    "This is a perfect match. The other founder is a low performer and this reads like a diagnosis.";

  assert.deepEqual(findForbiddenEnglishReportPhrases(neutralCopy), []);
  assert.deepEqual(
    findForbiddenEnglishReportPhrases(riskyCopy).map((issue) => issue.match),
    ["perfect match", "diagnosis", "low performer"]
  );
});

test("copy guards flag hard percentage claims only when they sound like promises", () => {
  const carefulCopy = "The chart shows 72% coverage for answered inputs, not a suitability claim.";
  const riskyCopy = "The two founders are a 92% match with 88% compatibility.";

  assert.deepEqual(findHardPercentageClaims(carefulCopy), []);
  assert.deepEqual(
    findHardPercentageClaims(riskyCopy).map((issue) => issue.match),
    ["92% match", "88% compatibility"]
  );
});

test("copy guards flag likely German residue in English report fachcopy", () => {
  const englishCopy = "Discuss this tension field before the next operating decision.";
  const mixedCopy = "Use this Spannungsfeld as a Gesprächsimpuls for the next Entscheidung.";

  assert.deepEqual(findGermanResidueInEnglishReportCopy(englishCopy), []);
  assert.deepEqual(
    findGermanResidueInEnglishReportCopy(mixedCopy).map((issue) => issue.match),
    ["Spannungsfeld", "Gesprächsimpuls", "Entscheidung"]
  );
});

test("combined report copy guard returns ordered issues for future English builder outputs", () => {
  const issues = findEnglishReportCopyQualityIssues(
    "This is a bad match with 100% certainty. Bitte besprecht dieses Spannungsfeld."
  );

  assert.deepEqual(
    issues.map((issue) => [issue.kind, issue.match]),
    [
      ["forbidden_phrase", "bad match"],
      ["hard_percentage_claim", "100% certainty"],
      ["german_residue", "Spannungsfeld"],
    ]
  );
});
