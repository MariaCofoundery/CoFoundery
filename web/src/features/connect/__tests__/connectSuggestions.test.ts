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
const TERMS_MIGRATION = "../supabase/migrations/20261019120000_connect_match_terms_from_asks.sql";
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

test("was ich suche, zaehlt als Kriterium mit", () => {
  // MARIAS FRAGE WAR: "Welche Kriterien?" Bis zum 21.09.2026 war die Antwort
  // unvollstaendig - verglichen wurde nur, was jemand KANN (expertise,
  // industries). Gefunden wurde damit "jemand bietet etwas aus deinem
  // Fachgebiet"; wer Podcasts macht, braucht aber nicht vorrangig andere
  // Podcast-Leute. Die deutlichste Aussage darueber, was jemand WILL, steht in
  // dem, was er selbst ausgeschrieben hat.
  //
  // Das Verhalten prueft `supabase/tests/connect_match_terms.sql` mit 9
  // pgTAP-Faellen - darunter der Fall, der vorher nicht gefunden wurde: Mara
  // sucht Finanzierung, Fina bietet sie, und "Finanzierung" steht nirgends in
  // Maras Profil.
  const terms = sqlCodeOnly(TERMS_MIGRATION);
  assert.match(terms, /listing\.direction = 'seeking'/, "eigene Gesuche zaehlen nicht mit");
  assert.match(terms, /problem\.author_user_id = p_user_id/, "eigene Probleme zaehlen nicht mit");

  // Nur AKTIVE, nicht abgelaufene Bitten: Eine ausgelaufene Anzeige ist eine
  // zurueckgezogene Bitte, ein Entwurf ist ein Gedanke.
  assert.match(terms, /listing\.status = 'active'/);
  assert.match(terms, /listing\.expires_at > now\(\)/);

  // Die Grenze von drei Zeichen bleibt: Kurze Woerter treffen ueberall.
  assert.match(terms, /char_length\(source\.term\) >= 3/);

  // WAS SICH NICHT AENDERT: Ein fremdes Gesuch bleibt aussen vor. Hier wandert
  // nur die EIGENE Bitte in die Suchbegriffe - die Vorschlagsliste selbst
  // zeigt weiter nur Angebote.
  assert.match(sqlCodeOnly(MIGRATION), /listing\.direction = 'offering'/);

  // Und die Funktion beantwortet nur noch Fragen nach der eigenen Person: Mit
  // Gesuchen und Problemen darin waere sie sonst eine Zusammenfassung dessen,
  // was jemanden umtreibt - herausgegeben an jeden Angemeldeten.
  assert.match(terms, /p_user_id <> auth\.uid\(\)/);
  assert.match(terms, /raise exception 'own_terms_only'/);

  // Der leere Zustand zeigt auf die wirksamere Handlung: ein Gesuch
  // aufschreiben bringt jetzt mehr als ein weiteres Wort im Profil.
  const page = codeOnly(PAGE);
  const askAt = page.indexOf('t("suggestions.emptyCtaAsk")');
  const profileAt = page.indexOf('t("suggestions.emptyCta")');
  assert.ok(askAt > 0 && askAt < profileAt, "der leere Zustand zeigt zuerst aufs Profil");
  for (const locale of ["de", "en"]) {
    const suggestions = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        suggestions: Record<string, string>;
      }
    ).suggestions;
    assert.ok(suggestions.emptyCtaAsk, `${locale}: suggestions.emptyCtaAsk fehlt`);
    // Und der erklaerende Satz nennt die neuen Quellen - sonst wundert man
    // sich, woher ein Treffer kommt, der nicht im Profil steht.
    assert.match(
      suggestions.text,
      locale === "de" ? /Gesuche/ : /requests/,
      `${locale}: der Text nennt die Gesuche nicht`
    );
  }
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

test("der Weg dorthin sagt, dass etwas dort liegt", () => {
  // MARIAS FRAGE WAR: "Wo sehe ich dann, wer mir vorgeschlagen wird?" Der Link
  // in "Meine Sachen" beantwortete sie nur fuer den, der ohnehin nachsieht.
  // Und weil ausdruecklich NICHTS per Mail hinausgeht, ist dieses Zeichen die
  // einzige Stelle, an der ein Vorschlag sich bemerkbar machen kann.
  const nav = codeOnly("src/features/connect/ConnectMineNav.tsx");
  assert.match(nav, /countOpenConnectSuggestions/);
  assert.match(nav, /link\.key === "suggestions" && suggestionCount > 0/);

  // NICHT ROT. Rot ist in Connect fuer das reserviert, wo ein Mensch auf eine
  // Antwort wartet - eine Anfrage, eine Nachricht. Ein Vorschlag wartet nicht,
  // und eine rote Zahl, die auch fuer Unwichtiges leuchtet, verliert ihre
  // Bedeutung fuer das Wichtige.
  assert.doesNotMatch(nav, /bg-red/, "die Vorschlagszahl leuchtet wie eine Anfrage");

  // Die Zahl braucht einen vorlesbaren Namen - "3" allein sagt einem
  // Screenreader nichts.
  assert.match(nav, /aria-label=\{t\("mine\.suggestionCount"/);
  for (const locale of ["de", "en"]) {
    const mine = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        mine: Record<string, string>;
      }
    ).mine;
    assert.ok(mine.suggestionCount, `${locale}: mine.suggestionCount fehlt`);
    // Gebeugt: "1 Vorschläge" ist der Fehler, den man in jeder zweiten
    // Anwendung liest.
    assert.match(mine.suggestionCount, /\{count, plural,/, `${locale}: ungebeugt`);
  }

  // Und die Zahl darf nicht fuer jeden null sein, der die Unterseite noch nie
  // geoeffnet hat: Auf der Uebersicht wird deshalb auch erzeugt.
  assert.match(
    codeOnly("src/app/(product)/connect/page.tsx"),
    /generateConnectSuggestions\(client\)/,
    "die Uebersicht erzeugt nichts - dann bleibt die Zahl bei null"
  );
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
