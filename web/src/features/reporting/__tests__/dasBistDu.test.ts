import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = join("src", "app", "me", "profile", "page.tsx");
const bundle = (locale: string) =>
  JSON.parse(source(join("messages", locale, "profile.json"))).founderProfile as Record<
    string,
    Record<string, unknown> | string
  >;

/**
 * „Das bist du" — die Seite als Ganzes.
 *
 * Diese Datei prüft die Zusagen, die über einzelne Bausteine hinausgehen:
 * welche Abschnitte bei welcher Datenlage erscheinen, was nirgends auftaucht,
 * und dass beide Sprachen dieselben Sätze haben.
 */

test("welche Abschnitte bei welcher Datenlage erscheinen", () => {
  const page = codeOnly(PAGE);

  // Nur zwei Abschnitte dürfen ganz verschwinden - und bei beiden ist NICHTS
  // eine gültige Antwort. Bei allen anderen steht ein Hinweis mit einem Weg.
  const bedingungen = /const zeigt: Record<SectionId, boolean> = \{([\s\S]*?)\};/.exec(page)?.[1];
  assert.ok(bedingungen, "die Bedingungen stehen nicht als Daten");
  assert.match(bedingungen, /entwicklung: growingInto\.length > 0/);
  assert.match(bedingungen, /ressourcen: confirmedResources\.length > 0/);
  assert.match(bedingungen, /erfahrung: entries\.length > 0/);

  // Diese vier stehen immer - sie tragen bei leerer Datenlage einen Hinweis.
  for (const immer of ["ueber-dich", "arbeitsweise", "staerken", "antrieb"]) {
    assert.match(
      bedingungen,
      new RegExp(`"?${immer}"?: true`),
      `${immer} verschwindet bei leeren Daten`,
    );
  }
});

test("Leerzustaende sehen nicht wie Fehler aus", () => {
  const page = codeOnly(PAGE);

  // Gestrichelter Rahmen, kein Rot, kein Warnzeichen - und genau ein Weg
  // weiter. Was hier fehlt, fehlt nicht am Menschen.
  assert.match(page, /className="no-print[^"]*border-dashed/);
  const missing = page.slice(page.indexOf("function MissingSection"));
  for (const warnfarbe of ["rose", "red-", "amber"]) {
    assert.ok(!missing.includes(warnfarbe), `der Hinweis ist eingefärbt: ${warnfarbe}`);
  }

  // Jeder Leerzustand hat genau einen Weg.
  const aufrufe = [...page.matchAll(/<MissingSection([\s\S]*?)\/>/g)];
  assert.ok(aufrufe.length >= 4, `zu wenige Hinweise: ${aufrufe.length}`);
  for (const aufruf of aufrufe) {
    assert.equal(
      (aufruf[1].match(/href=/g) ?? []).length,
      1,
      "ein Hinweis hat mehr als einen Weg",
    );
  }
});

test("die Seite zeigt keine Erzaehlungen und keine offenen Vorschlaege", () => {
  const page = codeOnly(PAGE);

  // Ein Profil, das man weitergibt, gibt Fähigkeiten weiter, nicht die
  // Geschichten aus dem Interview.
  assert.ok(!/narrative|evidence_quote|evidenceQuote/.test(page), "Erzählungen auf der Seite");

  // Und eine Modellbehauptung darf nicht wie eine Aussage der Person
  // aussehen.
  assert.match(page, /resource\.status === "confirmed"/);
  assert.ok(!/"pending"|"rejected"/.test(page), "offene Vorschläge auf der Seite");
});

test("keine Zahl ueber einen Menschen", () => {
  const page = codeOnly(PAGE);
  assert.ok(
    !/(score|punktzahl|percentile|typologie|typology|radar|spider)/i.test(page),
    "ein Wort, das nach Bewertung klingt",
  );

  // Der Sprungbalken ist eine Liste von Ankern und KEINE Statusanzeige. Hier
  // stand bis zum 01.10.2026 "ausgefuellt / noch offen" je Kachel - ein
  // Fortschrittsbalken in anderer Schreibweise.
  assert.ok(!/overview\.ready|overview\.open|pillar\.done/.test(page), "Statusanzeige im Balken");
});

