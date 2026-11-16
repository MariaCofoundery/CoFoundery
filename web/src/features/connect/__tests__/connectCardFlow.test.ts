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
  for (const name of ["network_roles", "open_to_formats", "suggestable", "highlightable", "contact_note"]) {
    assert.match(page, new RegExp(`name="${name}"`), `${name} fehlt`);
  }
  assert.match(page, /<ConnectVisibilityField/);
  // "Wen kennst du?" steht nicht mehr im Formular, sondern als Tueren daneben (eigene Formulare).
  assert.match(page, /<DoorsSection/);
  assert.doesNotMatch(page, /name="network_reach"/);
  // Keine Zustimmung wird aus einer anderen abgeleitet.
  assert.doesNotMatch(code(FLOW), /suggestable|highlightable|visibility|confirm_public/);
});

test("die Pflicht-Box entspricht profilePublishable, und Veröffentlichen ist gesperrt, solange etwas fehlt", () => {
  const flow = code(FLOW);
  // Serverregel: Name >= 2, Headline >= 3, mindestens eine Rolle. Der Text ueber dich ist seit 20270430 freiwillig.
  assert.match(code("src/features/connect/connectValidation.ts"), /display_name\.length >= 2 && p\.headline\.length >= 3 && p\.network_roles\.length > 0/);
  assert.match(flow, /getAll\("network_roles"\)\.length === 0/);
  assert.match(code(PAGE), /getConnectIdentityGaps\(core\)/);
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

test("das erste Anlegen: drei Pflichtdinge, Eingabetaste veröffentlicht nie, Name und Zeile gehen nur gezielt in den Kern", () => {
  const first = code("src/features/connect/ConnectFirstProfile.tsx");
  assert.match(first, /name === "identity_display_name"|name="identity_display_name"/);
  assert.match(first, /name="identity_headline"/);
  assert.match(first, /name="network_roles"/);
  // Der Entwurf steht im Dokument vor dem Veröffentlichen.
  assert.ok(first.indexOf("{draftNode}") < first.indexOf("{publishNode}"));
  assert.match(first, /<fieldset disabled=\{missing\.length > 0\}/);
  // Die zwei Schalter für Vorschläge und Highlights stehen unter "Weitere Einstellungen", nicht im Hauptweg.
  assert.match(first, /<details[\s\S]*moreNode/);
  const actions = code("src/features/connect/connectActions.ts");
  assert.match(actions, /corePatch\.display_name = nameIn/);
  assert.match(actions, /corePatch\.headline = headlineIn/);
  assert.doesNotMatch(actions, /corePatch\.bio|corePatch\.location_region/, "nur Name und Zeile");
  const page = code(PAGE);
  assert.match(page, /const firstFlow = !profile \|\| profile\.status !== "active"/);
  assert.match(page, /firstFlow \? null : <IdentityInlineCard/);
});

test("deutsch und englisch haben dieselben Schlüssel für das erste Anlegen", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  for (const part of ["first", "done"]) {
    const de = JSON.parse(readFileSync("messages/de/connect.json", "utf8")).profile[part];
    const en = JSON.parse(readFileSync("messages/en/connect.json", "utf8")).profile[part];
    assert.deepEqual(keys(de).sort(), keys(en).sort());
  }
});
