import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { NOTIFICATION_EMAIL_OPT_INS } from "@/features/account/notificationKinds";
import { getNetworkNotificationEmailCopy } from "@/features/email/emailMessages";

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

const MIGRATION = "../supabase/migrations/20261020120000_suggestion_notifications.sql";
const DELIVERY = "src/features/connect/suggestionNotifications.ts";
const ROUTE = "src/app/api/cron/connect-suggestions/route.ts";
const TEST_ACTION = "src/features/connect/suggestionNotificationActions.ts";

/**
 * Vorschlaege melden sich - die zweite Haelfte des Matchings.
 *
 * BESCHLOSSEN AM 21.09.2026: "Dann machen wir das mit Push-Nachrichten. Aber
 * E-Mail waere eigentlich auch gut, wenn man das aber ausstellt."
 *
 * Das Verhalten in der Datenbank prueft `supabase/tests/suggestion_notifications.sql`
 * mit 13 pgTAP-Faellen. Hier steht, was der Versand darum herum verspricht.
 */

test("die Mail nennt eine Zahl, aber keinen Menschen und keinen Titel", () => {
  // EINE MAIL LANDET IN POSTFAECHERN, DIE WIR NICHT KENNEN, und eine
  // Mitteilung auf einem Sperrbildschirm, den jeder sieht, der das Telefon in
  // der Hand haelt. Wer vorgeschlagen wurde, steht in CoFoundery.
  for (const locale of ["de", "en"] as const) {
    const copy = getNetworkNotificationEmailCopy(locale, {
      kind: "connect_suggestions",
      senderName: null,
      count: 3,
    });
    assert.match(copy.subject, /3/, `${locale}: die Zahl fehlt`);
    // "Jemand"/"Someone" ist der Ersatzname der uebrigen Arten. Hier hat sich
    // niemand gemeldet - er waere eine falsche Behauptung.
    for (const field of [copy.subject, copy.headline, copy.intro]) {
      assert.doesNotMatch(field, /Jemand|Someone/, `${locale}: ein Absender wird behauptet`);
    }
  }
});

test("die Zahl ist gebeugt, in beiden Sprachen", () => {
  // "1 Vorschlaege" ist der Fehler, den man in jeder zweiten Anwendung liest.
  const one = getNetworkNotificationEmailCopy("de", {
    kind: "connect_suggestions",
    senderName: null,
    count: 1,
  });
  assert.match(one.subject, /^Ein Vorschlag für dich$/);

  const many = getNetworkNotificationEmailCopy("de", {
    kind: "connect_suggestions",
    senderName: null,
    count: 4,
  });
  assert.match(many.subject, /^4 Vorschläge für dich$/);

  // Und keine Meldung ueber null: Die gibt es nicht, also darf sie auch nicht
  // in einer Betreffzeile stehen.
  const none = getNetworkNotificationEmailCopy("en", {
    kind: "connect_suggestions",
    senderName: null,
    count: 0,
  });
  assert.match(none.subject, /^One suggestion for you$/);
});

test("die Fusszeile nennt die Zustimmung als Grund", () => {
  // Bei allen uebrigen Arten steht dort "wir benachrichtigen dich nur ueber
  // deine eigenen Vorgaenge" - das stimmt hier nicht: Es war kein Vorgang,
  // sondern ein Abgleich. Eine Mail, die ihren Grund nicht nennt, liest sich
  // wie ungefragte Post, und genau das darf sie nicht sein.
  const suggestions = getNetworkNotificationEmailCopy("de", {
    kind: "connect_suggestions",
    senderName: null,
    count: 2,
  });
  assert.match(suggestions.note, /zugestimmt/);

  const message = getNetworkNotificationEmailCopy("de", {
    kind: "message",
    senderName: "Mara",
    count: 2,
  });
  assert.doesNotMatch(message.note, /zugestimmt/, "die uebrigen Arten behaupten eine Zustimmung");
});

