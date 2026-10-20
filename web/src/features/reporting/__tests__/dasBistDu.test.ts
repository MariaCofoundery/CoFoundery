import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

  // SEIT PHASE 1 (PROFIL): Nur die Vorhaben duerfen als Abschnitt ganz
  // verschwinden - ohne Vorhaben gibt es nichts zu verlinken. Bei allen
  // anderen steht ein Hinweis mit einem Weg. Die Ressourcen sind Teil von
  // „Was du mitbringst" und entfallen dort ohne Bestaetigtes als Block.
  const bedingungen = /const zeigt: Record<SectionId, boolean> = \{([\s\S]*?)\};/.exec(page)?.[1];
  assert.ok(bedingungen, "die Bedingungen stehen nicht als Daten");
  // Phase 1.1: „So willst du gründen" steht immer - ohne Antworten mit Einstieg.
  assert.match(bedingungen, /vorhaben: true/);
  assert.match(page, /\{confirmedResources\.length > 0 \? \(/);

  // Diese stehen immer - sie tragen bei leerer Datenlage einen Hinweis.
  for (const immer of ["arbeitsweise", "staerken", "mitbringst", "antrieb", "vorhaben", "details"]) {
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
  // NACHGEZOGEN AM 01.10.2026: Die Liste entsteht im gemeinsamen Lesemodell,
  // das die Seite und die beiden Druckfassungen benutzen.
  assert.match(
    codeOnly(join("src", "features", "reporting", "profileReadModel.ts")),
    /resource\.status === "confirmed"/,
  );
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

  // Die sieben Abschnitte der Seite (Phase 1) - dazu die bisherigen Namen,
  // die die Druckfassung weiter benutzt - und `step` ist die Zählweise.
  const sections = de.sections as Record<string, string>;
  for (const key of ["about", "work", "strengths", "bring", "direction", "ventures", "details"]) {
    assert.ok(sections[key], `sections.${key} fehlt`);
  }
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
  const liste = /<ul className="([^"]*)">\s*\{sichtbar/.exec(page)?.[1];
  assert.ok(liste, "der Sprungbalken ist keine Liste mehr");

  // Unter `lg` eine Zeile zum Schieben - seit Phase 6 auch auf dem Tablet:
  // Bei 768 und 820 px waren es sonst drei Zeilen und 148 px...
  assert.match(liste, /overflow-x-auto/);
  // ...erst ab 1024 px wie bisher Umbruch.
  assert.match(liste, /lg:flex-wrap/);
  assert.ok(!/(^|\s)(sm|md):flex-wrap/.test(liste), `der Balken bricht auf dem Tablet um: ${liste}`);
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
  // SEIT PHASE 1 (PROFIL): EIN Hinweis statt vier. „Was diese Seite zeigt"
  // ist in den Kasten aufgegangen - mit „keine Erfolgsprognose" als eigenem
  // Satz und dem Hinweis, dass die Seite privat ist.
  assert.equal([...page.matchAll(/<InstrumentNote/g)].length, 1);
  assert.match(page, /extra: t\("whatThisIs\.noPrediction"\)/);
  assert.match(page, /whatThisIs\.private/);
  assert.doesNotMatch(page, /whatThisIs\.title|whatThisIs\.text/);
  // Er steht in „Details & Methodik", ganz unten.
  assert.ok(page.indexOf("<InstrumentNote") > page.search(/\{teil\(\s*"details",/), "der Hinweis steht nicht unten");
  // Er datiert jetzt die Seite, nicht mehr nur den v1-Bericht.
  assert.match(page, /dated: freshness/);
  for (const locale of ["de", "en"]) {
    const note = bundle(locale).whatThisIs as Record<string, string>;
    assert.match(note.noPrediction, /Erfolgsprognose|prediction of success/, locale);
  }
});

// ---------------------------------------------------------------------------
// Phase 1 (Profil), 17.10.2026
// ---------------------------------------------------------------------------
test("die Nummern zaehlen nur sichtbare Abschnitte - keine Spruenge", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /const sichtbar = sections\.filter\(\(section\) => zeigt\[section\.id\]\);/);
  assert.match(page, /index: sichtbar\.findIndex\(\(section\) => section\.id === id\) \+ 1/);
  assert.doesNotMatch(page, /index: sections\.findIndex/, "die Nummer zaehlt wieder ausgeblendete Abschnitte mit");
  // Dieselbe Rechnung als Daten nachgespielt: Ohne Vorhaben ist „Details &
  // Methodik" Abschnitt 6, nicht 7.
  const ids = ["arbeitsweise", "staerken", "mitbringst", "antrieb", "vorhaben", "details"];
  const nummern = (zeigt: Record<string, boolean>) => {
    const sichtbar = ids.filter((id) => zeigt[id]);
    return sichtbar.map((id) => sichtbar.indexOf(id) + 1);
  };
  const alle = Object.fromEntries(ids.map((id) => [id, true]));
  assert.deepEqual(nummern(alle), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(nummern({ ...alle, vorhaben: false }), [1, 2, 3, 4, 5]);
});

