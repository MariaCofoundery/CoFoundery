import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * Erst die Zeilenkommentare, dann die Blockkommentare: Ein Zeilenkommentar darf
 * "messages/*" enthalten (die Seite tut es), ohne dass das als Beginn eines
 * Blockkommentars gelesen wird und den Rest der Datei verschluckt.
 */
const code = (path: string) =>
  readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

const PAGE = "src/app/(product)/connect/profile/page.tsx";
const FLOW = "src/features/connect/ConnectCardFlow.tsx";

test("das Formular bleibt eines: Karten werden versteckt, nicht entfernt", () => {
  assert.match(code(FLOW), /hidden=\{position !== index\}/);
  assert.match(code(PAGE), /<form action=\{saveConnectProfileAction\} noValidate/);
});

test("alle bisherigen Felder und Zustimmungen sind noch im Formular, jede für sich", () => {
  const page = code(PAGE);
  for (const name of ["network_roles", "network_reach", "open_to_formats", "suggestable", "highlightable", "contact_note"]) {
    assert.match(page, new RegExp(`name="${name}"`), `${name} fehlt`);
  }
  assert.match(page, /<ConnectVisibilityField/);
  // Keine Zustimmung wird aus einer anderen abgeleitet.
  assert.doesNotMatch(code(FLOW), /suggestable|highlightable|visibility|confirm_public/);
});

test("die Pflicht-Box entspricht profilePublishable, und Veröffentlichen ist gesperrt, solange etwas fehlt", () => {
  const flow = code(FLOW);
  // Serverregel: Name >= 2, Headline >= 3, Text >= 20, mindestens eine Rolle.
  assert.match(code("src/features/connect/connectValidation.ts"), /display_name\.length >= 2 && p\.headline\.length >= 3 && p\.bio\.length >= 20 && p\.network_roles\.length > 0/);
  assert.match(flow, /getAll\("network_roles"\)\.length === 0/);
  assert.match(code(PAGE), /getIdentityGaps\(core\)/);
  assert.match(flow, /<fieldset disabled=\{missingCount > 0\}/);
  // Entwurf speichern ist nie gesperrt und steht vor dem Veröffentlichen.
  assert.match(flow, /\{draftNode\}\s*<fieldset/);
});

test("Speichern läuft über dieselbe Aktion, Veröffentlichen bleibt eine ausdrückliche Handlung", () => {
  const page = code(PAGE);
  assert.match(page, /intent="publish"/);
  assert.match(page, /intent="draft"/);
  assert.match(page, /saveConnectProfileAction/);
  // Nach Speichern oder Fehler landet man auf der letzten Karte.
  assert.match(page, /initialStep=\{saved \|\| errorKey \? 3 : 0\}/);
});

test("deutsch und englisch haben dieselben Schlüssel für die Reise", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  const de = JSON.parse(readFileSync("messages/de/connect.json", "utf8")).profile.flow;
  const en = JSON.parse(readFileSync("messages/en/connect.json", "utf8")).profile.flow;
  assert.deepEqual(keys(de).sort(), keys(en).sort());
});
