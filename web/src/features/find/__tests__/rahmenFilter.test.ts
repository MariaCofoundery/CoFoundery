import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getDiscoverySearchBriefCriteria } from "@/features/discovery/discoveryPresentation";
import { normalizeMustHaves } from "@/features/discovery/discoveryValidation";
import {
  DISCOVERY_SEARCH_INTENTS,
  DISCOVERY_START_HORIZONS,
} from "@/features/discovery/discoveryTypes";

/**
 * Startzeitpunkt und Suchstatus als Suchkriterium (Spec, Abschnitt 5.1).
 *
 * Beides stand bis zum 30.09.2026 nur am Profil: Man konnte sagen, ab wann man
 * loslegen will, aber nicht danach suchen.
 *
 * Was in der Datenbank passiert, prueft `supabase/tests/search_by_frame.sql`.
 * Hier steht der Weg dorthin: Was ankommt, was davon weitergereicht wird, und
 * dass es auf dem Bildschirm zu sehen ist.
 */

test("nur die bekannten Werte kommen durch", () => {
  // Eine Kennung, die es nicht gibt, waere ein Filter, der nie etwas findet -
  // und die suchende Person saehe eine leere Liste ohne Grund.
  const kriterien = normalizeMustHaves({
    acceptedSearchIntents: ["ready_now", "vielleicht_irgendwann", "open_later"],
    acceptedStartHorizons: ["now", "naechstes_jahrzehnt"],
  });

  assert.deepEqual(kriterien.acceptedSearchIntents, ["ready_now", "open_later"]);
  assert.deepEqual(kriterien.acceptedStartHorizons, ["now"]);
});

test("leer ist der Ausgangszustand und kein Fehler", () => {
  const leer = normalizeMustHaves(null);
  assert.deepEqual(leer.acceptedSearchIntents, []);
  assert.deepEqual(leer.acceptedStartHorizons, []);
});

test("die Datenbankfassung derselben Felder wird auch gelesen", () => {
  // Gespeichert wird JSON aus dem Browser, gelesen wird auch, was eine
  // Migration in Unterstrichen hineingeschrieben hat.
  const kriterien = normalizeMustHaves({
    accepted_search_intents: ["actively_exploring"],
    accepted_start_horizons: ["next_3_months"],
  });
  assert.deepEqual(kriterien.acceptedSearchIntents, ["actively_exploring"]);
  assert.deepEqual(kriterien.acceptedStartHorizons, ["next_3_months"]);
});

test("jedes Kriterium, das die Liste kuerzt, steht auch in der Zusammenfassung", () => {
  // EIN STILL WIRKENDER FILTER IST DERSELBE FEHLER WIE EINE FEHLERMELDUNG
  // OHNE GRUND: Man sieht weniger Menschen und weiss nicht, warum.
  const kriterien = normalizeMustHaves({
    acceptedSearchIntents: ["ready_now"],
    acceptedStartHorizons: ["now"],
    requiredCapabilityAreasAny: ["b2b_sales"],
  });

  const schluessel = getDiscoverySearchBriefCriteria(kriterien).map((entry) => entry.key);
  assert.deepEqual(schluessel.sort(), ["capability", "searchIntent", "startHorizon"]);

  // Und ohne Kriterium steht dort nichts.
  assert.deepEqual(getDiscoverySearchBriefCriteria(normalizeMustHaves(null)), []);
});

test("was das Formular schickt, reicht die Suche an die Datenbank weiter", () => {
  const aktionen = readFileSync(
    join("src", "features", "discovery", "discoveryActions.ts"),
    "utf8",
  );
  const daten = readFileSync(join("src", "features", "discovery", "discoveryData.ts"), "utf8");

  // Die Feldnamen im Formular, im Speichern und im Aufruf sind dieselbe Kette.
  // Reisst sie an einer Stelle, kreuzt man etwas an und nichts passiert.
  const formular = readFileSync(
    join("src", "features", "find", "PracticalSearchForm.tsx"),
    "utf8",
  );
  for (const feld of ["acceptedSearchIntents", "acceptedStartHorizons"]) {
    assert.match(formular, new RegExp(`name="${feld}"`), `Formular: ${feld}`);
    assert.match(aktionen, new RegExp(`getStringList\\(formData, \\["${feld}"\\]\\)`), feld);
    assert.match(daten, new RegExp(`${feld}: practicalMustHaves.${feld}`), feld);
  }
  assert.match(daten, /p_search_intents: mustHaves\.acceptedSearchIntents/);
  assert.match(daten, /p_start_horizons: mustHaves\.acceptedStartHorizons/);
});

test("jeder Wert ist in beiden Sprachen beschriftet", () => {
  // Ein Kaestchen ohne Beschriftung waere seine Kennung -
  // "later_or_flexible" zum Ankreuzen.
  for (const locale of ["de", "en"]) {
    const discovery = JSON.parse(
      readFileSync(join("messages", locale, "discovery.json"), "utf8"),
    ) as {
      searchIntents: Record<string, { short: string; long: string }>;
      startHorizons: Record<string, { short: string; long: string }>;
    };
    for (const intent of DISCOVERY_SEARCH_INTENTS) {
      assert.ok(discovery.searchIntents[intent]?.short?.trim(), `${locale}/${intent}`);
    }
    for (const horizon of DISCOVERY_START_HORIZONS) {
      assert.ok(discovery.startHorizons[horizon]?.short?.trim(), `${locale}/${horizon}`);
      assert.ok(discovery.startHorizons[horizon]?.long?.trim(), `${locale}/${horizon}`);
    }

    const find = JSON.parse(readFileSync(join("messages", locale, "find.json"), "utf8"))
      .search as Record<string, string>;
    for (const schluessel of [
      "searchIntent",
      "searchIntentHelp",
      "startHorizon",
      "startHorizonHelp",
    ]) {
      assert.ok(find[schluessel]?.trim(), `${locale}/${schluessel}`);
    }
  }
});

test("die Migration und der Aufruf kennen dieselben Namen", () => {
  const migration = readFileSync(
    join("..", "supabase", "migrations", "20261091120000_search_by_frame.sql"),
    "utf8",
  );
  assert.match(migration, /p_search_intents text\[\] default/);
  assert.match(migration, /p_start_horizons text\[\] default/);

  // Leer heisst kein Kriterium - sonst saehe niemand mehr irgendwen, bevor
  // er das erste Kaestchen ankreuzt.
  assert.match(migration, /coalesce\(cardinality\(p_search_intents\), 0\) = 0/);
  assert.match(migration, /coalesce\(cardinality\(p_start_horizons\), 0\) = 0/);
});
