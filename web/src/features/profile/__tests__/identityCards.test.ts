import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = (path: string) =>
  readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

const EDITOR = "src/features/profile/IdentityEditor.tsx";
const FLOW = "src/features/profile/IdentityCardFlow.tsx";

test("das Formular bleibt eines, gespeichert wird mit derselben Aktion", () => {
  const editor = code(EDITOR);
  assert.match(editor, /<form action=\{saveIdentityAction\}/);
  // Alle Felder sind weiterhin da - die Karten blenden nur aus.
  for (const name of ["display_name", "headline", "bio", "location_region", "remote_mode", "expertise", "industries", "roles"]) {
    assert.match(editor, new RegExp(`name="${name}"`), `${name} fehlt`);
  }
  assert.match(editor, /<LinkedInField/);
  assert.match(editor, /<CvImportField/);
});

test("die Karten sind ein Zusatz: nur mit `cards`, und nur im eigenen Profil, nicht eingebettet", () => {
  const editor = code(EDITOR);
  assert.match(editor, /cards = false/);
  assert.match(editor, /cards \? <div data-card=\{id\}>/);
  // Die eingebetteten Fassungen (Find, Connect) übergeben cards nicht.
  for (const path of ["src/features/profile/IdentityInlineCard.tsx"]) {
    assert.doesNotMatch(code(path), /\bcards\b/);
  }
  assert.match(code("src/app/(product)/profile/page.tsx"), /<IdentityEditor\s+cards/);
});

test("Ausblenden per Regel am Rahmen, Speichern auf jeder Karte, keine Prozente", () => {
  const flow = code(FLOW);
  assert.match(flow, /data-active=\{ids\[index\]\}/);
  assert.match(flow, /\{saveNode\}/);
  assert.doesNotMatch(flow, /role="progressbar"|percent|\d\s*%/);
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.idcards \[data-card\] \{ display: none; \}/);
  for (const id of ["who", "where", "what", "links", "roles"]) {
    assert.ok(css.includes(`.idcards[data-active="${id}"] [data-card="${id}"]`), `${id}: Regel fehlt`);
  }
});

test("die Rolle bleibt hinter ihrem Tor: nur wer schon eine hat, sieht die Karte", () => {
  const editor = code(EDITOR);
  assert.match(editor, /currentRoles\.length > 0 \? \(\["roles"\] as const\) : \[\]/);
  assert.match(editor, /currentRoles\.length > 0 \? group\("roles"/);
});

test("deutsch und englisch haben dieselben Schlüssel", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  const de = JSON.parse(readFileSync("messages/de/capability.json", "utf8")).identity.cards;
  const en = JSON.parse(readFileSync("messages/en/capability.json", "utf8")).identity.cards;
  assert.deepEqual(keys(de).sort(), keys(en).sort());
});
