import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import test from "node:test";

import { CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { REGISTRY_V21 } from "@/features/instruments/v21/registryV21";

/**
 * Die Testfassung ist erreichbar - und sagt, dass sie eine ist.
 *
 * ---------------------------------------------------------------------------
 * WAS DIESEN TEST ERSETZT HAT
 * ---------------------------------------------------------------------------
 *
 * Vorher hieß er „kein Zugang zu v2.1 außerhalb von debug“ und hielt die
 * Seiten in einem Ordner fest, der in Production 404 ist. Das ging nicht mehr:
 * Die fachliche Durchsicht empfiehlt v2.1 ausdrücklich für kognitive
 * Interviews und einen begleiteten Produktpilot - dafür müssen die
 * Teilnehmenden sie erreichen können.
 *
 * Der Schutz liegt jetzt woanders, und er ist stärker als ein Ordnername:
 *
 *   Die ROLLE ist das Tor. Ohne Anmeldung kommt niemand hierher, und die
 *   Datenbank lässt ein Konto ohne Founder-Rolle nicht einmal einen Fragebogen
 *   anlegen - das ist in `alignment_answers`/`assessments` per RLS geprüft.
 *
 *   v1 BLEIBT DIE FASSUNG, DIE GILT. `CURRENT_INSTRUMENT_ID` zeigt weiter auf
 *   v1. Wer v2.1 meint, muss es hinschreiben.
 *
 *   DIE SEITE SAGT, WAS SIE IST. Wer eine halbe Stunde ausfüllt und danach
 *   erfährt, dass es noch keine Auswertung gibt, ist zu Recht verärgert.
 */

const PILOT = join("src", "app", "(product)", "founder-alignment", "pilot");
/**
 * Die zweite Stelle, die die Testfassung kennen darf - und die einzige.
 *
 * Eine Liste statt eines Musters: Wer eine dritte Stelle einbaut, muss sie
 * hier eintragen und dabei kurz ueberlegen, ob sie dorthin gehoert. Genau das
 * ist der Zweck.
 */
const ERLAUBT = [
  join("src", "app", "(product)", "founder-alignment", "versionen") + sep,
  // Das Dashboard: Hinweis auf die neue Fassung und der Archivkasten. Es
  // FUEHRT dorthin, es enthaelt den Fragebogen nicht - ein eigener Test unten
  // haelt das fest.
  join("src", "app", "(product)", "dashboard") + sep,
  // Die Advisor-Seite: Sie zeigt fremde Antworten, wenn sie freigegeben sind.
  // Ein eigener Test unten haelt fest, dass sie dort nichts anfassen kann.
  join("src", "app", "(product)", "advisor", "person") + sep,
  // Die beiden neuen Boegen (Arbeitsprofil, Venture-Alignment). Sie benutzen
  // die Antwortpruefung, das Eingabefeld und die Lesbarmachung von v2.1 -
  // bewusst, damit es nicht zwei Kopien gibt, die auseinanderlaufen. Die
  // FRAGEN kommen aus ihren eigenen Registraturen.
  join("src", "app", "(product)", "founder-alignment", "profil") + sep,
  join("src", "app", "(product)", "founder-alignment", "vorhaben") + sep,
  join("src", "app", "(product)", "founder-alignment", "vergleich") + sep,
  join("src", "app", "(product)", "founder-alignment", "suche") + sep,
];
const ROOT = "src";
const V21 = join("src", "features", "instruments", "v21") + sep;
const INSTRUMENTS = join("src", "features", "instruments") + sep;
const MENTIONS = /instruments\/v21\//;

function pagesOfPilot(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === "page.tsx") found.push(path);
    }
  };
  walk(PILOT);
  return found;
}

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) yield path;
  }
}

test("der Waechter findet die Pilotseiten", () => {
  // Ein Waechter, der eine leere Menge prueft, ist immer gruen. Die Zahl steht
  // hier absichtlich nicht fest - sie waechst, und ein Test, der bei jeder
  // neuen Seite umfaellt, wird irgendwann nur noch nachgezogen statt gelesen.
  const pages = pagesOfPilot();
  assert.ok(pages.length >= 4, `zu wenige Seiten gefunden: ${pages.join(", ")}`);
  for (const erwartet of ["page.tsx", join("report", "page.tsx"),
                          join("compare", "[partnerId]", "page.tsx"),
                          join("discovery", "page.tsx")]) {
    assert.ok(
      pages.some((path) => path.endsWith(erwartet)),
      `diese Seite fehlt: ${erwartet}`,
    );
  }
});

