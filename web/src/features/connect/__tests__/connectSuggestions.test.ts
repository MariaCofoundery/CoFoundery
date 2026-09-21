import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261017120000_connect_suggestions.sql";
const PERSON_MIGRATION = "../supabase/migrations/20261018120000_connect_person_suggestions.sql";
const PAGE = "src/app/(product)/connect/suggestions/page.tsx";
const DATA = "src/features/connect/connectSuggestionData.ts";

/**
 * Vorschlaege - die erste Haelfte des Matchings.
 *
 * BESPROCHEN AM 21.09.2026, und zwei Saetze von Maria bestimmen alles daran:
 * "nicht dass die KI dann einfach irgendwas macht, was sie gar nicht machen
 * soll" und "gerne nur auf der Plattform".
 *
 * Das Verhalten der Auswahl prueft `supabase/tests/connect_suggestions.sql`
 * mit 12 pgTAP-Faellen, darunter der wichtigste: Aus "Podcast" (gross) und
 * "podcast" (klein) wird ein Treffer, und ein GESUCH wird nie vorgeschlagen.
 */

test("es entscheidet kein Sprachmodell, sondern eine Mengenschnittmenge", () => {
  // DIE ANTWORT AUF DIE SORGE: Die Kandidaten kommen aus Feldern, die Menschen
  // selbst eingetragen haben. Nachlesbar, reproduzierbar, ohne Modell.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /hit\.term = any\(v_terms\)/);

  // Und nichts davon ruft irgendeine KI auf.
  for (const path of [DATA, PAGE, "src/features/connect/connectSuggestionActions.ts"]) {
    const code = codeOnly(path);
    assert.doesNotMatch(code, /askModelForJson|ollama|ai_jobs|enqueue_ai_job/i, `${path} ruft ein Modell`);
  }
});

test("jeder Vorschlag traegt seinen Grund als Daten", () => {
  // Ohne die getroffenen Woerter muesste man einer Maschine glauben. Mit ihnen
  // kann man nachsehen - und widersprechen.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /matched_terms text\[\] not null/);
  assert.match(migration, /array_length\(matched_terms, 1\) between 1 and 8/);

  const page = codeOnly(PAGE);
  assert.match(page, /suggestions\.because[\s\S]{0,120}matchedTerms\.join/);
});

test("Gross- und Kleinschreibung darf nicht ueber einen Treffer entscheiden", () => {
  // `topics` und `industries` sind freie Kommalisten, beim Speichern nur
  // getrimmt. Ohne das Kleinschreiben faende der Abgleich bei der Haelfte der
  // Eintraege still nichts.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /lower\(btrim\(raw\.value\)\)/);
  // Zu kurze Woerter treffen ueberall und machen aus einem Vorschlag Zufall.
  assert.match(migration, /char_length\(normalized\.term\) >= 3/);
});

test("nur Angebote, keine Gesuche", () => {
  // Wer etwas SUCHT, hat eine Bitte gestellt - die gehoert nicht ungefragt in
  // die Vorschlagsliste eines Fremden.
  assert.match(sqlCodeOnly(MIGRATION), /listing\.direction = 'offering'/);
  assert.doesNotMatch(sqlCodeOnly(MIGRATION), /direction = 'seeking'/);
});

test("ein Mensch wird nur vorgeschlagen, wenn er es erlaubt", () => {
  // Einen Menschen vorzuschlagen ist eine Aussage darueber, wer wem als
  // passend gilt - das braucht eine eigene Zustimmung, auch wenn der Vorschlag
  // nur bei der empfangenden Person erscheint.
  const person = sqlCodeOnly(PERSON_MIGRATION);
  assert.match(person, /and profile\.suggestable/);

  // Standardmaessig an: Wer sein Profil veroeffentlicht hat, ist ohnehin
  // auffindbar - vorgeschlagen zu werden fuegt keine neue Sichtbarkeit hinzu.
  assert.match(person, /add column if not exists suggestable boolean not null default true/);

  // Und Menschen kommen ZULETZT: Wer etwas eingestellt hat, hat schon gesagt,
  // dass er angesprochen werden moechte; ein Profil allein sagt das nicht.
  const personStep = person.indexOf("and profile.suggestable");
  const listingStep = person.indexOf("listing.direction = 'offering'");
  assert.ok(listingStep > 0 && personStep > listingStep);
});

