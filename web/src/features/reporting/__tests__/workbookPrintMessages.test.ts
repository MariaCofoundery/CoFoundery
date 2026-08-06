import assert from "node:assert/strict";
import test from "node:test";
import deWorkbook from "../../../../messages/de/workbook.json";
import enWorkbook from "../../../../messages/en/workbook.json";

type MessageValue = string | { [key: string]: MessageValue };

function flattenMessages(value: MessageValue, prefix = ""): Record<string, string> {
  if (typeof value === "string") {
    return { [prefix]: value };
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) =>
      Object.entries(flattenMessages(child, prefix ? `${prefix}.${key}` : key))
    )
  );
}

function placeholders(value: string) {
  return [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort();
}

test("workbook print messages provide central German and English labels", () => {
  assert.equal(deWorkbook.print.unavailableTitle, "Druckversion aktuell noch nicht verfügbar");
  assert.equal(deWorkbook.print.sharedAgreement, "Gemeinsame Vereinbarung");
  assert.equal(enWorkbook.print.unavailableTitle, "Print version is not available yet");
  assert.equal(enWorkbook.print.sharedAgreement, "Shared agreement");
});

test("workbook print messages keep keys and placeholders aligned", () => {
  const de = flattenMessages(deWorkbook.print);
  const en = flattenMessages(enWorkbook.print);

  assert.deepEqual(Object.keys(en).sort(), Object.keys(de).sort());
  for (const key of Object.keys(de)) {
    assert.notEqual(de[key]?.trim(), "", `German message ${key} must not be empty`);
    assert.notEqual(en[key]?.trim(), "", `English message ${key} must not be empty`);
    assert.deepEqual(placeholders(en[key]), placeholders(de[key]), `Placeholders differ for ${key}`);
  }
});

test("representative English print chrome contains no known German remnants", () => {
  const englishPrintChrome = Object.values(flattenMessages(enWorkbook.print)).join(" ");

  assert.doesNotMatch(
    englishPrintChrome,
    /\b(?:Zurück|Datum|Schritt|Warum|Gespräch|Vereinbarung|Rückfragen|geklärt)\b/i
  );
});
