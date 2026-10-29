import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = (path: string) =>
  readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

const OVERVIEW = "src/features/profile/FreigabenOverview.tsx";

test("die Übersicht liest und verlinkt nur: kein Formular, keine Aktion, kein Sammelschalter", () => {
  const src = code(OVERVIEW);
  assert.doesNotMatch(src, /<form|action=|use server|\.update\(|\.upsert\(|\.rpc\(/);
  assert.doesNotMatch(src, /alle|all on|selectAll|toggleAll/i);
});

test("jede Freigabe hat ihren eigenen Ort zum Ändern", () => {
  const src = code(OVERVIEW);
  for (const href of [
    "/profile?step=identity", "#capability-disclosure", "#capability-matching", "/connections",
    "/discovery/profile", "/discovery/suche#workstyle", "/connect/profile", "/account",
  ]) {
    assert.ok(src.includes(`href: "${href}"`), `${href} fehlt`);
  }
});

test("die Übersicht steht im Schritt Freigaben, und die Anker gibt es", () => {
  const page = code("src/app/(product)/profile/page.tsx");
  assert.match(page, /\{freigaben \? <FreigabenOverview data=\{freigaben\} \/> : null\}/);
  assert.match(page, /<form id="capability-disclosure"/);
  assert.match(page, /<div id="capability-matching"/);
  // Nur im Schritt gelesen.
  assert.match(page, /step === "sichtbarkeit"\s*\? await Promise\.all\(/);
});

test("Texte vorhanden, deutsch und englisch gleich, und der Reiter heißt Freigaben", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  const de = JSON.parse(readFileSync("messages/de/capability.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/capability.json", "utf8"));
  assert.deepEqual(keys(de.freigaben).sort(), keys(en.freigaben).sort());
  assert.equal(de.profileTabs.visibility, "Freigaben");
  assert.equal(en.profileTabs.visibility, "Sharing");
});
