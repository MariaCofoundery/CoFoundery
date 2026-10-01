import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  RESOURCE_KINDS,
  RESOURCE_LABEL_MAX,
  RESOURCE_LABEL_MIN,
} from "@/features/ai/resourceExtraction";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const AKTIONEN = join("src", "features", "profile", "resourceActions.ts");
const ABSCHNITT = join("src", "features", "profile", "OwnResourcesSection.tsx");
const VORSCHLAEGE = join("src", "features", "ai", "ResourceProposalSection.tsx");
const SEITE = join("src", "app", "(product)", "profile", "page.tsx");
const LESEN = join("src", "app", "me", "profile", "page.tsx");

/**
 * Netzwerk, Zugänge und Angebote selbst eintragen.
 *
 * Die Tabelle konnte das von Anfang an — `origin` default 'self', `status`
 * default 'confirmed'. Was diese Zusagen festhalten, ist, dass die Anwendung
 * daran nichts verbiegt.
 */

test("die Tabelle bleibt, wie sie war - keine zweite Art, keine zweite Tabelle", () => {
  const aktionen = codeOnly(AKTIONEN);

  // Drei Arten, und keine vierte daneben.
  assert.deepEqual([...RESOURCE_KINDS], ["network", "access", "offer"]);
  assert.match(aktionen, /RESOURCE_KINDS as readonly string\[\]/);

  // Nur `person_resources` - kein eigener Speicher fuer eigene Eintraege.
  const tabellen = [...aktionen.matchAll(/\.from\("(\w+)"\)/g)].map((treffer) => treffer[1]);
  assert.deepEqual([...new Set(tabellen)], ["person_resources"]);
});

test("beim Anlegen werden drei Spalten geschrieben - origin und status nicht", () => {
  const aktionen = codeOnly(AKTIONEN);

  // `origin` default 'self' und `status` default 'confirmed' stehen in der
  // Datenbank. Sie hier zu wiederholen hiesse, dieselbe Entscheidung an zwei
  // Stellen zu pflegen - und die Zeilensicherheit laesst beim Einfuegen
  // ohnehin nur 'self' zu.
  const insert = /\.insert\(\{([^}]*)\}\)/.exec(aktionen)?.[1];
  assert.ok(insert, "kein Einfuegen gefunden");
  assert.match(insert, /user_id/);
  assert.match(insert, /kind/);
  assert.match(insert, /label/);
  assert.ok(!/origin|status/.test(insert), `origin oder status werden geschrieben: ${insert}`);
});

test("die Herkunft wird nie ueberschrieben", () => {
  // Ein stilles Ueberschreiben machte aus einem bestaetigten Modellvorschlag
  // rueckwirkend eine eigene Eingabe.
  const aktionen = codeOnly(AKTIONEN);
  const update = /\.update\(\{([^}]*)\}/.exec(aktionen)?.[1];
  assert.ok(update, "keine Aenderung gefunden");
  assert.ok(!/origin/.test(update), `die Herkunft steht in der Aenderung: ${update}`);

  // Und die Aenderung trifft nur eigene Eintraege: Ein bestaetigter
  // Modellvorschlag traegt sein Zitat, und das Zitat stuetzt genau seinen
  // Satz. Schriebe man den Satz um, staende daneben ein Beleg fuer etwas
  // anderes - entfernen laesst er sich nicht
  // (`person_resources_evidence_required`).
  assert.match(aktionen, /\.eq\("origin", "self"\)/);

  // Deshalb traegt auch nur ein eigener Eintrag einen Bearbeiten-Knopf.
  assert.match(codeOnly(ABSCHNITT), /resource\.origin === "self" \?/);
});

