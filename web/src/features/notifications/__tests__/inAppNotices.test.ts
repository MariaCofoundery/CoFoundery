import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { IN_APP_NOTICE_KINDS } from "@/features/notifications/inAppNotice";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung Begriffe in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261033120000_in_app_notices.sql";
const NETWORK = "src/features/notifications/networkNotification.ts";
const ACTIONS = "src/features/notifications/inAppNoticeActions.ts";
const WILD = "src/features/founderInTheWild/founderInTheWildActions.ts";
const READ_MY_MIND = "src/features/collaborationLab/readMyMindActions.ts";

// ---------------------------------------------------------------------------
// Hinweise in der Anwendung
// ---------------------------------------------------------------------------
//
// GEWÜNSCHT AM 21.09.2026, nachdem eine Übergabe in Align nur per Mail ankam:
// "Es wäre voll gut, wenn diese Benachrichtigung eben auch in der App
// angezeigt wird. Oder generell bei Nachrichten so, hey, dein potenzieller
// Co-Founder hat XY ausgefüllt. Du bist dran. Und das müsste bei allen Sachen
// so sein."
//
// Die Grenzen selbst - wer wem etwas hinterlegen darf, dass eine erfundene
// Vorgangs-ID wertlos ist, dass eine Blockierung gilt - stehen in
// `supabase/tests/in_app_notices.sql`. Hier steht, was der Code zusagt.