test("beide Sprachen haben dieselben Saetze fuer die neue Seite", () => {
  const de = bundle("de");
  const en = bundle("en");

  const pfade = (wert: unknown, praefix = ""): string[] =>
    typeof wert === "object" && wert !== null
      ? Object.entries(wert as Record<string, unknown>).flatMap(([schluessel, inhalt]) =>
          pfade(inhalt, praefix ? `${praefix}.${schluessel}` : schluessel),
        )
      : [praefix];

  assert.deepEqual(pfade(de).sort(), pfade(en).sort());

  // Die neuen Blöcke sind wirklich da.
  for (const block of [
    "parts",
    "sections",
    "head",
    "depth",
    "ownership",
    "strengthsSection",
    "directionSection",
    "resourcesSection",
    "ventures",
    "whatThisIs",
    "origins",
  ]) {
    assert.ok(de[block], `de: ${block} fehlt`);
    assert.ok(en[block], `en: ${block} fehlt`);
  }

  // Neun Abschnittsnamen, und `step` ist die Zählweise.
  const sections = de.sections as Record<string, string>;
  assert.equal(Object.keys(sections).length, 10);
  assert.match(sections.step, /\{index\}/);
});

test("die Nummer sagt, wo man steht - nicht, wie viel noch fehlt", () => {
  // GEMELDET AM 01.10.2026: „Auch wenn das technisch nur die Position meint,
  // liest es sich wie ein Fortschrittsindikator."
  //
  // „x von y" ist die Schreibweise von Ladebalken und
  // Einrichtungsassistenten. Auf einer Seite, die zusammenstellt, was jemand
  // über sich festgehalten hat, gibt es kein Fertig.
  for (const locale of ["de", "en"]) {
    const step = (bundle(locale).sections as Record<string, string>).step;
    assert.match(step, /\{index\}/, `${locale}: die Nummer fehlt`);
    assert.ok(!step.includes("{total}"), `${locale}: die Gesamtzahl steht wieder da`);
    // Auch ausgeschrieben nicht: „Abschnitt 4 von 9", „4/9".
    assert.ok(
      !/\b(von|of)\b|\//.test(step),
      `${locale}: die Zählweise setzt die Nummer wieder ins Verhältnis: ${step}`,
    );
  }

  // Und die Seite reicht keine Gesamtzahl mehr durch.
  const aufruf = /t\("sections\.step", \{([\s\S]*?)\}\)/.exec(codeOnly(PAGE))?.[1];
  assert.ok(aufruf, "die Nummer wird nicht mehr über `sections.step` gebildet");
  assert.ok(!/total/.test(aufruf), "die Seite gibt die Gesamtzahl weiter");

  // Die alte Kachelübersicht ist samt ihren Wörtern weg. Sie hieß
  // `overview.ready` / `overview.open` - „ausgefüllt" und „noch offen" je
  // Säule - und war ein Fortschrittsbalken in anderer Schreibweise.
  for (const locale of ["de", "en"]) {
    assert.equal(bundle(locale).overview, undefined, `${locale}: die Kachelübersicht lebt noch`);
    assert.equal(bundle(locale).pillars, undefined, `${locale}: die vier Säulen leben noch`);
  }
});

test("der Sprungbalken schiebt sich, statt die halbe Seite zu fuellen", () => {
  // GEMESSEN AM 01.10.2026 im Browser: Bei 320 px standen acht Sprungmarken
  // in sieben Zeilen und 356 px hoch - fast ein ganzer Bildschirm
  // Inhaltsverzeichnis vor dem ersten Inhalt.
  const page = codeOnly(PAGE);
  const liste = /<ul className="([^"]*)">\s*\{sections/.exec(page)?.[1];
  assert.ok(liste, "der Sprungbalken ist keine Liste mehr");

  // Unter `sm` eine Zeile zum Schieben...
  assert.match(liste, /overflow-x-auto/);
  // ...darüber wie bisher Umbruch.
  assert.match(liste, /sm:flex-wrap/);
  // Und `flex-wrap` steht nicht ohne Stufe da - sonst bricht er doch wieder um.
  assert.ok(
    !/(^|\s)flex-wrap/.test(liste),
    `der Balken bricht auch am Telefon um: ${liste}`,
  );

  // Die Seite darf dadurch nicht breiter werden: Der Rollbereich gehört der
  // Liste, und ihre Punkte schrumpfen nicht.
  assert.match(page, /<li key=\{section\.id\} className="shrink-0">/);
});

