import assert from "node:assert/strict";
import test from "node:test";
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