test("ueber die Wege entscheidet die Datenbank, nicht der Versand", () => {
  // ZWEI STELLEN, DIE DASSELBE BEURTEILEN, waeren genau die Stelle, an der ein
  // Versprechen auseinanderlaeuft. Der Versand nimmt die Antwort, die
  // `prepare_suggestion_notifications` mitgibt - und fragt nichts nach.
  const delivery = codeOnly(DELIVERY);
  assert.match(delivery, /withEmail: row\.wants_email === true/);
  assert.doesNotMatch(
    delivery,
    /notification_opt_ins|notification_opt_outs/,
    "der Versand beurteilt die Zustimmung selbst"
  );

  // Die Mail haengt am Schalter, die Mitteilung nicht: Dass die Zeile
  // ueberhaupt zurueckkommt, IST die Erlaubnis fuer die Mitteilung.
  assert.match(delivery, /params\.withEmail\s*\n?\s*\?\s*sendNetworkNotificationEmail/);
});

test("ein Schwung ist eine Meldung, kein Stapel", () => {
  // Wer eine Woche nicht hineingesehen hat, soll keinen Stapel vorfinden -
  // gleiche Marke ersetzt die noch nicht gelesene Mitteilung.
  assert.match(codeOnly(DELIVERY), /tag: "connect_suggestions"/);

  // Und gestempelt wird VOR dem Senden: lieber eine Meldung zu wenig als zwei.
  const migration = sqlCodeOnly(MIGRATION);
  const stampAt = migration.indexOf("set notified_at = now()");
  const returnAt = migration.indexOf("return next");
  assert.ok(stampAt > 0 && returnAt > stampAt, "gemeldet wird, bevor gestempelt ist");
});

test("die Zeitplanroute ist ohne Geheimnis nicht anstossbar", () => {
  // Eine offene Route, die fuer ALLE Menschen im Netzwerk Vorschlaege erzeugt
  // und Mails ausloest, waere aus dem Netz heraus anstossbar.
  const route = codeOnly(ROUTE);
  assert.match(route, /process\.env\.CRON_SECRET/);
  assert.match(route, /cron_secret_not_configured/, "ohne Geheimnis wird gearbeitet");
  assert.match(route, /header === `Bearer \$\{secret\}`/);
  assert.match(route, /status: 401/);

  // Und sie nennt in der Antwort keine Namen: Das Protokoll einer
  // Zeitplanroute hat andere Zwecke als diese Liste.
  assert.doesNotMatch(route, /recipient|email|display_name/i);
});

test("der Zeitplan steht in vercel.json - und die Region bleibt stehen", () => {
  // DIESER TEST HAT AM 21.09.2026 EINEN FEHLER VON MIR GEFANGEN: Beim
  // Eintragen des Zeitplans habe ich die Datei ueberschrieben statt sie zu
  // ergaenzen - und damit `regions: ["lhr1"]` entfernt. Ein zweiter Test
  // ("die Serverfunktionen laufen neben der Datenbank") hat es gemeldet.
  const config = JSON.parse(source("vercel.json")) as {
    regions?: string[];
    crons?: { path: string; schedule: string }[];
  };
  assert.deepEqual(config.regions, ["lhr1"], "die Region ist weg - jede Abfrage zahlt die Entfernung");

  const cron = (config.crons ?? []).find((entry) => entry.path.includes("connect-suggestions"));
  assert.ok(cron, "der Zeitplan fehlt - dann entstehen Vorschlaege nur beim Hinsehen");
  // Einmal am Tag, nicht oefter: Die Wochengrenze von drei Vorschlaegen
  // macht haeufigere Laeufe sinnlos, und Vercel laesst im kleinen Tarif
  // ohnehin nur einen am Tag zu.
  assert.match(cron.schedule, /^\d+ \d+ \* \* \*$/, "der Zeitplan laeuft oefter als taeglich");
});