test("ein Aufklapper, der nichts hinzufuegt, erscheint nicht", () => {
  // GEMELDET AM 01.10.2026: Bei wenig Inhalt zeigte er dieselben Sätze noch
  // einmal, nur mit der Herkunft daneben.
  const page = codeOnly(PAGE);

  assert.match(page, /const mehrStaerken = strengths\.length > STRENGTHS_IN_SUMMARY/);
  assert.match(page, /const mehrRichtung = DIRECTION_FACETS\.some\(/);
  assert.match(page, /\{mehrStaerken \? \(\s*<ProfileDetails/);
  assert.match(page, /\{mehrRichtung \? \(\s*<ProfileDetails/);

  // Die andere Lösung wäre gewesen, die Herkunft an jeden Satz der
  // Zusammenfassung zu hängen. Sie ist die schlechtere: Neben jeder Aussage
  // gelesen, macht sie aus Aussagen eine Liste von Fußnoten. Deshalb steht
  // `originLabel` weiterhin nur dort, wo auch `ProfileDetails` steht.
  const zusammenfassung = page.indexOf("limit={STRENGTHS_IN_SUMMARY}");
  assert.ok(page.indexOf("originLabel={originLabel}") > zusammenfassung);
});

test("was man antippen soll, ist gross genug zum Antippen", () => {
  // GEMESSEN AM 01.10.2026: „Bearbeiten" war 21 px hoch und steht neunmal
  // auf dieser Seite; „Zurück zur Übersicht" 38 px.
  const page = codeOnly(PAGE);
  for (const treffer of page.matchAll(/className="([^"]*\binline-flex\b[^"]*)"/g)) {
    assert.match(
      treffer[1],
      /min-h-11/,
      `ein Tippziel ohne Mindesthöhe: ${treffer[1].slice(0, 70)}`,
    );
  }
});

test("die Herkunft steht in normaler Sprache, nicht als technischer Wert", () => {
  for (const locale of ["de", "en"]) {
    const origins = bundle(locale).origins as Record<string, string>;
    for (const wert of ["own_words", "confirmed_proposal", "edited_proposal", "self", "model"]) {
      assert.ok(origins[wert]?.trim(), `${locale}: ${wert} fehlt`);
      // Der Schlüssel darf nicht in seiner eigenen Übersetzung stehen.
      assert.ok(!origins[wert].includes("_"), `${locale}: ${wert} zeigt den technischen Wert`);
    }
  }

  // Und sie steht im Aufklapper, nicht in der Zusammenfassung: Neben jedem
  // Satz gelesen, wäre sie eine Fußnote an einer Aussage.
  const page = codeOnly(PAGE);
  const zusammenfassung = page.indexOf("limit={STRENGTHS_IN_SUMMARY}");
  const aufklapper = page.indexOf("originLabel={originLabel}");
  assert.ok(zusammenfassung > 0 && aufklapper > zusammenfassung);
});

test("der Hinweis unten bleibt und sagt alle vier Einschraenkungen", () => {
  // Die Dokumentation war darin immer ehrlich, das Produkt lange nicht. Beim
  // Umbau wäre der Kasten fast herausgefallen.
  const page = codeOnly(PAGE);
  assert.match(page, /<InstrumentNote/);
  assert.match(page, /whatThisIs\.title/);
  // Er datiert jetzt die Seite, nicht mehr nur den v1-Bericht.
  assert.match(page, /dated: freshness/);
});
