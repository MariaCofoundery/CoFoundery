import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BUNDLE_WINDOW_MINUTES,
  DELIVERY_MODES,
  bundledPushCopy,
  digestCopy,
  digestLines,
  digestTotal,
  isDeliveryMode,
} from "@/features/notifications/deliveryRhythm";
import { buildDigestHtml } from "@/lib/email/sendNotificationDigestEmail";

test("Rhythmus: drei Arten, Standard gebuendelt, Fenster drei Stunden", () => {
  assert.deepEqual([...DELIVERY_MODES], ["bundled", "instant", "quiet"]);
  assert.equal(isDeliveryMode("bundled"), true);
  assert.equal(isDeliveryMode("loud"), false);
  assert.equal(BUNDLE_WINDOW_MINUTES, 180);
});

test("Sammelmeldung: nur die Zahl, nie Inhalt, in beiden Sprachen", () => {
  assert.equal(bundledPushCopy("de", 3).title, "3 neue Hinweise");
  assert.equal(bundledPushCopy("en", 4).title, "4 new notices");
  assert.equal(bundledPushCopy("de", 1).title, "2 neue Hinweise", "eine Sammelmeldung hat mindestens zwei");
});

test("Morgenuebersicht: gleiche Bezeichnung wird zusammengezaehlt, Unbekanntes faellt weg", () => {
  const lines = digestLines("de", { read_my_mind_handoff: 1, founder_in_the_wild_handoff: 2, contact_request: 1, mystery_kind: 5, org_task_assigned: 0 });
  assert.equal(digestTotal(lines), 4);
  assert.deepEqual(lines.map((l) => l.label), ["Übergaben in Align", "Kontaktanfrage"]);
  assert.equal(digestCopy("de", 1).subject, "1 Ding wartet auf dich");
  assert.equal(digestCopy("en", 4).subject, "4 things are waiting for you");
});

test("Morgenuebersicht: Mail nennt Art und Anzahl und schuetzt Sonderzeichen", () => {
  const html = buildDigestHtml(
    { recipientEmail: "a@example.com", lines: [{ kind: "x", count: 2, label: "<b>Aufgaben</b>" }], openUrl: "https://example.com/messages", settingsUrl: "https://example.com/account#rhythmus" },
    "de",
  );
  assert.match(html, /&lt;b&gt;Aufgaben&lt;\/b&gt;/);
  assert.match(html, /Rhythmus ändern/);
  assert.doesNotMatch(html, /<b>Aufgaben/);
});

test("Zustellung: Reihenfolge Feierabend, Geraet, Platz; Chat buendelt nie; Probeknopf umgeht den Rhythmus", () => {
  const push = readFileSync("src/features/notifications/pushDelivery.ts", "utf8");
  const quiet = push.indexOf('client.rpc("is_quiet_now"');
  const devices = push.indexOf('.from("push_subscriptions")');
  const slot = push.indexOf('client.rpc("claim_push_slot"');
  assert.ok(quiet > 0 && quiet < devices && devices < slot, "Feierabend, dann Geraete, dann Fenster");
  assert.match(readFileSync("src/features/advisor/orgChatActions.ts", "utf8"), /rhythm: "immediate"/);
  assert.match(readFileSync("src/features/notifications/pushActions.ts", "utf8"), /rhythm: "test"/);
  const network = readFileSync("src/features/notifications/networkNotification.ts", "utf8");
  assert.match(network, /params\.kind === "message" \? "immediate" : "bundle"/);
  assert.match(network, /mode !== "instant" && noticeCreated/, "die Mail entfaellt nur, wenn der Hinweis in der App wirklich da ist");
});

test("Cron: Morgenuebersicht im bestehenden Lauf, kein dritter Zeitplan", () => {
  const route = readFileSync("src/app/api/cron/connect-suggestions/route.ts", "utf8");
  assert.match(route, /runNotificationDigests/);
  assert.equal(JSON.parse(readFileSync("vercel.json", "utf8")).crons.length, 2);
});

test("Datenbank: Dienst-Funktionen nur fuer service_role, Einstellung nur fuer Angemeldete", () => {
  const sql = readFileSync("../supabase/migrations/20270510120000_notification_delivery.sql", "utf8");
  assert.match(sql, /grant execute on function public\.claim_push_slot\(uuid, integer\) to service_role;/);
  assert.match(sql, /grant execute on function public\.prepare_notification_digests\(integer\) to service_role;/);
  assert.match(sql, /grant execute on function public\.save_my_notification_delivery\(text, boolean\) to authenticated;/);
  assert.match(sql, /alter table public\.push_bundle_windows enable row level security;/);
});

test("Oberflaeche: Texte in beiden Sprachen, Konto zeigt den Rhythmus, Zahl am Symbol wird nachgezogen", () => {
  for (const locale of ["de", "en"]) {
    const d = JSON.parse(readFileSync(`messages/${locale}/notices.json`, "utf8")).delivery;
    for (const mode of DELIVERY_MODES) assert.ok(d.modes[mode].label && d.modes[mode].text, `${locale} ${mode}`);
    for (const key of ["title", "text", "badge", "always", "save", "saved", "invalid", "recommended", "legend"]) assert.ok(d[key], `${locale} ${key}`);
  }
  assert.match(readFileSync("src/app/(product)/account/page.tsx", "utf8"), /<DeliveryRhythmSection/);
  assert.match(readFileSync("src/app/layout.tsx", "utf8"), /<AppBadgeSync/);
  assert.match(readFileSync("public/sw.js", "utf8"), /setAppBadge/);
  assert.match(readFileSync("src/features/account/accountExport.ts", "utf8"), /notification_delivery_prefs/);
  assert.match(readFileSync("src/app/datenschutz/page.tsx", "utf8"), /Morgenübersicht/);
});
