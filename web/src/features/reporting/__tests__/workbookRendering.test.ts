import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getWorkbookContent } from "@/features/reporting/workbookContent/workbookContent";
import {
  normalizeWorkbookSystemText,
  normalizeWorkbookSystemTextWithProtectedValues,
} from "@/features/reporting/workbookRendering";

const clientSource = fs.readFileSync(
  path.resolve(process.cwd(), "src/features/reporting/FounderAlignmentWorkbookClient.tsx"),
  "utf8"
);

test("English workbook system copy bypasses German normalization unchanged", () => {
  for (const word of ["does", "questions", "issues", "pursued", "Values"]) {
    assert.equal(normalizeWorkbookSystemText(word, "en"), word);
  }

  const sentence = getWorkbookContent("en").stepContent.values_guardrails.context[1];
  assert.equal(
    sentence,
    "Trigger: money, growth, or pressure make a step attractive that does not cleanly fit your principles."
  );
  assert.equal(normalizeWorkbookSystemText(sentence, "en"), sentence);
});

test("German workbook system copy retains the existing encoding normalization", () => {
  assert.equal(normalizeWorkbookSystemText("staerker abgestimmt", "de"), "stärker abgestimmt");
  assert.equal(
    normalizeWorkbookSystemText("Ma\u00c3\u0178 und \u00c3\u00bcber \u00e2\u20ac\u201c frueh", "de"),
    "Maß und über – früh"
  );
  assert.equal(normalizeWorkbookSystemText("darueber Rueckkopplung", "de"), "darüber Rückkopplung");
});

test("identity values remain exact inside normalized German system copy", () => {
  const founderName = "Sue Questions";
  const advisorName = "Values Pursued";

  assert.equal(
    normalizeWorkbookSystemTextWithProtectedValues(
      `Fuer ${founderName} und ${advisorName} bleibt dieser Hinweis sichtbar.`,
      "de",
      [founderName, advisorName]
    ),
    `Für ${founderName} und ${advisorName} bleibt dieser Hinweis sichtbar.`
  );
});

test("stored workbook content is rendered directly instead of through German normalization", () => {
  for (const unsafePattern of [
    /t\(entry\.content\)/u,
    /t\(reply\.content\)/u,
    /t\(impulse\.text\)/u,
    /t\(compactPreview\)/u,
    /t\(currentStepEntry\.agreement\)/u,
    /t\(currentAgreementDraft\.draft\)/u,
    /t\(item\.advisorNotes\)/u,
    /t\(primaryAgreement\)/u,
  ]) {
    assert.doesNotMatch(clientSource, unsafePattern);
  }

  for (const directRender of [
    /\{entry\.content\}/u,
    /\{reply\.content\}/u,
    /\{impulse\.text\}/u,
    /\{compactPreview\}/u,
    /\{item\.advisorNotes\}/u,
  ]) {
    assert.match(clientSource, directRender);
  }
});

test("founder and advisor names are not passed through German normalization", () => {
  assert.doesNotMatch(clientSource, /t\((?:founderA|founderB|advisor)Label\)/u);
  assert.doesNotMatch(clientSource, /t\((?:entry|reply|impulse)\.advisorName/u);
  assert.match(clientSource, /titleKind="identity"/u);
  assert.match(clientSource, /titleKind === "identity" \? title/u);
});
