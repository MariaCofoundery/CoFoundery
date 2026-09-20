import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  base64UrlToBytes,
  detectAppleMobile,
  isKnownPushEndpoint,
  PUSH_SERVICE_HOSTS,
  resolvePushAvailability,
} from "@/features/notifications/pushSupport";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Mitteilungen auf das Geraet.
 *
 * GEWUENSCHT AM 20.09.2026: "Und dann waere es natuerlich cool mit den
 * Mitteilungen." Die Verschluesselung selbst ist in
 * `src/lib/push/__tests__/webPushCrypto.test.ts` am Rechenbeispiel des
 * Standards geprueft. Hier stehen die Entscheidungen drumherum.
 */

// ---------------------------------------------------------------------------
// Der Fall, den man auf einem Rechner nie sieht
// ---------------------------------------------------------------------------
const CAPABLE = {
  hasVapidKey: true,
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isAppleMobile: false,
  isStandalone: false,
};

test("auf dem iPhone im Tab wird erklaert, was zu tun ist - nicht abgesagt", () => {
  // Web Push gibt es auf iOS AUSSCHLIESSLICH fuer Seiten auf dem
  // Startbildschirm. Im Safari-Tab fehlen die Schnittstellen - eine Pruefung
  // "kann der Browser das?" landet dort bei "nein", obwohl die Antwort
  // "noch nicht, und zwar so:" ist.
  assert.equal(
    resolvePushAvailability({
      ...CAPABLE,
      hasServiceWorker: false,
      hasPushManager: false,
      isAppleMobile: true,
      isStandalone: false,
    }),
    "needs_home_screen"
  );

  // Dieselbe Seite vom Startbildschirm aus: Dann ist alles da.
  assert.equal(
    resolvePushAvailability({ ...CAPABLE, isAppleMobile: true, isStandalone: true }),
    "supported"
  );
});

test("ohne Schluessel wird niemand nach einer Erlaubnis gefragt", () => {
  // Nach einer Erlaubnis zu fragen, die wir nicht einloesen koennen, ist die
  // schlechteste Reihenfolge: Die Erlaubnis gilt dann als erteilt, es kommt
  // nur nie etwas an.
  assert.equal(resolvePushAvailability({ ...CAPABLE, hasVapidKey: false }), "not_configured");
  assert.equal(
    resolvePushAvailability({ ...CAPABLE, hasVapidKey: false, isAppleMobile: true }),
    "not_configured"
  );
});

test("ein Browser ohne die Schnittstellen bekommt eine Absage, kein Rätsel", () => {
  assert.equal(
    resolvePushAvailability({ ...CAPABLE, hasNotification: false }),
    "unsupported"
  );
  assert.equal(resolvePushAvailability(CAPABLE), "supported");
});

test("ein iPad gibt sich als Macintosh aus", () => {
  // Seit iPadOS 13. Ohne die Beruehrungspunkte waere jedes iPad ein Rechner -
  // und bekaeme im Tab die Absage statt des Hinweises.
  assert.equal(detectAppleMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)"), true);
  assert.equal(detectAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), true);
  assert.equal(detectAppleMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), false);
  assert.equal(detectAppleMobile("Mozilla/5.0 (Windows NT 10.0)"), false);
});