test("der Fragebogen sagt VOR der ersten Frage, dass er eine Testfassung ist", () => {
  const page = readFileSync(join(PILOT, "page.tsx"), "utf8");
  assert.match(page, /Testfassung/);
  // Und die beiden Folgen, die man nicht hinterher erfahren darf.
  assert.match(page, /noch keine\s*\n?\s*Auswertung|keine\s*\n?\s*Auswertung/,
    "der Hinweis, dass es noch keine Auswertung gibt, fehlt");
  assert.match(page, /dieselbe Fassung|zwei verschiedene Fragebögen/,
    "der Hinweis auf den Vergleich nur innerhalb einer Fassung fehlt");
});

test("v1 bleibt die Fassung, die gilt", () => {
  // Solange das zwei verschiedene Konstanten sind, kann nichts versehentlich
  // die Testfassung ausliefern.
  assert.notEqual(CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID);
  assert.equal(CURRENT_INSTRUMENT_ID, "founder-compatibility-v1");
  assert.equal(REGISTRY_V21.status, "draft");
});

test("jede Pilotseite holt die Person über getRequestUser", () => {
  for (const path of pagesOfPilot()) {
    const page = readFileSync(path, "utf8");
    assert.match(page, /getRequestUser/, path);
    assert.ok(!/supabase\.auth\.getUser/.test(page), path);
  }
});

test("keine Pilotseite verwechselt v2 mit v2.1", () => {
  // Der teure Fehler: Die Seite sucht Antworten unter der Kennung von v2, und
  // jemand sieht einen leeren Fragebogen, obwohl er ihn ausgefuellt hat.
  for (const path of pagesOfPilot()) {
    const page = readFileSync(path, "utf8");
    assert.match(page, /ALIGNMENT_V21_INSTRUMENT_ID/, path);
    assert.ok(!/ALIGNMENT_V2_INSTRUMENT_ID/.test(page), path);
  }
});

