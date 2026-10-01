import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { CONNECT_BIO_MAX } from "@/features/connect/connectTypes";
import { parseConnectProfile } from "@/features/connect/connectValidation";
import { DISCOVERY_TEXT_LIMITS } from "@/features/discovery/discoveryConfig";

const source = (path: string) => readFileSync(path, "utf8");

/**
 * Die Bio wird nirgends mehr gekürzt.
 *
 * ---------------------------------------------------------------------------
 * DER GEMESSENE VERLUST
 * ---------------------------------------------------------------------------
 *
 * Bestandsaufnahme v2, Abschnitt 4.2, gegen die lokale Datenbank gemessen:
 *
 *     person_core.bio  1000 Zeichen
 *     Connect-Profil speichern
 *     person_core.bio   800 Zeichen
 *
 * Zwei Ursachen. Connect kappte auf 800 — in `connectValidation.ts` und in
 * der Bedingung `network_profiles_text_check`. Und der Rück-Trigger schrieb
 * den gekürzten Wert in den Kern zurück.
 *
 * Migration 20261092120000 hat beides behoben. Diese Datei hält fest, dass
 * die drei Grenzen dieselbe Zahl tragen — sobald eine kleiner ist, kürzt sie
 * wieder für alle, weil die Bio aus dem Kern kommt und die Kontextzeile eine
 * Kopie ist.
 */

test("Connect, FIND und der Kern erlauben dieselbe Bio-Laenge", () => {
  assert.equal(CONNECT_BIO_MAX, 1200);
  assert.equal(DISCOVERY_TEXT_LIMITS.bio, CONNECT_BIO_MAX, "FIND weicht ab");

  // Der Kern: das Eingabefeld und die Aktion dahinter.
  const seite = source(join("src", "app", "(product)", "profile", "page.tsx"));
  assert.match(seite, /name="bio"[^>]*maxLength=\{1200\}/);
  const aktion = source(join("src", "features", "profile", "personCoreActions.ts"));
  assert.match(aktion, /parseText\(formData\.get\("bio"\), 1200\)/);
});

test("eine 1200-Zeichen-Bio kommt ungekuerzt durch die Connect-Pruefung", () => {
  const bio = "x".repeat(1200);
  const geprueft = parseConnectProfile(new FormData(), {
    display_name: "Maria",
    headline: "Baut Dinge",
    bio,
    location_region: "Berlin",
    remote_mode: "remote",
    expertise: [],
    industries: [],
  });
  assert.equal(geprueft.bio.length, 1200, "Connect kuerzt die Bio wieder");
  assert.equal(geprueft.bio, bio);
});

test("die Datenbank laesst dieselben 1200 Zeichen zu", () => {
  const migration = source(
    join("..", "supabase", "migrations", "20261092120000_person_core_is_the_source.sql"),
  );
  assert.match(migration, /char_length\(bio\) <= 1200/);
});

test("die Kontextzeilen schreiben die Identitaet nicht mehr in den Kern", () => {
  const migration = source(
    join("..", "supabase", "migrations", "20261092120000_person_core_is_the_source.sql"),
  );

  // Connect und FIND: ganz weg.
  assert.match(migration, /drop function if exists public\.sync_person_core_from_connect_profile/);
  assert.match(migration, /drop function if exists public\.sync_person_core_from_discovery_profile/);

  // Das Basisprofil: verkleinert auf den Namen. Fuenf Stellen schreiben
  // `profiles.display_name`, ohne ueber den Kern zu gehen - ohne diesen Weg
  // haette jemand nach dem Einstieg keinen Namen im Kern.
  assert.match(migration, /create or replace function public\.sync_person_core_from_profiles/);
  assert.ok(
    !/insert into public\.person_core as core \(user_id, display_name, headline\)/.test(migration),
    "das Basisprofil traegt weiterhin die Headline in den Kern",
  );
});
