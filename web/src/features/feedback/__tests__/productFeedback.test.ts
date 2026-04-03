import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeProductFeedbackSubmission,
} from "@/features/feedback/productFeedback";

test("product feedback sanitization requires the three core answers", () => {
  const result = sanitizeProductFeedbackSubmission({
    source: "nav",
    q1Value: "  ",
    q2Value: "hilfreich",
    q3Value: "",
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.deepEqual(result.fields, ["q1Value", "q3Value"]);
});

test("product feedback sanitization keeps optional other text only for anderes", () => {
  const result = sanitizeProductFeedbackSubmission({
    source: "workbook",
    invitationId: " invite-1 ",
    q1Value: "Wertvoll war die Gegenueberstellung.",
    q2Value: "Die Sprache war an zwei Stellen zu dicht.",
    q3Value: "Noch klarere Naechste-Schritte-Regeln.",
    q4Choice: "anderes",
    q4OtherText: "Mehr Hilfe bei Priorisierung.",
    q5Text: "Danke.",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.invitationId, "invite-1");
  assert.equal(result.value.q4Choice, "anderes");
  assert.equal(result.value.q4OtherText, "Mehr Hilfe bei Priorisierung.");
  assert.equal(result.value.q5Text, "Danke.");
});

test("product feedback sanitization drops stray other text for non-other choice", () => {
  const result = sanitizeProductFeedbackSubmission({
    source: "nav",
    q1Value: "Moment",
    q2Value: "Zu kompliziert war der Einstieg.",
    q3Value: "Weniger Text.",
    q4Choice: "entscheidungen_treffen",
    q4OtherText: "Should disappear",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.q4Choice, "entscheidungen_treffen");
  assert.equal(result.value.q4OtherText, null);
});