// ---------------------------------------------------------------------------
// Der Endpunkt ist eine Adresse, die UNSER Server aufruft
// ---------------------------------------------------------------------------
test("nur die Push-Dienste, die wir kennen", () => {
  for (const host of PUSH_SERVICE_HOSTS) {
    assert.ok(isKnownPushEndpoint(`https://${host}/abc`), `${host} wird abgewiesen`);
  }
  assert.ok(isKnownPushEndpoint("https://web.push.apple.com/QDx…"));
  assert.ok(isKnownPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"));

  // Und nichts anderes: Der Endpunkt wird gespeichert und spaeter von unserem
  // Server aufgerufen. Eine frei waehlbare Adresse waere ein Weg nach draussen.
  assert.equal(isKnownPushEndpoint("https://evil.example/collect"), false);
  // Der Teil hinter dem Punkt muss stimmen, nicht irgendwo vorkommen.
  assert.equal(isKnownPushEndpoint("https://fcm.googleapis.com.evil.example/x"), false);
  assert.equal(isKnownPushEndpoint("https://evil.example/fcm.googleapis.com"), false);
  // Und niemals unverschluesselt.
  assert.equal(isKnownPushEndpoint("http://fcm.googleapis.com/abc"), false);
  assert.equal(isKnownPushEndpoint("nicht einmal eine Adresse"), false);

  // Die Pruefung steht auch im Server-Pfad und nicht nur in der Oberflaeche.
  assert.match(
    codeOnly("src/features/notifications/pushActions.ts"),
    /isKnownPushEndpoint\(input\.endpoint\)/
  );
});

test("der oeffentliche Schluessel wird als base64url gelesen, nicht als base64", () => {
  // Die beiden getauschten Zeichen sind der Grund, warum das eine eigene
  // Funktion ist: atob kennt - und _ nicht und wirft.
  const bytes = base64UrlToBytes("-_-_");
  assert.deepEqual([...bytes], [251, 255, 191]);
  // Ein echter Schluessel ist 65 Byte lang und faengt mit 0x04 an - der
  // Markierung fuer einen unkomprimierten Punkt.
  const vapid = base64UrlToBytes(
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"
  );
  assert.equal(vapid.length, 65);
  assert.equal(vapid[0], 4);
});

// ---------------------------------------------------------------------------
// Ein Anspruch, zwei Wege
// ---------------------------------------------------------------------------
test("die Mitteilung haengt an demselben Anspruch wie die Mail", () => {
  // DAS IST DIE ARCHITEKTURENTSCHEIDUNG. Ein eigener Zaehler fuer den zweiten
  // Weg waere ein zweites Regelwerk fuer dieselbe Frage - und die
  // Abbestellungen aus dem Konto wuerden fuer ihn nicht gelten.
  const notifications = codeOnly("src/features/connect/connectNotifications.ts");
  const claimAt = notifications.indexOf("await claim(");
  const pushAt = notifications.indexOf("deliverPushToUser(");
  const mailAt = notifications.indexOf("sendConnectNotificationEmail({");
  assert.ok(claimAt > 0 && pushAt > 0 && mailAt > 0);
  assert.ok(pushAt > claimAt, "die Mitteilung geht raus, bevor der Anspruch genommen ist");
  assert.ok(mailAt > claimAt);

  // Und der Anspruch fragt die Abbestellungen - sonst waere der Satz oben nur
  // eine Behauptung.
  const migration = source("../supabase/migrations/20261001120000_account_locale_and_notifications.sql");
  assert.match(migration, /if not public\.wants_email_notification\(p_recipient_user_id, p_kind\) then/);
});

test("in einer Mitteilung steht nicht, was jemand geschrieben hat", () => {
  // Der Inhalt ist bis zum Geraet verschluesselt - aber er erscheint auf einem
  // SPERRBILDSCHIRM, und der ist sichtbar fuer jeden, der das Telefon in der
  // Hand haelt. Dieselbe Regel wie bei der Mail, aus einem anderen Grund.
  const notifications = codeOnly("src/features/connect/connectNotifications.ts");
  // Die Texte kommen aus derselben Quelle wie die der Mail.
  assert.match(notifications, /getConnectNotificationEmailCopy\(recipient\.locale/);
  assert.match(notifications, /title: copy\.headline/);
  assert.match(notifications, /body: copy\.intro/);
  // Kein Nachrichtentext, kein Auszug - hier gibt es gar keinen Zugriff darauf.
  assert.doesNotMatch(notifications, /message\.body|messageBody|\.text\b/);
});

test("der Zustellweg entscheidet nicht mit, WAS jemand bekommt", () => {
  // Die Geraeteliste sagt nur, wohin. Sie darf nicht zu einer zweiten
  // Einstellung werden, in der eine abbestellte Art doch wieder ankommt.
  const delivery = codeOnly("src/features/notifications/pushDelivery.ts");
  assert.doesNotMatch(delivery, /notification_opt_outs|wants_email_notification/);
  assert.match(delivery, /from\("push_subscriptions"\)/);
});

// ---------------------------------------------------------------------------
// Adressen, die nicht mehr gelten
// ---------------------------------------------------------------------------
test("eine abgemeldete Adresse wird geloescht, nicht gesammelt", () => {
  // 404 und 410 sind die Antwort der Push-Dienste auf eine Subscription, die
  // es nicht mehr gibt. Eine Liste toter Adressen waere eine Liste, in der
  // steht, wo jemand einmal angemeldet war.
  const send = codeOnly("src/lib/push/sendWebPush.ts");
  assert.match(send, /response\.status === 404 \|\| response\.status === 410/);

  const delivery = codeOnly("src/features/notifications/pushDelivery.ts");
  assert.match(delivery, /result\.gone[\s\S]{0,200}\.delete\(\)/);
  // Und eine Adresse, die dauerhaft nicht antwortet, ebenso - nach einer
  // Handvoll Versuchen, nicht beim ersten Netzwerkfehler.
  assert.match(delivery, /row\.failure_count \+ 1 >= MAX_FAILURES/);
});

test("ein fehlgeschlagener Versand reisst die Handlung nicht mit", () => {
  // Wer schreibt, hat geschrieben - auch wenn keine Mitteilung rausgeht.
  const notifications = source("src/features/connect/connectNotifications.ts");
  assert.match(notifications, /\} catch \{/, "der stille Auffangblock ist weg");
  const delivery = codeOnly("src/features/notifications/pushDelivery.ts");
  // Ohne Schluessel gibt es diesen Kanal nicht - und dann auch keine Abfrage.
  assert.match(delivery, /if \(!getVapidKeys\(\)\) return/);
});

// ---------------------------------------------------------------------------
// Der Service Worker
// ---------------------------------------------------------------------------
test("der Service Worker speichert nichts zwischen", () => {
  // Ein Zwischenspeicher macht die App offline benutzbar und liefert ab dann
  // alte Seiten aus. Diese Anwendung rendert auf dem Server und lebt von
  // aktuellen Daten - das waere ein Tausch gegen die haeufigste Ursache fuer
  // "bei mir sieht es anders aus".
  const worker = codeOnly("public/sw.js");
  assert.doesNotMatch(worker, /caches\.|cache\.put|CacheStorage/);
  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /addEventListener\("notificationclick"/);
});

test("ein Antippen fuehrt nur auf die eigene Seite", () => {
  // Die Nutzlast kommt zwar von uns, aber sie landet in einem Programm, das
  // Adressen oeffnet. Ein Pfad, kein fremder Ort.
  const worker = codeOnly("public/sw.js");
  assert.match(worker, /payload\.url\.startsWith\("\/"\)/);
  assert.match(worker, /self\.location\.origin/);
});

// ---------------------------------------------------------------------------
// Die Texte
// ---------------------------------------------------------------------------
test("jeder Zustand hat in beiden Sprachen einen Satz", () => {
  for (const locale of ["de", "en"]) {
    const account = (
      JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8")) as {
        account: { push?: Record<string, unknown>; notifications: { text: string } };
      }
    ).account;
    const push = account.push as Record<string, string> & { errors?: Record<string, string> };
    assert.ok(push, `${locale}: account.push fehlt`);

    for (const key of [
      "title",
      "text",
      "statusLabel",
      "on",
      "off",
      "enable",
      "disable",
      "pending",
      "perDevice",
      "homeScreen",
      "unsupported",
      "notConfigured",
    ]) {
      assert.ok(push[key], `${locale}: account.push.${key} fehlt`);
    }
    for (const key of ["denied", "unsupported_service", "failed"]) {
      assert.ok(push.errors?.[key], `${locale}: account.push.errors.${key} fehlt`);
    }

    // Der Hinweis auf den Startbildschirm muss den Weg NENNEN, nicht nur sagen,
    // dass es nicht geht - sonst sucht jemand im Falschen.
    assert.ok(push.homeScreen.length > 80, `${locale}: der Hinweis erklaert den Weg nicht`);

    // Und der Kasten darueber sagt jetzt, dass die Schalter fuer beide Wege
    // gelten. Stuende dort weiter nur "Mail", waere die Zusage falsch.
    assert.doesNotMatch(
      account.notifications.text,
      locale === "de" ? /je Vorgang – ein laufendes Gespräch löst keine Mail/ : /one email per thing/,
      `${locale}: der Text spricht noch nur von Mail`
    );
  }
});
