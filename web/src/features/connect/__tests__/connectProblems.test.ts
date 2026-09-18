import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONNECT_PROBLEM_INTENTS,
  PROBLEM_DESCRIPTION_MAX,
  PROBLEM_DESCRIPTION_MIN,
  PROBLEM_INTEREST_NOTE_MIN,
  PROBLEM_TITLE_MAX,
  PROBLEM_TITLE_MIN,
  isConnectProblemIntent,
} from "@/features/connect/connectTypes";

const source = (path: string) => readFileSync(path, "utf8");

/**
 * Quelltext ohne Kommentare.
 *
 * Fuer Pruefungen der Form "das darf im Code nicht vorkommen". Ein Kommentar,
 * der erklaert, WARUM etwas fehlt, nennt die Sache beim Namen - und laesst
 * genau die Pruefung fehlschlagen, die das Fehlen sichern soll. Das ist mir in
 * dieser Sitzung sechsmal passiert; deshalb hier einmal richtig.
 */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const BOARD = "src/app/(product)/connect/problems/page.tsx";
const DETAIL = "src/app/(product)/connect/problems/[problemId]/page.tsx";
const NEW = "src/app/(product)/connect/problems/new/page.tsx";
const DATA = "src/features/connect/connectProblemData.ts";
const ACTIONS = "src/features/connect/connectProblemActions.ts";
const MIGRATION = "../supabase/migrations/20260915140000_create_network_problems_v01.sql";