test("die Wahlseite nennt beide Fassungen und empfiehlt keine", () => {
  const page = readFileSync(
    join("src", "app", "(product)", "founder-alignment", "versionen", "page.tsx"), "utf8");
  assert.match(page, /CURRENT_INSTRUMENT_ID/);
  assert.match(page, /ALIGNMENT_V21_INSTRUMENT_ID/);
  // Sie erzwingt nichts: kein redirect ausser dem zum Login.
  const redirects = page.match(/redirect\(/g) ?? [];
  assert.equal(redirects.length, 1, "die Wahlseite leitet irgendwohin um");
  assert.match(page, /login/);
});

test("das Dashboard fuehrt zur Testfassung, enthaelt sie aber nicht", () => {
  // Der Unterschied ist wichtig: Ein Link ist in Ordnung, ein zweiter
  // Fragebogen an anderer Stelle nicht. Sonst gaebe es zwei Wege, dieselbe
  // Antwort zu geben, und beide wuerden auseinanderlaufen.
  const page = readFileSync(
    join("src", "app", "(product)", "dashboard", "page.tsx"), "utf8");
  assert.match(page, /TransitionAnnounce/);
  assert.match(page, /VersionArchiveCard/);
  for (const verboten of ["QuestionnaireV21", "AnswerFieldV21", "saveAnswerV21", "ReportViewV21"]) {
    assert.ok(!page.includes(verboten), `das Dashboard enthaelt ${verboten}`);
  }
});

test("der Hinweis erscheint nicht fuer Menschen, die die alte Fassung nicht kennen", () => {
  // Wer gerade erst anfaengt, soll keinen Hinweis auf eine Neufassung von
  // etwas bekommen, das er nie gesehen hat - er soll einfach den aktuellen
  // Fragebogen sehen.
  const page = readFileSync(
    join("src", "app", "(product)", "dashboard", "page.tsx"), "utf8");
  assert.match(page, /versionState\.announce && <TransitionAnnounce/);
});

test("der Advisor kann fremde Antworten nicht anfassen", () => {
  // Dieselbe Ansicht zeigt dem Advisor fremde Antworten. Ein Haekchen
  // „darueber moechte ich sprechen“ an einer Antwort, die einem nicht gehoert,
  // waere dort falsch - die Datenbank wuerde den Schreibversuch abweisen, aber
  // ein Bedienelement, das nichts tun darf, ist ein Fehler in der Anzeige und
  // keine Sicherheitsstufe.
  const page = readFileSync(
    join("src", "app", "(product)", "advisor", "person", "[userId]", "page.tsx"), "utf8");
  assert.match(page, /ReportViewV21/);
  assert.ok(!/canMark/.test(page), "die Advisor-Seite erlaubt das Markieren");

  // Und die Voreinstellung muss „nein“ sein, sonst haette das Weglassen
  // genau die falsche Wirkung.
  const view = readFileSync(
    join("src", "features", "instruments", "v21", "ReportViewV21.tsx"), "utf8");
  assert.match(view, /canMark = false/);
});

test("eine archivierte Fassung laedt nirgends mehr zum Ausfuellen ein", () => {
  // Zwei Stellen taten es: der Dashboard-Kasten und die Versionsseite. Beide
  // meinten v2.1, die inzwischen archiviert ist - eine Einladung in eine
  // Sackgasse, und zwar neben der Einladung zu den Boegen, die wirklich neu
  // sind.
  //
  // Geprueft wird, dass beide den Status LESEN. Eine Annahme im Code wuerde
  // beim naechsten Statuswechsel wieder falsch.
  for (const datei of [
    join("src", "features", "instruments", "v21", "dashboardVersionData.ts"),
    join("src", "app", "(product)", "founder-alignment", "versionen", "page.tsx"),
  ]) {
    const text = readFileSync(datei, "utf8");
    assert.match(text, /from\("instruments"\)/, `${datei} fragt den Status nicht ab`);
    assert.match(text, /=== "archived"/, datei);
  }

  // Und die Ansicht macht daraus wirklich etwas anderes, statt den Status nur
  // entgegenzunehmen.
  const ansicht = readFileSync(
    join("src", "features", "instruments", "v21", "VersionChoiceView.tsx"), "utf8");
  assert.match(ansicht, /archived \? /);

  const karte = readFileSync(
    join("src", "features", "instruments", "v21", "VersionArchiveCard.tsx"), "utf8");
  assert.match(karte, /!archived && \(/);
});

test("was gelesen wird, muss sich auch setzen lassen", () => {
  // „Darueber moechte ich sprechen“ wurde in den neuen Boegen GELESEN -
  // agendaV21 stellt markierte Fragen vor alle anderen, und die
  // Gespraechskarten haben dafuer eine eigene Regel. Setzen liess es sich
  // nicht: Die Antwortseiten boten den Haken nicht an, und die Serveraktion
  // suchte nur v2.1-Fragebogen. Ein Vorrang fuer etwas, das niemand ausloesen
  // kann.
  for (const [seite, scope] of [
    ["profil", "founder_profile"],
    ["vorhaben", "venture_alignment"],
  ] as const) {
    const page = readFileSync(
      join("src", "app", "(product)", "founder-alignment", seite, "antworten", "page.tsx"),
      "utf8",
    );
    assert.match(page, /canMark/, `${seite}: kein Haken`);
    assert.match(page, new RegExp(`markScope="${scope}"`), `${seite}: falscher Bogen`);
    assert.match(page, /marked=\{report\.marked\}/, `${seite}: der Haken kennt seinen Stand nicht`);
  }

  // Das Vorhaben braucht ausserdem das gemeinte: Wer in zwei Vorhaben ist,
  // markierte sonst in beiden - und in einem davon eine Frage, die er dort
  // nie beantwortet hat.
  const vorhaben = readFileSync(
    join("src", "app", "(product)", "founder-alignment", "vorhaben", "antworten", "page.tsx"),
    "utf8",
  );
  assert.match(vorhaben, /markVentureId=/);
});

test("die Pretest-Messung laeuft fuer die Bögen, die vorgelegt werden", () => {
  // Sie hing an v2.1 fest. Die beiden Boegen, die jetzt tatsaechlich
  // ausgefuellt werden, zeichneten nichts auf - die Auswertung in
  // docs/pretest-auswertung.md haette null Zeilen geliefert, und gemerkt
  // haette man es erst nach dem Pilot.
  const fragebogen = readFileSync(
    join("src", "features", "instruments", "align", "Questionnaire.tsx"), "utf8");

  // Beide Haelften: was gesehen wurde und was beantwortet wurde. Nur eine
  // davon ergaebe Dauer ohne Abbruchstelle oder umgekehrt.
  assert.match(fragebogen, /noteItemSeen\(frisch, scope/);
  assert.match(fragebogen, /noteItemAnswered\(itemId, scope/);

  const aktionen = readFileSync(
    join("src", "features", "instruments", "v21", "itemViewActions.ts"), "utf8");
  assert.match(aktionen, /INSTRUMENT_OF\[scope\]/, "die Messung kennt nur v2.1");

  // Und sie legt nichts an. resolveVenture wuerde ein Vorhaben erzeugen -
  // eine Messung darf nichts entstehen lassen, was ohne sie nicht da waere.
  // Ohne Kommentare geprueft: Die Datei ERKLAERT, warum sie es nicht tut.
  const ohneKommentar = aktionen
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  assert.ok(!/resolveVenture/.test(ohneKommentar), "die Messung legt ein Vorhaben an");
});

test("in den Übersichtsbildern wird nichts zusammengerechnet", () => {
  // Entschieden am 29.09.2026: keine Zahlen im Report, sie sind irrefuehrend.
  // Die Gefahr ist nicht das Bild, sondern der naechste Schritt: Erst wird ein
  // Abschnittsmittel gerechnet, dann steht es daneben, dann steht im Bericht
  // "ihr liegt 1,4 auseinander" - genau den Weg ist v1 gegangen.
  //
  // Geprueft wird deshalb das Rechnen, nicht die Darstellung: Wo kein
  // Mittelwert entsteht, kann auch keiner angezeigt werden.
  for (const datei of [
    join("src", "features", "instruments", "align", "AlignMaps.tsx"),
    join("src", "features", "instruments", "align", "mapRows.ts"),
  ]) {
    // Auch das Richtungsbild: Die Spezifikation schreibt dort
    // "██████████ 5". Die Ziffer faellt weg, die Beschriftung bleibt.
    // Ohne Kommentare: Die Dateien ERKLAEREN, warum hier kein Mittelwert
    // entsteht - und das Wort im Kommentar ist kein Mittelwert.
    const code = readFileSync(datei, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    for (const verboten of ["toFixed", "Math.round", ".reduce(", "rows.length /", "/ rows.length"]) {
      assert.ok(!code.includes(verboten), `${datei} rechnet: ${verboten}`);
    }
  }

  // Und kein "Stufe 3 von 5" als Vorlesetext - dieselbe Zahl, nur unsichtbar.
  // Die Beschriftung der Antwort steht als echter Text daneben und traegt die
  // Bedeutung; die Punkte sind Dekoration.
  const maps = readFileSync(
    join("src", "features", "instruments", "align", "AlignMaps.tsx"), "utf8");
  assert.ok(!/aria-label/.test(maps), "die Bilder tragen einen Vorlesetext mit Zahl");
  assert.match(maps, /aria-hidden="true"/);
});

test("Gesprächskarten bekommen Namen und kein „Du“", () => {
  // Die Kartenvorlagen stehen in der dritten Person: „{a} sagt {aAnswer}“.
  // „Du“ dort einzusetzen ergibt „Du sagt manchmal“ - beim Durchklicken am
  // 29.09.2026 genau so gesehen. Die Tabelle daneben darf „Du“ behalten:
  // dort ist es ein Spaltenkopf und kein Satz.
  const dateien = [
    join("src", "features", "instruments", "align", "comparisonData.ts"),
    join("src", "app", "(product)", "founder-alignment", "pilot", "compare", "[partnerId]", "page.tsx"),
  ];
  for (const datei of dateien) {
    const text = readFileSync(datei, "utf8");
    const aufruf = text.match(/buildCards(?:V21)?\(\{[\s\S]*?\}\)/);
    assert.ok(aufruf, `${datei} baut keine Karten mehr`);
    assert.ok(
      !/nameA:\s*"Du"/.test(aufruf[0]),
      `${datei} setzt „Du“ in einen Satz in der dritten Person`,
    );
    assert.match(aufruf[0], /nameA:/, datei);
  }
});

test("die neuen Bögen lesen ihre Antworten nie gegen die v2.1-Registratur", () => {
  // readAnswer ohne Frage faellt auf v2.1 zurueck. 24 der 36 Venture-Kennungen
  // gibt es dort auch - mit anderem Wortlaut und teils anderen Antworten. Der
  // Rueckfall ist also nicht leer, sondern falsch: Beschriftungen aus dem
  // falschen Bogen, und bei den uebrigen zwoelf saehe eine vorhandene Antwort
  // aus wie keine.
  const files = [
    join("src", "app", "(product)", "founder-alignment", "vorhaben", "bestaetigen", "page.tsx"),
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const aufrufe = text.match(/readAnswer\([^)]*\)/g) ?? [];
    // Sonst bestuende die Pruefung eine Datei, die readAnswer gar nicht mehr
    // benutzt - und niemand merkte, dass sie nichts mehr prueft.
    assert.ok(aufrufe.length > 0, `${file} ruft readAnswer nicht mehr auf`);
    for (const aufruf of aufrufe) {
      assert.ok(
        aufruf.split(",").length >= 3,
        `${file}: ${aufruf} gibt die Frage nicht mit`,
      );
    }
  }
});

test("der Advisor sieht die beiden neuen Bögen mit derselben Beschränkung", () => {
  const page = readFileSync(
    join("src", "app", "(product)", "advisor", "person", "[userId]", "page.tsx"), "utf8");
  // Beide Boegen, und beide durch dieselbe Ansicht - die Pruefung oben
  // („kein canMark“) liest dieselbe Datei und gilt damit auch hier.
  assert.match(page, /getAdvisorAlignViews/);
  assert.match(page, /alignViews\.map/);
});

test("eine fehlende Freigabe wird dem Advisor nicht als Aussage angezeigt", () => {
  const view = readFileSync(
    join("src", "features", "instruments", "align", "advisorView.ts"), "utf8");

  // Kommen keine Zeilen zurueck, gibt es keinen Abschnitt. Ein leerer Kasten
  // oder ein Schloss waere eine Auskunft ueber einen Menschen, die niemand
  // gegeben hat.
  assert.match(view, /rows\.length === 0\) return null/);

  // Und die Zahl daneben zaehlt SICHTBARE Fragen, nicht zurueckgehaltene.
  // Von hier aus sieht „nicht freigegeben“ genauso aus wie „nicht
  // beantwortet“ - eine Zahl, die beides „zurueckgehalten“ nennt, behauptet
  // eine Entscheidung, die es vielleicht nie gab.
  assert.match(view, /visible: \{ count/);
  assert.ok(
    !/withheld|zurueckgehalten: /.test(view),
    "die Advisor-Ansicht zaehlt Zurueckgehaltenes",
  );
});

test("die neuen Bögen holen ihre FRAGEN aus den eigenen Registraturen", () => {
  // Sie duerfen v2.1-Bausteine benutzen - Pruefung, Eingabefeld,
  // Lesbarmachung. Die Fragen aus v2.1 zu ziehen waere etwas anderes: Dann
  // stuenden dort 36 statt 16, und die Teilung waere Dekoration.
  for (const seite of ["profil", "vorhaben"]) {
    const page = readFileSync(
      join("src", "app", "(product)", "founder-alignment", seite, "page.tsx"), "utf8");
    assert.match(page, /instruments\/align\//, seite);
    assert.ok(!/getItemsV21|getSectionsV21|REGISTRY_V21/.test(page), `${seite} zieht v2.1-Fragen`);
  }
});

test("die Testfassung wird nur von den bewusst eingetragenen Stellen erreicht", () => {
  // Nicht mehr „nur unter debug“, aber weiterhin an einer Stelle: Ein Link aus
  // dem Dashboard ist in Ordnung, ein zweiter Fragebogen an anderer Stelle
  // nicht. Wer v2.1 einbindet, soll es bewusst tun.
  const outside: string[] = [];
  for (const file of sourceFiles(ROOT)) {
    if (file.startsWith(V21) || file.startsWith(PILOT)) continue;
    if (ERLAUBT.some((prefix) => file.startsWith(prefix))) continue;
    if (file.startsWith(INSTRUMENTS) && !file.includes(sep + "v2")) continue;
    if (MENTIONS.test(readFileSync(file, "utf8"))) outside.push(file);
  }
  assert.deepEqual(
    outside,
    [],
    "Diese Dateien binden die Testfassung ausserhalb der Pilotseiten ein:\n" + outside.join("\n"),
  );
});
