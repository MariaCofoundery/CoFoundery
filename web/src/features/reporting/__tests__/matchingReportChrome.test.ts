import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import deReport from "../../../../messages/de/report.json";
import enReport from "../../../../messages/en/report.json";
import { getReportContent } from "@/features/reporting/content/reportContent";
import {
  formatMatchingReportParticipantContext,
  normalizeMatchingReportText,
} from "@/features/reporting/matchingReportChrome";

const TECHNICAL_DIMENSION_KEY = "Unternehmenslogik";

test("English report text bypasses German normalization unchanged", () => {
  for (const word of ["does", "questions", "issues", "pursued", "Values"]) {
    assert.equal(normalizeMatchingReportText(word, "en"), word);
  }

  const sentence = "Values pursued through questions do not create issues by themselves.";
  assert.equal(normalizeMatchingReportText(sentence, "en"), sentence);
});

test("German report text retains the existing encoding normalization", () => {
  assert.equal(normalizeMatchingReportText("staerker abgestimmt", "de"), "stärker abgestimmt");
  assert.equal(
    normalizeMatchingReportText("Ma\u00c3\u0178 und \u00c3\u00bcber \u00e2\u20ac\u201c frueh", "de"),
    "Maß und über – früh"
  );
  assert.equal(normalizeMatchingReportText("staerker abgestimmt"), "stärker abgestimmt");
});

test("participant context follows report locale without changing founder names", () => {
  const participantAName = "Sue Questions";
  const participantBName = "Valües Founder";

  assert.equal(
    formatMatchingReportParticipantContext({
      participantAName,
      participantBName,
      teamContext: "existing_team",
      locale: "de",
    }),
    "Sue Questions und Valües Founder · Bestehendes Team"
  );
  assert.equal(
    formatMatchingReportParticipantContext({
      participantAName,
      participantBName,
      teamContext: "pre_founder",
      locale: "en",
    }),
    "Sue Questions and Valües Founder · Founder matching"
  );
});

test("dimension titles come from locale-aware report content", () => {
  assert.equal(
    getReportContent("de").dimensions[TECHNICAL_DIMENSION_KEY].canonicalName,
    "Unternehmenslogik"
  );
  assert.equal(
    getReportContent("en").dimensions[TECHNICAL_DIMENSION_KEY].canonicalName,
    "Company logic"
  );
});

test("participant messages stay parallel and use the same ICU placeholders", () => {
  const deView = deReport.view;
  const enView = enReport.view;
  const placeholders = (value: string) =>
    [...value.matchAll(/\{([A-Za-z0-9_]+)\}/gu)].map((match) => match[1]).sort();

  assert.deepEqual(Object.keys(deView).sort(), Object.keys(enView).sort());
  assert.deepEqual(
    Object.keys(deView.teamContexts).sort(),
    Object.keys(enView.teamContexts).sort()
  );
  assert.deepEqual(
    placeholders(deView.participantContext),
    placeholders(enView.participantContext)
  );
  assert.deepEqual(placeholders(deView.participantContext), [
    "participantA",
    "participantB",
    "teamContext",
  ]);

  for (const value of [
    deView.participantContext,
    enView.participantContext,
    ...Object.values(deView.teamContexts),
    ...Object.values(enView.teamContexts),
  ]) {
    assert.notEqual(value.trim(), "");
  }
});

test("the active report view does not render the raw dimension key or hardcoded context", () => {
  const viewSource = fs.readFileSync(
    path.resolve(process.cwd(), "src/features/reporting/FounderMatchingView.tsx"),
    "utf8"
  );

  assert.doesNotMatch(viewSource, /normalizeGermanText as t/u);
  assert.doesNotMatch(viewSource, /\{\s*[^}]*section\.dimension/u);
  assert.doesNotMatch(viewSource, /`\$\{participantAName\} und /u);
  assert.doesNotMatch(viewSource, /"Bestehendes Team"|"Founder-Matching"/u);
});
