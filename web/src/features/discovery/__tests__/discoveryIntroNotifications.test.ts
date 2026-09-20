import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { NOTIFICATION_KINDS } from "@/features/account/notificationKinds";
import { getNetworkNotificationEmailCopy } from "@/features/email/emailMessages";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const ACTIONS = "src/features/discovery/discoveryIntroActions.ts";
const NOTIFICATIONS = "src/features/discovery/discoveryIntroNotifications.ts";

/**
 * Vorstellungsanfragen aus Find.
 *
 * GEFUNDEN AM 20.09.2026 beim Nachsehen, was der neue Kanal alles bedient:
 * Eine Vorstellungsanfrage war der einzige Vorgang im Produkt, bei dem sich
 * jemand persoenlich an eine andere Person wendet, ohne dass diese davon
 * erfaehrt - kein Mail, keine Mitteilung, nur ein Zaehler in der Leiste. Wer
 * nicht taeglich hereinschaut, laesst jemanden wochenlang warten.
 */

test("eine Anfrage und eine Zusage werden gemeldet, eine Absage nicht", () => {
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /notifyDiscoveryIntroRequest\(/, "die Anfrage meldet sich nicht");

  // Die Absage ist eine Entscheidung, keine Auslassung: Sie steht in der
  // Liste und ist dort zu sehen. Eine Mail darueber macht aus einem stillen
  // Nein eine Zustellung ins Postfach - und auf ein Nein folgt nichts, was man
  // tun koennte.
  assert.match(
    actions,
    /if \(response === "accepted"\) \{\s*await notifyDiscoveryIntroAccepted\(/,
    "die Zusage meldet sich nicht - oder die Absage meldet sich doch"
  );
  assert.doesNotMatch(actions, /declined[\s\S]{0,80}notify/);
});

test("der Name kommt aus dem Discovery-Profil, nicht aus dem Personenkern", () => {
  // In Find sieht man einander als das, was im Discovery-Profil steht. Eine
  // Benachrichtigung darf nicht mehr verraten als die Seite, von der sie
  // handelt - sonst waere sie der Weg, auf dem ein Name herauskommt, den die
  // Person dort gar nicht zeigt.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /getOwnDiscoveryProfile\(userId\)\)\?\.displayName/);
  assert.doesNotMatch(actions, /getPersonCore|person_core/);
});

test("die Meldung faellt erst nach der Handlung, nicht statt ihrer", () => {
  // Erst speichern, dann melden: Eine Anfrage, die nicht angelegt wurde, darf
  // keine Benachrichtigung ausloesen - und eine, die nicht rausgeht, darf die
  // Anfrage nicht mitreissen. Das Auffangen steht in notifyNetwork.
  const actions = codeOnly(ACTIONS);
  const savedAt = actions.indexOf("await requestDiscoveryIntro(");
  const notifiedAt = actions.indexOf("await notifyDiscoveryIntroRequest(");
  assert.ok(savedAt > 0 && notifiedAt > savedAt);
  assert.match(codeOnly("src/features/notifications/networkNotification.ts"), /\} catch \{/);
});

test("beide Arten haben einen Schalter im Konto", () => {
  // Eine Benachrichtigungsart ohne Schalter ist der Zustand, aus dem die
  // Kontoeinstellungen entstanden sind.
  const kinds = NOTIFICATION_KINDS.map((entry) => entry.kind);
  assert.ok(kinds.includes("discovery_intro_request"));
  assert.ok(kinds.includes("discovery_intro_accepted"));

  // Und zwar unter Find, wo man die Sache erlebt hat.
  for (const kind of ["discovery_intro_request", "discovery_intro_accepted"] as const) {
    assert.equal(NOTIFICATION_KINDS.find((entry) => entry.kind === kind)?.area, "find");
  }

  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(readFileSync(`messages/${locale}/dashboard.json`, "utf8")) as {
        account: { notifications: { kinds: Record<string, { title?: string; text?: string }> } };
      }
    ).account.notifications.kinds;
    for (const kind of ["discovery_intro_request", "discovery_intro_accepted"]) {
      assert.ok(copy[kind]?.title, `${locale}: ${kind}.title fehlt`);
      assert.ok(copy[kind]?.text, `${locale}: ${kind}.text fehlt`);
    }
  }
});

test("die Mail nennt Find und nicht Connect", () => {
  // Bis zum 20.09.2026 stand ueber jeder dieser Mails fest "CoFoundery
  // Connect". Wer eine Vorstellungsanfrage bekommt, suchte den Vorgang damit
  // im falschen Bereich.
  for (const locale of ["de", "en"] as const) {
    const intro = getNetworkNotificationEmailCopy(locale, {
      kind: "discovery_intro_request",
      senderName: "Mara",
    });
    assert.equal(intro.eyebrow, "CoFoundery Find");
    assert.match(intro.subject, /Mara/);

    const contact = getNetworkNotificationEmailCopy(locale, {
      kind: "contact_request",
      senderName: "Mara",
    });
    assert.equal(contact.eyebrow, "CoFoundery Connect", "Connect hat sich mitverschoben");
  }
});

test("ohne Namen steht dort nicht 'null'", () => {
  // Ein Discovery-Profil kann geloescht oder pausiert sein, waehrend die
  // Anfrage noch offen liegt.
  const de = getNetworkNotificationEmailCopy("de", {
    kind: "discovery_intro_accepted",
    senderName: null,
  });
  assert.match(de.subject, /^Jemand/);
  assert.doesNotMatch(de.intro, /null|undefined/);
});

test("die Texte sagen, was zu tun ist - nicht nur, dass etwas war", () => {
  // Bei einer Vorstellungsanfrage haengt der naechste Schritt an der
  // Empfaengerin. Steht das nicht da, bleibt die Anfrage liegen, obwohl die
  // Mail angekommen ist.
  const de = getNetworkNotificationEmailCopy("de", {
    kind: "discovery_intro_request",
    senderName: "Mara",
  });
  assert.match(de.intro, /Antwort/);
  assert.match(de.cta, /öffnen/);
});

test("beide Meldungen fuehren dorthin, wo der Vorgang steht", () => {
  const notifications = codeOnly(NOTIFICATIONS);
  assert.match(notifications, /INTRO_PATH = "\/discovery\/intros"/);
  // Eine Adresse an zwei Stellen laeuft auseinander, sobald eine davon umzieht.
  assert.equal((notifications.match(/"\/discovery\/intros"/g) ?? []).length, 1);
});
