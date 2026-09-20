import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  NOTIFICATION_KINDS,
  isNotificationKind,
  notificationKindsByArea,
} from "@/features/account/notificationKinds";
import { ACCOUNT_EXPORT_TABLES } from "@/features/account/accountExport";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;
const sqlWithoutComments = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261001120000_account_locale_and_notifications.sql";

/**
 * Migrationen sind append-only: Die gueltige Fassung einer Regel steht in der
 * JUENGSTEN Datei, die sie nennt, nicht in der, die sie eingefuehrt hat. Ein
 * fester Pfad hier hat am 20.09.2026 eine erweiterte Werteliste uebersehen.
 */
const latestMigrationWith = (marker: string) => {
  const dir = "../supabase/migrations";
  const file = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .filter((name) => readFileSync(`${dir}/${name}`, "utf8").includes(marker))
    .at(-1);
  assert.ok(file, `keine Migration nennt ${marker}`);
  return sqlWithoutComments(`${dir}/${file}`);
};
const ACTIONS = "src/features/account/accountPreferenceActions.ts";
const RECIPIENT = "src/lib/email/notificationRecipient.ts";

const accountCopy = (locale: string) =>
  (readJson(`messages/${locale}/dashboard.json`).account ?? {}) as Record<string, never>;

// ---------------------------------------------------------------------------
// Jede Mailart hat einen Schalter
// ---------------------------------------------------------------------------
test("die Liste im Code und die Werteliste in der Datenbank sind dieselbe", () => {
  const migration = latestMigrationWith("notification_opt_outs_kind_check");
  const block = migration.slice(
    migration.indexOf("notification_opt_outs_kind_check"),
    migration.indexOf("))", migration.indexOf("notification_opt_outs_kind_check"))
  );
  const inDatabase = [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();

  assert.deepEqual(
    NOTIFICATION_KINDS.map((entry) => entry.kind).sort(),
    inDatabase,
    "eine Abbestellung liefe sonst in einen Constraint-Fehler - oder eine Mailart haette keinen Schalter"
  );
});

test("jede Mailart, die verschickt wird, fragt vorher nach", () => {
  // Das war der Ausgangspunkt: EIN Schalter fuer sieben Arten, und er wirkte
  // auf drei davon.
  const gates: [string, string][] = [
    ["src/features/connect/savedSearchNotifications.ts", "connect_saved_search"],
    ["src/features/discovery/discoverySavedSearchNotifications.ts", "discovery_saved_search"],
    ["src/features/collaborationLab/readMyMindActions.ts", "read_my_mind"],
    ["src/features/founderInTheWild/founderInTheWildActions.ts", "founder_in_the_wild"],
  ];
  for (const [path, kind] of gates) {
    const code = source(path);
    assert.match(code, /rpc\("wants_email_notification"/, `${path}: fragt niemanden`);
    assert.match(code, new RegExp(`p_kind: "${kind}"`), `${path}: fragt nach der falschen Art`);
    assert.match(code, /wanted !== true/, `${path}: fragt, aber richtet sich nicht danach`);
  }

  // Die drei Connect-Arten haengen weiterhin am Anspruch, der dieselbe
  // Funktion aufruft - ein zweiter Weg waere ein zweiter Ort zum Vergessen.
  const migration = sqlWithoutComments(MIGRATION);
  assert.match(migration, /if not public\.wants_email_notification\(p_recipient_user_id, p_kind\) then/);

  // Und die Arten OHNE eigenen Schalter haengen ausdruecklich an einem, der
  // sie beschreibt. approach_interest liess sich bis zum 20.09.2026 gar nicht
  // abbestellen: Die Zeile waere am Constraint gescheitert.
  const gate = latestMigrationWith("create or replace function public.wants_email_notification");
  assert.match(gate, /when p_kind = 'approach_interest' then 'problem_interest'/);
});

test("eine neue Mailart ist automatisch an, nicht stumm", () => {
  const migration = latestMigrationWith("create or replace function public.wants_email_notification");
  // Gespeichert werden Abbestellungen, nicht Zustimmungen. Eine Tabelle mit
  // Ja-Zeilen haette jede spaeter dazukommende Art fuer alle Bestandsleute
  // stillgelegt.
  assert.match(migration, /select p_user_id is not null and not exists/);
  assert.match(source(ACTIONS), /NOTIFICATION_KINDS\.filter\(\(entry\) => !wanted\.has\(entry\.kind\)\)/);
});

test("Einladungen lassen sich nicht abbestellen", () => {
  // Eine Einladung IST die Nachricht - und geht oft an Menschen ohne Konto.
  for (const kind of NOTIFICATION_KINDS) {
    assert.doesNotMatch(kind.kind, /invite|invitation/);
  }
  assert.equal(isNotificationKind("advisor_invite"), false);
  for (const locale of ["de", "en"]) {
    const notifications = accountCopy(locale).notifications as unknown as { alwaysSent?: string };
    assert.ok(notifications?.alwaysSent, `${locale}: es steht nicht da, dass sie immer kommen`);
  }
});

test("jede Mailart hat einen Text in beiden Sprachen und liegt in einem Bereich", () => {
  for (const locale of ["de", "en"]) {
    const notifications = accountCopy(locale).notifications as unknown as {
      kinds: Record<string, { title?: string; text?: string }>;
      areas: Record<string, string>;
    };
    for (const { kind, area } of NOTIFICATION_KINDS) {
      assert.ok(notifications.kinds?.[kind]?.title, `${locale}: ${kind} hat keine Ueberschrift`);
      assert.ok(notifications.kinds?.[kind]?.text, `${locale}: ${kind} erklaert sich nicht`);
      assert.ok(notifications.areas?.[area], `${locale}: Bereich ${area} fehlt`);
    }
  }
  assert.ok(notificationKindsByArea("connect").length >= 3);
  assert.ok(notificationKindsByArea("find").length >= 1);
  assert.ok(notificationKindsByArea("align").length >= 1);
});

// ---------------------------------------------------------------------------
// Die Sprache der Empfaengerin
// ---------------------------------------------------------------------------
test("Benachrichtigungen kommen in der Sprache der Empfaengerin an", () => {
  // Der Fehler: getRequestLocale() liefert die Sprache der laufenden ANFRAGE.
  // Eine Benachrichtigung entsteht aber durch die Handlung eines anderen
  // Menschen - wer eine Anzeige veroeffentlicht, loeste Mails in SEINER
  // Sprache aus.
  const senders = [
    // Die Mechanik fuer Connect UND Find steht seit dem 20.09.2026 an einer
    // Stelle - vorher stand sie in connectNotifications.ts.
    "src/features/notifications/networkNotification.ts",
    "src/features/connect/savedSearchNotifications.ts",
    "src/features/discovery/discoverySavedSearchNotifications.ts",
    "src/features/collaborationLab/readMyMindActions.ts",
    "src/features/founderInTheWild/founderInTheWildActions.ts",
  ];
  for (const path of senders) {
    const code = source(path);
    assert.doesNotMatch(code, /getRequestLocale/, `${path}: nimmt noch die Sprache der Anfrage`);
    assert.match(code, /getNotificationRecipient\(/, `${path}: holt den Empfaenger nicht`);
    assert.match(code, /recipient\.locale/, `${path}: nutzt die Sprache des Empfaengers nicht`);
  }

  const recipient = source(RECIPIENT);
  assert.match(recipient, /\.select\("locale"\)/);
  // Keine Wahl getroffen heisst Standardsprache - und ausdruecklich nicht die
  // der ausloesenden Anfrage, sonst waere der Fehler nur seltener.
  assert.match(recipient, /core\?\.locale \? normalizeLocale\(core\.locale\) : DEFAULT_LOCALE/);
});

test("die Sprache wird an beiden Stellen gespeichert", () => {
  const actions = source(ACTIONS);
  // Das Cookie entscheidet ueber die Oberflaeche, person_core ueber die Mails.
  // Nur eines von beidem zu schreiben hiesse, dass eine der beiden Seiten
  // stillschweigend etwas anderes tut.
  assert.match(actions, /from\("person_core"\)\.update\(\{ locale \}\)/);
  assert.match(actions, /cookies\(\)\)\.set\(LOCALE_COOKIE_NAME, locale/);
});

test("null heisst nicht entschieden, nicht Deutsch", () => {
  const migration = sqlWithoutComments(MIGRATION);
  assert.match(migration, /add column locale text,/);
  assert.doesNotMatch(migration, /add column locale text not null/);
  assert.doesNotMatch(migration, /locale text default/);

  for (const locale of ["de", "en"]) {
    const copy = accountCopy(locale).locale as unknown as { undecided?: string };
    assert.ok(copy?.undecided, `${locale}: der Fall "noch nichts gewaehlt" wird nicht erklaert`);
  }
});

// ---------------------------------------------------------------------------
// Die Uebernahme des alten Schalters
// ---------------------------------------------------------------------------
test("der alte Schalter wird uebernommen, ohne mehr abzuschalten als er konnte", () => {
  const migration = sqlWithoutComments(MIGRATION);
  const backfill = migration.slice(
    migration.indexOf("insert into public.notification_opt_outs(user_id, kind)"),
    migration.indexOf("on conflict do nothing;")
  );
  const kinds = [...backfill.matchAll(/\('([a-z_]+)'\)/g)].map((match) => match[1]).sort();

  // Der Schalter hiess "Benachrichtigungen aus Connect", sein Text nannte aber
  // nur diese drei. Suchtreffer kamen auch dann an, wenn er aus war - sie hier
  // mit abzubestellen waere eine Aenderung an dem, was diese Menschen heute
  // bekommen, ohne dass sie gefragt wurden.
  assert.deepEqual(kinds, ["contact_request", "message", "problem_interest"]);
  assert.ok(!kinds.includes("connect_saved_search"));
});

test("der alte Schalter wird nicht mehr gelesen", () => {
  const migration = sqlWithoutComments(MIGRATION);
  const claim = migration.slice(migration.indexOf("create or replace function public.claim_network_notification"));
  assert.doesNotMatch(claim, /email_notifications/, "zwei Wahrheiten ueber dieselbe Einstellung");
  // Die aktive Mitgliedschaft bleibt Bedingung: keine Post ueber ein Netzwerk,
  // in dem man gerade nicht ist.
  assert.match(claim, /membership\.status = 'active'/);
});

// ---------------------------------------------------------------------------
// Der Export
// ---------------------------------------------------------------------------
test("der Export liest mit den Rechten der Person, nicht privilegiert", () => {
  const code = source("src/features/account/accountExport.ts");
  // Die Zeilensicherheit beantwortet "was gehoert dieser Person" schon an
  // jeder Tabelle. Ein privilegierter Export muesste dieselbe Frage ein
  // zweites Mal beantworten - und jede Abweichung waere eine Datenpanne.
  assert.doesNotMatch(code, /SERVICE_ROLE|service_role|admin\./);
  assert.match(code, /client\.from\(table\)\.select\("\*"\)\.eq\(column, userId\)/);

  // Die Spalte steht trotzdem dabei: Ohne sie kaemen bei Tabellen mit zwei
  // Beteiligten auch die Zeilen der anderen Person mit.
  for (const entry of ACCOUNT_EXPORT_TABLES) {
    assert.ok(entry.column.endsWith("user_id"), `${entry.table}: keine Personenspalte`);
  }
  assert.ok(ACCOUNT_EXPORT_TABLES.length >= 12, "der Export deckt zu wenig ab");
});

test("eine fehlende Tabelle laesst den Export nicht platzen, sondern wird genannt", () => {
  const code = source("src/features/account/accountExport.ts");
  // Ein Export, der wegen einer Tabelle gar nicht entsteht, hilft niemandem -
  // einer, der stillschweigend weniger enthaelt, ist schlimmer.
  assert.match(code, /nichtEnthalten\.push\(\{ tabelle: table, grund: error\.message \}\)/);
});

test("der Export wird als Datei ausgeliefert und nicht zwischengespeichert", () => {
  const route = source("src/app/api/account/export/route.ts");
  assert.match(route, /content-disposition": `attachment; filename=/);
  assert.match(route, /"cache-control": "no-store, private"/);
  assert.match(route, /status: 401/, "ohne Anmeldung gibt es nichts");
});

test("der Export sagt, was NICHT drin ist", () => {
  const code = source("src/features/account/accountExport.ts");
  assert.match(code, /Nachrichten anderer Menschen sind nicht dabei/);
  for (const locale of ["de", "en"]) {
    const data = accountCopy(locale).data as unknown as { scope?: string };
    assert.ok((data?.scope ?? "").length > 40, `${locale}: der Umfang wird nicht erklaert`);
  }
});

// ---------------------------------------------------------------------------
// Die Einwilligung
// ---------------------------------------------------------------------------
test("die Forschungs-Einwilligung laesst sich im Konto zuruecknehmen", () => {
  // Sie liess sich nur auf dem Align-Dashboard aendern. Wer nur in Connect
  // unterwegs ist, sieht dieses Dashboard nie - und der Widerruf muss so
  // leicht sein wie die Zustimmung.
  const page = source("src/app/(product)/account/page.tsx");
  assert.match(page, /<ResearchConsentSettings initialState=\{researchConsentState\}/);
  assert.match(page, /getResearchConsentState\(supabase, user\.id\)/);
});