test("entfernen heisst entfernen", () => {
  const aktionen = codeOnly(AKTIONEN);

  // KEIN SOFT DELETE. `rejected` ist der Zustand eines VORSCHLAGS, den jemand
  // nicht wollte - er bleibt stehen, damit derselbe Vorschlag nicht
  // wiederkommt. Ein eigener Eintrag hat nichts, was wiederkommen koennte.
  assert.match(aktionen, /\.delete\(\)/);
  assert.ok(
    !/status: "rejected"|deleted_at|archived/.test(aktionen),
    "ein eigener Eintrag wird nur versteckt",
  );

  // Und jede Aenderung ist auf die eigenen Zeilen begrenzt - ausdruecklich,
  // nicht nur ueber die Zeilensicherheit.
  assert.equal([...aktionen.matchAll(/\.eq\("user_id", user\.id\)/g)].length, 2);
});

test("leer wird nicht gespeichert, und die Grenzen kommen aus einer Quelle", () => {
  const aktionen = codeOnly(AKTIONEN);

  // `btrim` wie in der Datenbank: Ein Eintrag aus Leerzeichen ist keiner.
  assert.match(aktionen, /String\(value \?\? ""\)\.trim\(\)/);
  assert.match(aktionen, /label\.length < RESOURCE_LABEL_MIN/);

  // Die Zahlen stehen einmal - dieselben wie in
  // `person_resources_label_check` (3 bis 160).
  assert.equal(RESOURCE_LABEL_MIN, 3);
  assert.equal(RESOURCE_LABEL_MAX, 160);
  assert.ok(
    !/\b160\b|\b3\b/.test(aktionen.replace(/RESOURCE_LABEL_(MIN|MAX)/g, "")),
    "eine Grenze steht noch einmal von Hand da",
  );
  assert.match(codeOnly(ABSCHNITT), /maxLength=\{RESOURCE_LABEL_MAX\}/);
});

test("eigene Eintraege und Vorschlaege sind zwei Listen", () => {
  const seite = codeOnly(SEITE);

  // Oben die bestaetigten - mit Bearbeiten und Entfernen.
  assert.match(seite, /<OwnResourcesSection\s+resources=\{confirmedResources\}/);

  // Darunter nur noch, was auf eine Entscheidung wartet. Dieselben Saetze ein
  // zweites Mal zu zeigen, nur ohne Knoepfe, waere die Doppelung, die auf
  // „Das bist du" gerade entfernt wurde.
  assert.match(seite, /<ResourceProposalSection proposals=\{resources\} showConfirmed=\{false\}/);

  // Ein selbst eingetragener Satz ist kein Vorschlag: Der Abschnitt darueber
  // filtert nach `pending`, und es gibt niemanden, der ihn vorgeschlagen
  // haette.
  assert.match(codeOnly(VORSCHLAEGE), /proposal\.status === "pending"/);

  // In Connect bleibt alles, wie es war - beide Listen untereinander.
  assert.match(codeOnly(VORSCHLAEGE), /showConfirmed = true/);
});

test("ein offener Vorschlag steht nirgends wie eine Angabe der Person", () => {
  // Dieselbe Regel wie seit Phase 2: „Das bist du" liest nur Bestaetigtes,
  // und das manuelle Eintragen aendert daran nichts - es erzeugt direkt
  // bestaetigte Zeilen.
  assert.match(
    codeOnly(join("src", "features", "reporting", "profileReadModel.ts")),
    /resource\.status === "confirmed"/,
  );
  assert.match(codeOnly(SEITE), /resources\.filter\(\(resource\) => resource\.status === "confirmed"\)/);
});

test("die Markierung ueberlebt das Pflegen", () => {
  // „Fuer jetzt fertig" heisst nicht „fuer immer abgeschlossen". Wer eine
  // Ressource ergaenzt, ist nicht ploetzlich wieder „begonnen" - ein Profil,
  // das sich beim Pflegen selbst zuruecksetzt, bestraft das Pflegen.
  const aktionen = codeOnly(AKTIONEN);
  assert.ok(!/person_section_marks/.test(aktionen), "eine Aktion fasst die Markierung an");
});

