import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..", "..", "..", "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("Das Foto geht nicht mehr still verloren, wenn es noch keine Zeile in profiles gibt", () => {
  const actions = read("src/features/profile/photoActions.ts");
  // Ein update ohne passende Zeile ist kein Fehler: Es wird gezaehlt, und ohne Zeile angelegt.
  assert.match(actions, /\.update\(werte, \{ count: "exact" \}\)/);
  assert.match(actions, /insert\(\{ user_id: userId, roles: \[\], \.\.\.werte \}\)/);
  // Leere Rollen: Die Voreinstellung der Spalte ist 'founder' und wuerde ein Connect-Konto zum Founder-Konto machen.
  assert.doesNotMatch(actions, /insert\(\{ user_id: userId, \.\.\.werte \}\)/);
  // Beide Wege (Illustration und eigenes Bild) schreiben ueber denselben Helfer.
  assert.equal((actions.match(/await bildSpeichern\(/g) ?? []).length, 2);
});

test("Der Rueckweg kommt aus dem Formular und wird gegen die Allowlist geprueft, nicht aus geteiltem Zustand", () => {
  const actions = read("src/features/profile/photoActions.ts");
  assert.match(actions, /parseIdentityReturnPath\(formData\.get\("next"\)\)/);
  assert.doesNotMatch(actions, /^let rueckweg/m);
  assert.match(actions, /function zurueck\(query: string, rueckweg: string \| null\): never/);
});

test("Wer ein Foto waehlt, speichert es damit: kein zweiter Knopf, den ein anderes Speichern ueberholt", () => {
  const field = read("src/features/profile/ProfilePhotoField.tsx");
  assert.match(field, /if \(etwasGewaehlt\) formularRef\.current\?\.requestSubmit\(\)/);
  assert.match(field, /<form action=\{saveProfilePhotoAction\} ref=\{formularRef\}>/);
  const editor = read("src/features/profile/IdentityEditor.tsx");
  assert.match(editor, /returnPath=\{inline \? returnPath : null\}/);
});

test("Auf Connect und FIND zeigt die Karte auch die Rueckmeldung zum Foto", () => {
  const card = read("src/features/profile/IdentityInlineCard.tsx");
  assert.match(card, /\["identity", "photo_usage", "photo", "photo_removed"\]/);
  for (const key of ["photo_save", "photo_empty", "photo_too_large"]) assert.match(card, new RegExp(`"${key}"`));
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(read(`messages/${locale}/capability.json`));
    for (const key of ["photo", "photo_removed"]) assert.ok(messages.success[key], `${locale}.success.${key}`);
    for (const key of ["photo_save", "photo_empty", "photo_too_large"]) assert.ok(messages.errors[key], `${locale}.errors.${key}`);
  }
});