test("die Liste der Arten im Code und in der Datenbank ist dieselbe", () => {
  // Wäre sie im Code kürzer, gäbe es einen Anlass ohne Hinweis. Wäre sie
  // länger, liefe ein Hinweis in einen Constraint-Fehler - und zwar erst beim
  // Nutzer, weil hier nichts ihn vorher bemerkt.
  const migration = sqlCodeOnly(MIGRATION);
  const block = migration.slice(
    migration.indexOf("in_app_notices_kind_check"),
    migration.indexOf("in_app_notices_path_check")
  );
  const inDatabase = [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(inDatabase, [...IN_APP_NOTICE_KINDS].sort());
});

test("eine Nachricht erzeugt keinen Hinweis - das Postfach zählt sie selbst", () => {
  // Eine zweite Liste, die neben der Gesprächsliste steht und sagt "da ist
  // eine Nachricht", ist kein Hinweis, sondern Rauschen. Die Art fehlt
  // deshalb in beiden Listen, und WEIL sie fehlt, verlangt TypeScript in
  // notifyNetwork eine ausdrückliche Ausnahme: Die Entscheidung steht im
  // Code und nicht nur in einem Kommentar.
  assert.ok(!(IN_APP_NOTICE_KINDS as readonly string[]).includes("message"));
  assert.match(codeOnly(NETWORK), /params\.kind !== "message"/);
});

test("der Hinweis in der Anwendung hängt nicht am Mail-Schalter", () => {
  // DIE ENTSCHEIDUNG: Mail und Mitteilung hängen an einem gemeinsamen
  // Anspruch, und der prüft `wants_email_notification`. Für sie ist das
  // richtig - beide gehen an Orte, die wir nicht kennen. Der Hinweis in der
  // App geht nirgendwo hin; wer die MAILS abbestellt hat, hat nicht das
  // Produkt abbestellt.
  //
  // Geprüft wird die Reihenfolge, weil genau sie die Zusage trägt: Steht der
  // Hinweis hinter dem Anspruch, verschwindet er still mit der abbestellten
  // Mail.
  const network = codeOnly(NETWORK);
  assert.ok(
    network.indexOf("createInAppNotice") < network.indexOf("await claim("),
    "der Hinweis muss vor dem Anspruch stehen"
  );

  for (const path of [WILD, READ_MY_MIND]) {
    const code = codeOnly(path);
    assert.ok(
      code.indexOf("createInAppNotice") < code.indexOf("wants_email_notification"),
      `${path}: der Hinweis muss vor der Schalter-Abfrage stehen`
    );
  }
});

test("beide Align-Übergaben hinterlegen einen Hinweis", () => {
  // Das war der Anlass: "Ich habe dieses Founder in the Wild ausgefüllt und
  // habe dann das andere Profil quasi per E-Mail benachrichtigt."
  assert.match(codeOnly(WILD), /kind: "founder_in_the_wild_handoff"/);
  assert.match(codeOnly(READ_MY_MIND), /kind: "read_my_mind_handoff"/);
});

test("das Ziel kommt aus der eigenen Zeile, nicht aus dem Formular", () => {
  // Ein Formularfeld mit dem Ziel wäre eine Weiterleitung, die der Absender
  // bestimmt. Geschickt wird nur die Kennung; wohin es geht, sagt die Zeile -
  // und die darf laut Tabelle nur einen Pfad in diesem Produkt enthalten.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /formData\.get\("noticeId"\)/);
  assert.doesNotMatch(actions, /formData\.get\("path"\)/);
  assert.match(actions, /select\("path"\)/);
});

test("die Tabelle lässt nur einen Pfad in diesem Produkt zu", () => {
  // `//fremde-seite.de` liest ein Browser als Adresse mit weggelassenem
  // Protokoll. Das zweite Zeichen muss deshalb ein Buchstabe, eine Ziffer
  // oder ein Unterstrich sein - sonst wäre ein Hinweis der Weg, auf dem
  // jemand nach draußen geschickt wird, weil er dem Hinweis vertraut.
  const migration = sqlCodeOnly(MIGRATION);
  assert.equal((migration.match(/\^\/\[A-Za-z0-9_\]\[A-Za-z0-9\/_#\?=&\.-\]\*\$/g) ?? []).length, 2,
    "die Regel muss im Constraint UND in der stillen Absage der Funktion stehen");
  // Und die Länge darf nicht als Wiederholungszahl im Muster stehen: Postgres
  // lässt in {n,m} höchstens 255 zu und lehnt ein {0,300} als ungültigen
  // Ausdruck ab - der Check schlug dann bei JEDEM Hinweis fehl.
  assert.doesNotMatch(migration, /\{0,300\}/);
});

test("niemand schreibt selbst in die Tabelle, und niemand schreibt Text hinein", () => {
  const migration = sqlCodeOnly(MIGRATION);
  // Kein INSERT-Recht: Der einzige Weg hinein ist die Funktion, die prüft.
  assert.doesNotMatch(migration, /grant insert on (table )?public\.in_app_notices/i);
  assert.match(migration, /grant update \(read_at\)/);
  // Kein gespeicherter Text: Die Worte entstehen beim Anzeigen in der Sprache
  // der LESERIN. Eine gespeicherte Formulierung wäre in der falschen Sprache,
  // sobald jemand seine Sprache ändert - genau der Fehler, der am 18.09.2026
  // bei den Mails behoben wurde.
  const table = migration.slice(
    migration.indexOf("create table"),
    migration.indexOf("alter table")
  );
  for (const forbidden of ["title", "body", "headline", "message text"]) {
    assert.ok(!table.includes(forbidden), `die Zeile darf kein "${forbidden}" enthalten`);
  }
});

test("es steht kein Name im Hinweis", () => {
  // In Find sieht man einander als das, was im Discovery-Profil steht. Ein
  // Hinweis darf nicht mehr verraten als die Seite, von der er handelt -
  // sonst wäre er der Weg, auf dem ein Name herauskommt, den die Person dort
  // gar nicht zeigt. Wer es war, steht dort, wohin er führt.
  const view = codeOnly("src/features/notifications/WaitingNotices.tsx");
  assert.doesNotMatch(view, /displayName|senderName|actorName/);
  const data = codeOnly("src/features/notifications/inAppNoticeData.ts");
  assert.doesNotMatch(data, /display_name/);
});

test("jede Art hat in beiden Sprachen einen Satz", () => {
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(readFileSync(`messages/${locale}/notices.json`, "utf8")) as {
      kinds: Record<string, string>;
      badge: string;
    };
    for (const kind of IN_APP_NOTICE_KINDS) {
      assert.ok(bundle.kinds[kind], `${locale}: ${kind} hat keinen Satz`);
    }
    // Keine Art zu viel: Ein Satz ohne Anlass ist ein Versprechen, das nichts
    // einlöst.
    assert.deepEqual(
      Object.keys(bundle.kinds).sort(),
      [...IN_APP_NOTICE_KINDS].sort(),
      `${locale}: die Sätze und die Arten stimmen nicht überein`
    );
    assert.match(bundle.badge, /plural/, `${locale}: die Zahl beugt nicht`);
  }
});

test("die Liste zeigt nur, was noch wartet", () => {
  // Ein Hinweis ist kein Verlauf. Er sagt "du bist dran", und wenn man dran
  // war, hat er seine Aufgabe erfüllt. Eine Liste, die alles behält, ist nach
  // zwei Wochen eine Liste, die niemand mehr ansieht.
  const data = codeOnly("src/features/notifications/inAppNoticeData.ts");
  assert.equal((data.match(/\.is\("read_at", null\)/g) ?? []).length, 2);
});