test("der Schalter versteckt das Profil nicht", () => {
  // Ohne diesen Satz liest sich das Kaestchen wie ein Sichtbarkeitsschalter,
  // und dann haken Menschen es aus Vorsicht ab.
  for (const locale of ["de", "en"]) {
    const profile = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        profile: Record<string, string>;
      }
    ).profile;
    for (const key of ["suggestableTitle", "suggestableLabel", "suggestableHint", "suggestableOffHint"]) {
      assert.ok(profile[key], `${locale}: profile.${key} fehlt`);
    }
    assert.ok(
      profile.suggestableOffHint.length > 80,
      `${locale}: der Satz sagt nicht, was Abschalten NICHT bedeutet`
    );
  }

  // Das Kaestchen ist vorausgewaehlt - und die Abwesenheit ist die
  // Entscheidung, nicht ein fehlender Wert.
  assert.match(
    codeOnly("src/app/(product)/connect/profile/page.tsx"),
    /defaultChecked=\{profile\?\.suggestable \?\? true\}/
  );
  assert.match(
    codeOnly("src/features/connect/connectValidation.ts"),
    /suggestable: formData\.get\("suggestable"\) === "yes"/
  );
});

test("drei pro Woche, nicht dreissig", () => {
  // Ein Vorschlagsstrom wird zu Werbung, und dann sieht niemand mehr hin.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /now\(\) - interval '7 days'/);
  assert.match(migration, /least\(coalesce\(p_limit, 3\), 3\)/, "die Grenze laesst sich uebersteuern");
});

test("nur in der Plattform - es gibt gar keinen Mailweg", () => {
  // Das ist die technische Fassung des Versprechens: Nicht "die Mail ist aus",
  // sondern "es gibt keine". Ein Schalter, der noch nichts schaltet, waere ein
  // leeres Versprechen.
  const migration = sqlCodeOnly(MIGRATION);
  assert.doesNotMatch(migration, /notification|claim_network/i);

  for (const path of [DATA, PAGE]) {
    assert.doesNotMatch(codeOnly(path), /sendNetworkNotificationEmail|notifyNetwork/);
  }

  // Und der Hinweis sagt es den Menschen, in beiden Sprachen.
  for (const locale of ["de", "en"]) {
    const note = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        suggestions: { note: string };
      }
    ).suggestions.note;
    assert.match(note, locale === "de" ? /E-Mail/ : /email/i);
  }
});

test("erzeugt wird beim Hinsehen, nicht von einem Zeitplan", () => {
  // Es gibt in diesem Projekt keinen Cron - und eine Handvoll Mengenschnitte
  // braucht keinen.
  assert.ok(existsSync(PAGE));
  const page = codeOnly(PAGE);
  const generateAt = page.indexOf("generateConnectSuggestions(client)");
  const readAt = page.indexOf("getOwnConnectSuggestions(client)");
  assert.ok(generateAt > 0 && generateAt < readAt, "erst lesen, dann erzeugen");
});

test("weggeklickt heisst nicht geloescht", () => {
  // Sonst kaeme derselbe Vorschlag in der naechsten Woche wieder.
  const actions = codeOnly("src/features/connect/connectSuggestionActions.ts");
  assert.match(actions, /dismissed_at: new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(actions, /\.delete\(\)/);
  assert.match(codeOnly(DATA), /\.is\("dismissed_at", null\)/);

  // Und es braucht keinen Grund: Nach einem zu fragen macht aus einem
  // Achselzucken eine Begruendungspflicht.
  const page = codeOnly(PAGE);
  assert.doesNotMatch(page, /reason|grund/i);
});

test("ein zurueckgezogener Eintrag nimmt den Vorschlag mit", () => {
  // Ein Vorschlag auf etwas, das es nicht mehr gibt, ist eine Sackgasse.
  const migration = sqlCodeOnly(MIGRATION);
  assert.equal(
    (migration.match(/on delete cascade/g) ?? []).length >= 5,
    true,
    "die Verweise loeschen nicht mit"
  );
  // Und bis der Fremdschluessel greift, wird eine Zeile ohne Gegenstand
  // einfach nicht gezeigt.
  assert.match(codeOnly(DATA), /return \[\];/);
});

test("die Texte sagen, warum nichts da ist - in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const connect = JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
      mine: Record<string, string>;
      suggestions: Record<string, string> & { kinds: Record<string, string> };
    };
    assert.ok(connect.mine.suggestions, `${locale}: mine.suggestions fehlt`);
    for (const key of ["title", "text", "because", "dismiss", "emptyTitle", "emptyText", "emptyCta", "note"]) {
      assert.ok(connect.suggestions[key], `${locale}: suggestions.${key} fehlt`);
    }
    for (const kind of ["listing", "venture", "problem"]) {
      assert.ok(connect.suggestions.kinds[kind], `${locale}: kinds.${kind} fehlt`);
    }
    // Der leere Zustand muss sagen, was man tun kann - "nichts gefunden" allein
    // liest sich wie ein Defekt.
    assert.ok(connect.suggestions.emptyText.length > 120, `${locale}: der leere Zustand hilft nicht`);
  }
});