// ---------------------------------------------------------------------------
// Kein Feed
// ---------------------------------------------------------------------------
test("the board is sorted by recency, never by approval", () => {
  const data = source(DATA);
  // Eine Sortierung nach Zuspruch waere eine Rangliste - genau das soll das
  // Brett nicht sein.
  assert.match(data, /\.order\("published_at", \{ ascending: false \}\)/);
  assert.doesNotMatch(data, /order\("interest_count"/);
  assert.doesNotMatch(source(BOARD), /sort\(/);
});

test("the count is shown, the names are not", () => {
  const board = source(BOARD);
  // Auf dem Brett steht nur die Zahl. Die Namen holt die Detailseite, und die
  // Datenbank gibt sie nur der einstellenden Person.
  assert.match(board, /problems\.interestCount/);
  assert.doesNotMatch(board, /getConnectProblemInterests/);

  const detail = source(DETAIL);
  assert.match(detail, /isAuthor \? getConnectProblemInterests\(client, problemId\)/);
});

test("there is no like and no comment anywhere", () => {
  for (const path of [BOARD, DETAIL, NEW, ACTIONS, DATA]) {
    assert.doesNotMatch(
      codeOnly(path),
      /\blike\b|upvote|reaction|comment/i,
      `${path} enthaelt Feed-Mechanik`
    );
  }
});

test("expressing interest requires words", () => {
  const actions = source(ACTIONS);
  // Ein Klick ohne Begruendung waere ein Like.
  assert.match(actions, /note\.length < PROBLEM_INTEREST_NOTE_MIN/);
  assert.equal(PROBLEM_INTEREST_NOTE_MIN, 10);
  assert.match(source(DETAIL), /minLength=\{PROBLEM_INTEREST_NOTE_MIN\}/);
});

// ---------------------------------------------------------------------------
// Die Grenzen stimmen mit der Datenbank ueberein
// ---------------------------------------------------------------------------
test("the limits in the code match the database constraints", () => {
  const migration = source(MIGRATION);
  // Zwei Wahrheiten ueber dieselbe Grenze fuehren dazu, dass das Formular
  // etwas erlaubt, das die Datenbank ablehnt - und die Meldung kommt dann
  // nach der Arbeit.
  assert.match(migration, new RegExp(`between ${PROBLEM_TITLE_MIN} and ${PROBLEM_TITLE_MAX}`));
  assert.match(migration, new RegExp(`between ${PROBLEM_DESCRIPTION_MIN} and ${PROBLEM_DESCRIPTION_MAX}`));
  assert.match(migration, new RegExp(`between ${PROBLEM_INTEREST_NOTE_MIN} and 500`));
});

test("the three intents match the check constraint", () => {
  const migration = source(MIGRATION);
  for (const intent of CONNECT_PROBLEM_INTENTS) {
    assert.match(migration, new RegExp(`'${intent}'`), `${intent} fehlt im Constraint`);
  }
  assert.equal(isConnectProblemIntent("wants_to_build"), true);
  assert.equal(isConnectProblemIntent("vielleicht"), false);
});

// ---------------------------------------------------------------------------
// Voraussetzungen vor der Arbeit
// ---------------------------------------------------------------------------
test("publishing a problem asks for the profile before the form, not after", () => {
  const page = source(NEW);
  assert.match(page, /hasActiveConnectProfile\(client, user\.id\)/);
  assert.match(page, /<ConnectProfileRequired/);
  // Der Knopf, der nicht funktionieren kann, wird nicht angeboten - der
  // Entwurf bleibt. Beides sitzt jetzt im gemeinsamen Formular.
  assert.match(page, /canPublish=\{canPublish\}/);
  const form = source("src/features/connect/ConnectProblemForm.tsx");
  assert.match(form, /\{canPublish \? \(/);
  assert.match(form, /intent="draft"/);
});

test("expressing interest asks for the profile too", () => {
  const detail = source(DETAIL);
  assert.match(detail, /: !hasProfile \? \(/);
  assert.match(detail, /problems\.interestProfileRequiredTitle/);
});

// ---------------------------------------------------------------------------
// Zurueckziehen
// ---------------------------------------------------------------------------
test("withdrawing interest warns that the conversation goes with it", () => {
  const detail = source(DETAIL);
  assert.match(detail, /<ConfirmSubmitButton/);
  assert.match(detail, /problems\.withdrawInterestQuestion/);

  const de = readJson("messages/de/connect.json").problems as Record<string, string>;
  // Das Gespraech haengt am Interesse - wer das nicht weiss, verliert es
  // ueberraschend.
  assert.match(de.withdrawInterestQuestion, /Gespräch/);
});

// ---------------------------------------------------------------------------
// Der Weg zum Gespraech
// ---------------------------------------------------------------------------
test("only the author gets the button that starts a conversation", () => {
  const detail = source(DETAIL);
  const authorSection = detail.slice(detail.indexOf("problems.interestedTitle"));
  assert.match(authorSection, /acceptConnectProblemInterestAction/);
  assert.match(authorSection, /problems\.startConversation/);

  const actions = source(ACTIONS);
  // Die Entscheidung liegt in der Datenbank, nicht in der Seite.
  assert.match(actions, /rpc\("accept_network_problem_interest"/);
});

test("accepting leads straight into the conversation", () => {
  const actions = source(ACTIONS);
  assert.match(actions, /redirect\(`\/connect\/messages\/\$\{data\}`\)/);
});

// ---------------------------------------------------------------------------
// Erreichbarkeit und Copy
// ---------------------------------------------------------------------------
test("the board is reachable from the Connect overview", () => {
  // GEAENDERT am 18.09.2026: Der Weg fuehrt ueber die Reiterleiste, die auf
  // allen drei Connect-Seiten steht - nicht mehr ueber einen eigenen Kasten
  // auf der Uebersicht. Die Zusage bleibt: von der Uebersicht aus erreichbar.
  const connect = source("src/app/(product)/connect/page.tsx");
  assert.match(connect, /<ConnectTabs active="listings"/);
  assert.match(
    source("src/features/connect/ConnectTabs.tsx"),
    /href: "\/connect\/problems"/,
    "und die Leiste fuehrt dorthin"
  );
  for (const locale of ["de", "en"]) {
    const navigation = (readJson(`messages/${locale}/connect.json`).navigation as Record<string, string>);
    assert.ok(navigation.problems, `${locale}: navigation.problems fehlt`);
  }
});

test("both empty states are told apart here too", () => {
  const board = source(BOARD);
  assert.match(board, /t\(isFiltered \? "problems\.emptyFiltered" : "problems\.emptyFirst"\)/);
});

test("every intent has a label and an explanation in both locales", () => {
  for (const locale of ["de", "en"]) {
    const problems = readJson(`messages/${locale}/connect.json`).problems as Record<string, Record<string, string>>;
    for (const intent of CONNECT_PROBLEM_INTENTS) {
      assert.ok(problems.intents[intent], `${locale}: intents.${intent} fehlt`);
      assert.ok(problems.intentHints[intent], `${locale}: intentHints.${intent} fehlt`);
    }
  }
});

test("both locales carry the whole problems block", () => {
  const flatten = (value: unknown, prefix = ""): string[] =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
          flatten(nested, prefix ? `${prefix}.${key}` : key)
        )
      : [prefix];
  const de = flatten(readJson("messages/de/connect.json").problems).sort();
  const en = flatten(readJson("messages/en/connect.json").problems).sort();
  assert.deepEqual(de, en);
});

test("the new error keys are allowed and have copy", () => {
  const keys = source("src/features/connect/connectFeedbackKeys.ts");
  for (const key of ["problem_title", "problem_description", "problem_intent", "interest_note"]) {
    assert.match(keys, new RegExp(`"${key}"`), `${key} fehlt in der Allowlist`);
    for (const locale of ["de", "en"]) {
      const errors = readJson(`messages/${locale}/connect.json`).errors as Record<string, string>;
      assert.ok(errors[key], `${locale}: errors.${key} fehlt`);
    }
  }
});

// ---------------------------------------------------------------------------
// Uebersicht und Bearbeiten
// ---------------------------------------------------------------------------
test("drafts are reachable, and there is no second overview", () => {
  const my = source("src/app/(product)/connect/my/page.tsx");
  // Ohne diesen Abschnitt waeren Entwuerfe nur ueber den direkten Link
  // erreichbar - eine Funktion, die halb gebaut ist.
  assert.match(my, /getOwnConnectProblems\(client, user\.id\)/);
  assert.match(my, /my\.problemsTitle/);
  assert.match(my, /\/connect\/problems\/\$\{problem\.id\}\/edit/);

  const de = readJson("messages/de/connect.json").my as Record<string, string>;
  // "Meine Probleme" liest sich wie persoenliche Sorgen.
  assert.doesNotMatch(de.problemsTitle, /Meine Probleme/);
});

test("the form exists once, for creating and editing", () => {
  const form = source("src/features/connect/ConnectProblemForm.tsx");
  assert.match(form, /problem\?: ConnectProblem/);
  for (const page of [NEW, "src/app/(product)/connect/problems/[problemId]/edit/page.tsx"]) {
    assert.match(source(page), /<ConnectProblemForm/, `${page} baut das Formular selbst`);
  }
});

test("editing keeps a published problem published", () => {
  const actions = source(ACTIONS);
  // Sonst wuerde ein Speichern die Veroeffentlichung versehentlich
  // zuruecknehmen - und die Interessierten saehen den Eintrag nicht mehr.
  assert.match(actions, /existing\.status === "active" \? "active"/);
  assert.match(source("src/app/(product)/connect/problems/[problemId]/edit/page.tsx"), /redirect\(`\/connect\/problems\/\$\{problemId\}`\)/);
});

// ---------------------------------------------------------------------------
// Benachrichtigungen
// ---------------------------------------------------------------------------
test("all three occasions notify, and nothing else does", () => {
  const notifications = source("src/features/connect/connectNotifications.ts");
  for (const kind of ["contact_request", "problem_interest", "message"]) {
    assert.match(notifications, new RegExp(`"${kind}"`), `${kind} fehlt`);
  }
  // Die Liste ist in der Datenbank festgeschrieben.
  const migration = source("../supabase/migrations/20260916140000_network_notifications.sql");
  assert.match(migration, /kind in \('contact_request', 'problem_interest', 'message'\)/);
});

test("a failed email never breaks the action", () => {
  const notifications = source("src/features/connect/connectNotifications.ts");
  // Wer eine Kontaktanfrage stellt, hat sie gestellt - auch wenn die Mail
  // nicht rausgeht.
  assert.match(notifications, /try \{/);
  assert.match(notifications, /\} catch \{/);
});

test("the claim is taken before sending, not after", () => {
  const notifications = source("src/features/connect/connectNotifications.ts");
  const claimAt = notifications.indexOf("await claim(");
  const sendAt = notifications.indexOf("sendConnectNotificationEmail(");
  assert.ok(claimAt > 0 && claimAt < sendAt, "lieber eine Mail zu wenig als zwei");
});

test("an ongoing conversation does not send a mail per line", () => {
  const migration = source("../supabase/migrations/20260916140000_network_notifications.sql");
  // Wer noch nicht gelesen hat, was vorher kam, braucht keinen zweiten Hinweis.
  assert.match(migration, /network_message_notification_recipient/);
  assert.match(migration, /if v_earlier > 0 then return null; end if;/);
  // Und bei Blockierung gar nichts.
  assert.match(migration, /is_network_interaction_blocked/);
});

test("the email carries no content, only that something happened", () => {
  const email = source("src/lib/email/sendConnectNotificationEmail.ts");
  // Eine Mail landet in Postfaechern, die wir nicht kennen, und in Vorschauen
  // auf Sperrbildschirmen.
  assert.doesNotMatch(codeOnly("src/lib/email/sendConnectNotificationEmail.ts"), /messageBody|params\.message\b|noteText/);
  assert.match(email, /senderName/);
});

/**
 * GEAENDERT am 18.09.2026: Der eine Connect-Schalter ist einem Abschnitt im
 * Konto gewichen, in dem JEDE der sieben Mailarten einzeln steht - er wirkte
 * nur auf drei davon, obwohl er "Benachrichtigungen aus Connect" hiess.
 *
 * Die Zusage hier ist dieselbe geblieben und steht jetzt auf eigenen Fuessen:
 * Es gibt keinen Weg an der Einstellung vorbei, weil dieselbe Funktion, die
 * den Anspruch vergibt, sie prueft.
 */
test("the switch is reachable and the database respects it", () => {
  const account = source("src/app/(product)/account/page.tsx");
  assert.match(account, /<AccountPreferencesSection/);

  const migration = source(
    "../supabase/migrations/20261001120000_account_locale_and_notifications.sql"
  );
  assert.match(
    migration,
    /if not public\.wants_email_notification\(p_recipient_user_id, p_kind\) then\s*\n\s*return false;/
  );

  for (const locale of ["de", "en"]) {
    const kinds = (
      (readJson(`messages/${locale}/dashboard.json`).account as Record<string, unknown>)
        .notifications as { kinds: Record<string, { title?: string }> }
    ).kinds;
    for (const kind of ["contact_request", "message", "problem_interest"]) {
      assert.ok(kinds[kind]?.title, `${locale}: ${kind} hat keinen Text mehr`);
    }
  }
});
