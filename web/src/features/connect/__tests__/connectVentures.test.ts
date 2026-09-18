import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { VENTURE_MAX } from "@/features/connect/connectTypes";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const MIGRATION = "../supabase/migrations/20260929120000_create_network_ventures.sql";

test("a venture is an attachment to the person, not a third content type", () => {
  const migration = source(MIGRATION);
  // Kein Ablaufdatum, kein eigener Kontaktweg, keine eigene Sichtbarkeit -
  // sonst haette es Anzeige und Problem in allem verdoppelt.
  assert.doesNotMatch(migration, /expires_at/);
  assert.doesNotMatch(migration, /visibility text/);
  assert.doesNotMatch(migration, /contact_request|problem_interest/);

  // Und es taucht in keiner gespeicherten Suche als vierte Sorte auf.
  const matcher = source("src/features/connect/savedSearchMatching.ts");
  assert.doesNotMatch(matcher, /venture/i);
});

test("the audience is its own field, because that is what gets passed on", () => {
  const migration = source(MIGRATION);
  assert.match(migration, /audience text not null/);
  assert.match(migration, /char_length\(btrim\(audience\)\) between 20 and 300/);

  // Abgesetzt dargestellt, nicht im Fliesstext: Wer sie ueberfliegen kann,
  // kann jemanden weiterempfehlen.
  for (const file of [
    "src/features/connect/ConnectVentureForm.tsx",
    "src/app/(product)/connect/ventures/page.tsx",
    "src/app/(public-connect)/connect/p/[publicSlug]/page.tsx",
  ]) {
    assert.match(source(file), /border-violet-400/, `${file}: die Zielgruppe steht abgesetzt`);
  }
});

test("five is enforced by the database, not by the form", () => {
  const migration = source(MIGRATION);
  // Eine Check-Bedingung kann nicht ueber Zeilen hinweg zaehlen - ohne den
  // Trigger waere die Grenze nur eine Bitte in der Oberflaeche.
  assert.match(migration, /create or replace function public\.enforce_network_venture_limit/);
  assert.match(migration, />= 5 then/);
  assert.match(migration, /raise exception 'network_venture_limit_reached'/);
  assert.equal(VENTURE_MAX, 5);

  const actions = codeOnly("src/features/connect/connectVentureActions.ts");
  assert.match(actions, /venture_limit_reached.*\? "venture_limit"/);
});

test("visibility follows the profile, so there is no fourth switch", () => {
  const migration = source(MIGRATION);
  const fn = migration.slice(
    migration.indexOf("create or replace function public.list_public_network_profile_ventures")
  );
  assert.match(fn, /profile\.visibility = 'public'/);
  assert.match(fn, /venture\.status = 'active'/);

  const form = source("src/features/connect/ConnectVentureForm.tsx");
  assert.doesNotMatch(form, /name="visibility"/, "kein eigener Sichtbarkeitsschalter");
});

test("the logo reuses the existing bucket, policy and pattern", () => {
  const migration = source(MIGRATION);
  // Ein zweiter Speicher haette dieselbe Frage ein zweites Mal zu beantworten
  // verlangt - und die zweite Antwort waere irgendwann von der ersten
  // abgewichen.
  assert.match(migration, /create or replace function public\.can_read_network_profile_photo/);
  assert.match(migration, /venture\.logo_path = p_object_name/);

  const actions = codeOnly("src/features/connect/connectVentureActions.ts");
  assert.match(actions, /const BUCKET = "network-profile-images"/);
  // Eine Pruefung fuer beide Bildsorten statt zweier Kopien.
  assert.match(actions, /decodePhotoData/);
  assert.match(
    codeOnly("src/features/connect/connectActions.ts"),
    /import \{ decodePhotoData \}/,
    "die Profilfotos nutzen dieselbe"
  );
});

test("deleting an entry takes its logo with it", () => {
  const actions = codeOnly("src/features/connect/connectVentureActions.ts");
  const deleteAt = actions.indexOf("export async function deleteConnectVentureAction");
  const block = actions.slice(deleteAt);
  const lookupAt = block.indexOf('select("logo_path")');
  const removeAt = block.indexOf(".delete()");
  // Erst den Pfad holen, dann loeschen: Danach ist er nicht mehr auffindbar
  // und die Datei bliebe fuer immer liegen.
  assert.ok(lookupAt > -1 && lookupAt < removeAt, "der Pfad wird vor dem Loeschen gelesen");
  assert.match(block, /storage\.from\(BUCKET\)\.remove\(\[logoPath\]\)/);
});

test("every new key exists in German and English", () => {
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/connect.json`);
    const ventures = messages.ventures as Record<string, string>;
    for (const key of [
      "title",
      "audience",
      "audienceHint",
      "motivation",
      "motivationHint",
      "limitReached",
      "profileLink",
    ]) {
      assert.equal(typeof ventures[key], "string", `${locale}: ventures.${key} fehlt`);
    }
    const errors = messages.errors as Record<string, string>;
    for (const key of ["venture_name", "venture_what", "venture_audience", "venture_limit"]) {
      assert.equal(typeof errors[key], "string", `${locale}: errors.${key} fehlt`);
    }
  }
});
