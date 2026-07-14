import assert from "node:assert/strict";
import test from "node:test";
import { getSelfReportChrome } from "@/features/reporting/selfReportChrome";
import { resolveSelfReportLocale } from "@/features/reporting/selfReportLocale";

test("self report locale defaults to German", () => {
  assert.equal(resolveSelfReportLocale(undefined), "de");
  assert.equal(resolveSelfReportLocale(null), "de");
  assert.equal(resolveSelfReportLocale(""), "de");
});

test("self report locale accepts English and normalizes regional locales", () => {
  assert.equal(resolveSelfReportLocale("en"), "en");
  assert.equal(resolveSelfReportLocale("en-US"), "en");
  assert.equal(resolveSelfReportLocale("EN-gb"), "en");
});

test("self report locale falls back to German for unsupported locales", () => {
  assert.equal(resolveSelfReportLocale("fr"), "de");
  assert.equal(resolveSelfReportLocale("spanish"), "de");
});

test("self report chrome returns localized UI labels", () => {
  const de = getSelfReportChrome("de");
  const en = getSelfReportChrome("en");

  assert.equal(de.eyebrow, "Individueller Report");
  assert.equal(de.sections.corePattern, "1. Kernmuster");
  assert.equal(de.labels.baseCompleted, "Basisprofil abgeschlossen");

  assert.equal(en.eyebrow, "Individual report");
  assert.equal(en.sections.corePattern, "1. Core pattern");
  assert.equal(en.labels.baseCompleted, "Base profile complete");
});

test("self report chrome falls back to German for unsupported locales", () => {
  assert.deepEqual(getSelfReportChrome("fr"), getSelfReportChrome("de"));
});

test("English self report chrome avoids German UI remnants", () => {
  const chrome = getSelfReportChrome("en");
  const visibleText = JSON.stringify(chrome);

  assert.equal(
    /\b(?:Individueller|Kernmuster|Alltag|Werteprofil|Basisprofil|abgeschlossen|verfügbar|Bearbeitung|Typische|Achte)\b/i.test(
      visibleText
    ),
    false
  );
  assert.equal(/\b(?:perfect match|bad match|weak founder|diagnosis)\b/i.test(visibleText), false);
});
