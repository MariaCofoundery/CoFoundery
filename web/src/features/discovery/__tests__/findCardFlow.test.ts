import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = (path: string) =>
  readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "src/app/(product)/discovery/profile/page.tsx";
const FLOW = "src/features/discovery/FindCardFlow.tsx";

test("das Formular bleibt eines: Karten werden versteckt, nicht entfernt", () => {
  const flow = code(FLOW);
  assert.match(flow, /hidden=\{position !== index\}/);
  assert.match(flow, /\{card\.node\}/);
  // Ein verstecktes Pflichtfeld würde den Browser ratlos lassen: geprüft wird auf dem Server.
  assert.match(code(PAGE), /<form action=\{saveProfileDraft\} noValidate/);
});

test("Speichern und Veröffentlichen laufen über dieselben Aktionen wie vorher", () => {
  const page = code(PAGE);
  assert.match(page, /formAction=\{publishProfileFromForm\}/);
  assert.match(page, /formAction=\{saveDraftAndLeave\.bind\(null, "\/connect\/problems"\)\}/);
  assert.match(page, /<form action=\{pauseProfile\}/);
});

test("die Pflicht-Box spiegelt die Regeln des Servers, und Veröffentlichen ist gesperrt, solange etwas fehlt", () => {
  const flow = code(FLOW);
  const server = code("src/features/discovery/discoveryValidation.ts");
  const rules = server.slice(server.indexOf("export function getDiscoveryProfilePublishIssues"));
  for (const key of ["ownRoles", "seekingRoles", "availability", "commitment", "ventureStage", "ventureGoal"]) {
    assert.match(flow, new RegExp(`issues\\.push\\("${key}"\\)`), `${key} fehlt in der Pflicht-Box`);
    assert.match(rules, new RegExp(`issues\\.push\\("${key}"\\)`), `${key} fehlt im Server`);
  }
  assert.match(flow, /exploring/);
  assert.match(flow, /undecided/);
  assert.match(flow, /<fieldset disabled=\{missing\.length > 0\}/);
  // Speichern ist nie gesperrt.
  assert.match(flow, /\{saveNode\}\s*<fieldset/);
});

test("Name und Headline kommen aus dem Kernprofil, nicht aus dem leeren Formularstand", () => {
  const page = code(PAGE);
  assert.match(page, /core\?\.display_name \?\? ""\)\.trim\(\)\.length < 2/);
  assert.match(page, /core\?\.headline \?\? ""\)\.trim\(\)\.length < 3/);
});

test("nach Speichern oder abgewiesenem Veröffentlichen landet man auf der letzten Karte", () => {
  const page = code(PAGE);
  assert.match(page, /params\.publishError,[\s\S]*?\? 5\s*: 0/);
});
