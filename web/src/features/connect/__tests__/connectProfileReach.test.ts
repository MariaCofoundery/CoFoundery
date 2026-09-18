import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CONNECT_OPEN_TO_FORMATS } from "@/features/connect/connectTypes";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;
const sqlWithoutComments = (path: string) =>
  source(path)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");

const MIGRATION = "../supabase/migrations/20260928120000_connect_profile_reach_and_openness.sql";

test("the form of contact is a closed set, not free text", () => {
  // Vergleichbar, spaeter filterbar, und mit einem Klick beantwortet. Der
  // Satz daneben faengt auf, was die sechs nicht treffen.
  assert.deepEqual([...CONNECT_OPEN_TO_FORMATS], [
    "coffee",
    "walk",
    "video",
    "call",
    "sparring",
    "intro",
  ]);
  const migration = sqlWithoutComments(MIGRATION);
  assert.match(migration, /open_to_formats <@ array\['coffee','walk','video','call','sparring','intro'\]/);

  for (const locale of ["de", "en"]) {
    const profile = (readJson(`messages/${locale}/connect.json`).profile as Record<string, unknown>);
    const labels = profile.openTo as Record<string, string>;
    assert.deepEqual(Object.keys(labels).sort(), [...CONNECT_OPEN_TO_FORMATS].sort());
  }
});

test("all three are optional and never block publishing", () => {
  const migration = sqlWithoutComments(MIGRATION);
  assert.match(migration, /network_reach is null or/);
  assert.match(migration, /contact_note is null or/);

  // Keine neue Veroeffentlichungshuerde - Bestandsprofile waeren sonst
  // unsichtbar geworden.
  const publishable = source("src/features/connect/connectValidation.ts");
  const fn = publishable.slice(publishable.indexOf("export function profilePublishable"));
  assert.doesNotMatch(fn.slice(0, 400), /network_reach|contact_note|open_to_formats/);
});

test("starting to write and changing your mind is not an error", () => {
  const validation = source("src/features/connect/connectValidation.ts");
  // Unter der Mindestlaenge wird daraus null statt einer Fehlermeldung. Sonst
  // haengt jemand an einem freiwilligen Feld fest.
  assert.match(validation, /function optionalLongText\(value: FormDataEntryValue \| null, min: number, max: number\)/);
  assert.match(validation, /trimmed\.length >= min \? trimmed : null/);
});

test("they stay inside: the public projection does not carry them", () => {
  // Auf einer von Google erfassten Seite waere "ich kenne Menschen bei X" eine
  // Aussage ueber Dritte - und "offen fuer Spaziergaenge" neben Name und
  // Region ist mehr, als fuers Gefundenwerden noetig ist.
  const publicRpc = source(
    "../supabase/migrations/20260904140000_create_network_public_visibility_v01.sql"
  );
  const fn = publicRpc.slice(
    publicRpc.indexOf("create or replace function public.get_public_network_profile"),
    publicRpc.indexOf("create or replace function public.list_public_network_profile_listings")
  );
  assert.doesNotMatch(fn, /network_reach|open_to_formats|contact_note/);

  const publicPage = source("src/app/(public-connect)/connect/p/[publicSlug]/page.tsx");
  assert.doesNotMatch(publicPage, /network_reach|open_to_formats|contact_note/);

  // Und der Hinweis im Formular sagt es auch.
  for (const locale of ["de", "en"]) {
    const profile = readJson(`messages/${locale}/connect.json`).profile as Record<string, string>;
    assert.equal(typeof profile.membersOnlyNote, "string");
  }
});

test("they are shown where the decision to write is made", () => {
  const listing = source("src/app/(product)/connect/listings/[listingId]/page.tsx");
  for (const field of ["open_to_formats", "network_reach", "contact_note"]) {
    assert.match(listing, new RegExp(`profile\\.${field}`), `${field} fehlt an der Anzeige`);
  }
});