test("was man antippen soll, ist gross genug zum Antippen", () => {
  const abschnitt = codeOnly(ABSCHNITT);
  const treffer = [...abschnitt.matchAll(/className="([^"]*\binline-flex\b[^"]*)"/g)];
  assert.ok(treffer.length >= 2, `zu wenige Tippziele geprueft: ${treffer.length}`);
  for (const [, klassen] of treffer) {
    assert.match(klassen, /min-h-11/, `ein Tippziel ohne Mindesthoehe: ${klassen.slice(0, 60)}`);
  }

  // Der Speichern-Knopf und die Zeile zum Aufklappen tragen ihre Hoehe als
  // eigene Klasse - sie sind kein `inline-flex`, aber dieselben 44 px.
  assert.match(abschnitt, /const primaer =\s*\n?\s*"min-h-11/);
  assert.match(abschnitt, /<summary className="flex min-h-11/);
});

test("beide Sprachen sagen dasselbe ueber die eigenen Ressourcen", () => {
  const bundle = (locale: string) =>
    JSON.parse(source(join("messages", locale, "capability.json"))) as Record<
      string,
      Record<string, Record<string, unknown>>
    >;

  const pfade = (wert: unknown, praefix = ""): string[] =>
    typeof wert === "object" && wert !== null
      ? Object.entries(wert as Record<string, unknown>).flatMap(([k, v]) =>
          pfade(v, praefix ? `${praefix}.${k}` : k),
        )
      : [praefix];

  const de = bundle("de").aboutYou.resources;
  const en = bundle("en").aboutYou.resources;
  assert.deepEqual(pfade(de).sort(), pfade(en).sort());

  for (const locale of ["de", "en"]) {
    const b = bundle(locale);
    const r = b.aboutYou.resources as Record<string, unknown>;

    // Je Art ein Beispiel - als Hilfe, nicht als Pflicht.
    const beispiele = r.examples as Record<string, string>;
    for (const kind of RESOURCE_KINDS) {
      assert.ok(beispiele[kind]?.trim(), `${locale}: Beispiel fuer ${kind} fehlt`);
    }

    for (const key of ["ownTitle", "ownText", "empty", "add", "remove", "removeQuestion"]) {
      assert.ok(String(r[key] ?? "").trim(), `${locale}: ${key} fehlt`);
    }

    // Die Rueckmeldungen muessen da sein, sonst landet der rohe
    // Schluesselpfad auf der Seite.
    for (const key of ["resource_added", "resource_updated", "resource_removed"]) {
      assert.ok(String(b.success[key] ?? "").trim(), `${locale}: success.${key} fehlt`);
    }
    for (const key of ["resource_empty", "resource_duplicate"]) {
      assert.ok(String(b.errors[key] ?? "").trim(), `${locale}: errors.${key} fehlt`);
    }
  }

  // Und sie gehen durch die Allowlist der Seite - ein unbekannter Schluessel
  // wuerde als roher Pfad gerendert.
  const seite = codeOnly(SEITE);
  for (const key of ["resource_added", "resource_updated", "resource_removed"]) {
    assert.match(seite, new RegExp(`"${key}"`), `${key} steht nicht in SAVED_KEYS`);
  }
  for (const key of ["resource_empty", "resource_duplicate"]) {
    assert.match(seite, new RegExp(`"${key}"`), `${key} steht nicht in ERROR_KEYS`);
  }
});

test("der Leerzustand haengt nicht mehr an Connect", () => {
  // Vorher: „Zugaenge entstehen bisher aus deinen Connect-Texten" - und der
  // einzige Weg hinaus fuehrte nach Connect. Der Bereich ist jetzt ohne
  // Connect vollstaendig nutzbar.
  const de = JSON.parse(source(join("messages", "de", "capability.json"))) as {
    aboutYou: { resources: Record<string, unknown> };
  };
  const leer = String(de.aboutYou.resources.empty);
  assert.ok(!/Connect/i.test(leer), `der Leerzustand verweist auf Connect: ${leer}`);
  assert.ok(!de.aboutYou.resources.emptyCta, "der alte Weg nach Connect steht noch da");

  // Und das Formular steht offen, wenn noch nichts da ist.
  assert.match(codeOnly(ABSCHNITT), /open=\{resources\.length === 0\}/);
});
