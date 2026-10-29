import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const code = (path: string) =>
  readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

const EDITOR = "src/features/profile/IdentityEditor.tsx";
const FLOW = "src/features/profile/IdentityCardFlow.tsx";

test("das Formular bleibt eines, gespeichert wird mit derselben Aktion", () => {
  const editor = code(EDITOR);
  assert.match(editor, /<form id="identity-form" action=\{saveIdentityAction\}/);
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
  assert.doesNotMatch(code("src/features/profile/IdentityInlineCard.tsx"), /\bcards\b/);
  const page = code("src/app/(product)/profile/page.tsx");
  assert.match(page, /<IdentityEditor\s+cards/);
  assert.match(page, /<IdentityCardFlow\s+ids=\{identityCardIds\}/);
});

test("Foto, Identität und Interessen bleiben drei Formulare mit drei Aktionen; Speichern gilt nur dem Identitätsformular", () => {
  const flow = code(FLOW);
  // Der Rahmen steht außerhalb der Formulare und verweist per form-Attribut auf das Identitätsformular.
  assert.match(flow, /type="submit" form=\{formId\}/);
  assert.match(flow, /FORM_CARDS: IdentityCardId\[\] = \["who", "where", "what", "links", "roles"\]/);
  assert.doesNotMatch(flow, /<form\b/);
  assert.match(code(EDITOR), /<form id="identity-form" action=\{saveIdentityAction\}/);
  const page = code("src/app/(product)/profile/page.tsx");
  assert.match(page, /<div data-card="interests">\s*<InterestsCard/);
});

test("Ausblenden per Regel am Rahmen, keine Prozente", () => {
  const flow = code(FLOW);
  assert.match(flow, /data-active=\{active\}/);
  assert.doesNotMatch(flow, /role="progressbar"|percent|\d\s*%/);
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.idcards \[data-card\] \{ display: none; \}/);
  for (const id of ["who", "where", "what", "links", "roles", "photo", "interests"]) {
    assert.ok(css.includes(`.idcards[data-active="${id}"] [data-card="${id}"]`), `${id}: Regel fehlt`);
  }
});

test("die Rolle bleibt hinter ihrem Tor: nur wer schon eine hat, sieht die Karte", () => {
  assert.match(code(EDITOR), /currentRoles\.length > 0 \? group\("roles"/);
  assert.match(code("src/app/(product)/profile/page.tsx"), /currentRoles\.length > 0 \? \(\["roles"\] as const\) : \[\]/);
});

test("deutsch und englisch haben dieselben Schlüssel", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  const de = JSON.parse(readFileSync("messages/de/capability.json", "utf8")).identity.cards;
  const en = JSON.parse(readFileSync("messages/en/capability.json", "utf8")).identity.cards;
  assert.deepEqual(keys(de).sort(), keys(en).sort());
});
