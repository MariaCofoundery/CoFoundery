import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEmptyFounderAlignmentWorkbookPayload,
  WORKBOOK_STEP_IDS,
} from "@/features/reporting/founderAlignmentWorkbook";
import {
  getWorkbookContent,
  resolveWorkbookContentSteps,
} from "@/features/reporting/workbookContent/workbookContent";

test("getWorkbookContent returns localized workbook step copy", () => {
  const de = getWorkbookContent("de");
  const en = getWorkbookContent("en");

  assert.equal(de.steps[0]?.title, "Unternehmenslogik");
  assert.equal(en.steps[0]?.title, "Company logic");
  assert.equal(
    en.steps[0]?.prompts[0],
    "What gets priority when revenue opportunities, product focus, and company building pull in different directions?"
  );
});

test("getWorkbookContent falls back to German for invalid locales", () => {
  assert.equal(getWorkbookContent("fr").steps[0]?.title, "Unternehmenslogik");
  assert.equal(getWorkbookContent(null).steps[0]?.title, "Unternehmenslogik");
});

test("workbook content keeps identical step keys across locales", () => {
  const deStepIds = getWorkbookContent("de").steps.map((step) => step.id);
  const enStepIds = getWorkbookContent("en").steps.map((step) => step.id);
  const deContentKeys = Object.keys(getWorkbookContent("de").stepContent).sort();
  const enContentKeys = Object.keys(getWorkbookContent("en").stepContent).sort();

  assert.deepEqual(deStepIds, [...WORKBOOK_STEP_IDS]);
  assert.deepEqual(enStepIds, deStepIds);
  assert.deepEqual(enContentKeys, deContentKeys);
});

test("visible workbook content steps follow the same feature flags", () => {
  const content = getWorkbookContent("en");

  assert.equal(resolveWorkbookContentSteps(content, false, false).some((step) => step.id === "values_guardrails"), false);
  assert.equal(resolveWorkbookContentSteps(content, true, false).some((step) => step.id === "values_guardrails"), true);
  assert.equal(resolveWorkbookContentSteps(content, true, false).some((step) => step.id === "advisor_closing"), false);
  assert.equal(resolveWorkbookContentSteps(content, true, true).some((step) => step.id === "advisor_closing"), true);
});

test("workbook content resolver does not transform stored user payload", () => {
  const payload = buildEmptyFounderAlignmentWorkbookPayload();
  payload.steps.vision_direction.founderA = "Meine gespeicherte Antwort bleibt exakt so.";
  payload.steps.vision_direction.agreement = "Unsere gespeicherte Vereinbarung bleibt exakt so.";
  const before = JSON.stringify(payload);

  getWorkbookContent("en");
  getWorkbookContent("de");

  assert.equal(JSON.stringify(payload), before);
});