test("der Testknopf darf nicht mehr als der Ernstfall", () => {
  // Ein Test, der die Schalter uebergeht, beweist das Falsche: Man wuerde die
  // Mail sehen und annehmen, sie ginge auch echt hinaus.
  const action = codeOnly(TEST_ACTION);
  assert.match(action, /withEmail: emailAllowed/);
  assert.match(action, /Boolean\(optIn\) && !optOut/, "der allgemeine Schalter sticht nicht");

  // Er nimmt denselben Weg wie der Zeitplan - ein Testknopf mit eigenem Weg
  // prueft sich selbst.
  assert.match(action, /deliverSuggestionNotification/);
  assert.doesNotMatch(action, /sendNetworkNotificationEmail|deliverPushToUser/);

  // Und er verbucht keinen echten Vorschlag als gemeldet.
  assert.doesNotMatch(action, /notified_at|prepare_suggestion_notifications/);

  // Nur das eigene Konto ist Empfaenger.
  assert.match(action, /recipientUserId: user\.id/);
});

test("der Testknopf sagt, welcher Weg gegangen wurde - und welcher nicht", () => {
  // DREI ZUSTAENDE, NICHT ZWEI: "keine Mail" kann heissen "nicht zugestimmt"
  // (alles in Ordnung) oder "zugestimmt und trotzdem nichts" (da fehlt etwas).
  // Das zu unterscheiden ist der ganze Sinn des Knopfs.
  const component = codeOnly("src/features/connect/SuggestionNotificationTest.tsx");
  for (const key of ["mailed", "mailOff", "mailFailed", "noDevice"]) {
    assert.match(component, new RegExp(`suggestionTest\\.${key}`), `${key} wird nicht gezeigt`);
  }

  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8")) as {
        account: { suggestionTest: Record<string, string> };
      }
    ).account.suggestionTest;
    for (const key of [
      "title",
      "text",
      "send",
      "pending",
      "pushed",
      "noDevice",
      "mailed",
      "mailOff",
      "mailFailed",
      "failed",
    ]) {
      assert.ok(copy[key], `${locale}: account.suggestionTest.${key} fehlt`);
    }
    // Die Geraetezahl gebeugt.
    assert.match(copy.pushed, /\{count, plural,/, `${locale}: ungebeugt`);
    // Und "keine Mail" sagt, dass das die VOREINSTELLUNG ist - sonst liest es
    // sich wie ein Defekt.
    assert.match(copy.mailOff, locale === "de" ? /Voreinstellung/ : /default/);
  }
});

test("die Zustimmungsliste im Code und die in der Datenbank sind dieselbe", () => {
  // Waere die Liste hier laenger, liefe eine Zustimmung in einen
  // Constraint-Fehler; waere sie kuerzer, gaebe es einen Mailweg ohne Haken.
  // Dasselbe Muster wie bei den Abbestellungen.
  const migration = sqlCodeOnly(MIGRATION);
  const block = migration.slice(
    migration.indexOf("notification_opt_ins_kind_check"),
    migration.indexOf("))", migration.indexOf("notification_opt_ins_kind_check"))
  );
  const inDatabase = [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();

  assert.deepEqual(
    NOTIFICATION_EMAIL_OPT_INS.map((entry) => entry.kind).sort(),
    inDatabase
  );
});

test("die Mail ist aus, bis jemand zustimmt - und der Haken sagt es", () => {
  // Marias Vorgabe vom 21.09.2026: "nur, wenn man dann ausdruecklich
  // zustimmt". In der Datenbank ist das die Abwesenheit einer Zeile, in der
  // Oberflaeche ein leerer Haken - und der Satz daneben muss sagen, warum.
  const section = codeOnly("src/features/account/AccountPreferencesSection.tsx");
  assert.match(section, /defaultChecked=\{hasConsented\.has\(optIn\.kind\)\}/);
  assert.doesNotMatch(section, /defaultChecked=\{!hasConsented/, "der Haken ist vorausgewaehlt");

  for (const locale of ["de", "en"]) {
    const text = (
      JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8")) as {
        account: { notifications: { emailOptIns: Record<string, string> } };
      }
    ).account.notifications.emailOptIns.connect_suggestions_email;
    assert.ok(text, `${locale}: der Satz am Haken fehlt`);
    assert.match(
      text,
      locale === "de" ? /aus/ : /off/i,
      `${locale}: der Satz sagt nicht, dass es aus ist`
    );
  }
});