test("Staerken: ein klarer Leerzustand mit genau einem Weg, und der Weg existiert", () => {
  const page = codeOnly(PAGE);
  const leer = page.slice(page.indexOf('title={t("strengthsSection.empty")}'));
  assert.match(leer, /^title=\{t\("strengthsSection\.empty"\)\}\s*text=\{t\("strengthsSection\.emptyText"\)\}\s*href="\/profile\?step=strengths"\s*cta=\{t\("strengthsSection\.emptyCta"\)\}/);
  const de = bundle("de").strengthsSection as Record<string, string>;
  const en = bundle("en").strengthsSection as Record<string, string>;
  assert.equal(de.empty, "Du hast deine Stärken noch nicht festgehalten.");
  assert.equal(de.emptyCta, "Stärken festhalten");
  assert.equal(en.empty, "You haven't recorded your strengths yet.");
  assert.ok(de.emptyText && en.emptyText && en.emptyCta);
  // Das Ziel ist ein echter Schritt des Editors - mit Formular, nicht nur ein Anker.
  const editor = source(join("src", "app", "(product)", "profile", "page.tsx"));
  assert.match(editor, /const PAGE_STEPS = \[[\s\S]*?"strengths"[\s\S]*?\]/);
  assert.match(editor, /\{step === "strengths" \? \(/);
  assert.match(editor, /<StrengthsSection/);
  // Der Interview-Weg als zweite Aktion - SEIT DEM 18.10.2026 das eigene
  // Staerken-Interview, nicht mehr das Capability-Interview (/profile/interview),
  // das am Ende in Funktionsbereiche einordnet.
  assert.match(leer, /secondary=\{\{ href: "\/profile\/strengths-interview", cta: t\("strengthsSection\.interviewCta"\) \}\}/);
  assert.doesNotMatch(leer, /href: "\/profile\/interview"/);
  assert.ok(existsSync(join("src", "app", "(product)", "profile", "strengths-interview", "page.tsx")), "das Staerken-Interview gibt es nicht");
  for (const locale of ["de", "en"]) {
    assert.ok((bundle(locale).strengthsSection as Record<string, string>).interviewCta, `${locale}: interviewCta`);
    const strengths = JSON.parse(source(join("messages", locale, "capability.json"))).strengths;
    assert.ok(strengths.interviewTitle && strengths.interviewText && strengths.interviewCta, `${locale}: Interview-Copy im Editor`);
    assert.doesNotMatch(strengths.interviewText, /werden automatisch|will automatically|garantiert|guaranteed/i);
  }
  const editorSection = source(join("src", "features", "capability", "StrengthsSection.tsx"));
  assert.match(editorSection, /href="\/profile\/strengths-interview"/);
  assert.doesNotMatch(editorSection, /href="\/profile\/interview"/);
  assert.match(editorSection, /t\("interviewCta"\)/);
});

test("Vorhaben: ohne Archiv, eindeutig beschriftet, nie der Knopftext als Name", () => {
  const page = codeOnly(PAGE);
  assert.doesNotMatch(page, /venture\.name\?\.trim\(\) \|\| t\("ventures\.cta"\)/, "namenlose Vorhaben heissen wieder wie der Knopf");
  assert.match(page, /t\("ventures\.unnamedDated", \{ date: dateLabel\(venture\.createdAt\) \}\)/);
  assert.match(page, /venture\.duplicateIndex \? `\$\{label\} \(\$\{venture\.duplicateIndex\}\)` : label/);
  assert.match(codeOnly(join("src", "features", "reporting", "profileReadModel.ts")), /visibleVentures: profileVentures\(ventures\)/);
  for (const locale of ["de", "en"]) {
    const v = bundle(locale).ventures as Record<string, string>;
    for (const key of ["unnamed", "unnamedDated", "alone", "withTeam"]) assert.ok(v[key], `${locale}: ventures.${key}`);
    assert.match(v.unnamedDated, /\{date\}/);
  }
});
