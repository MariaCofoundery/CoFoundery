import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FEEDBACK_AREAS,
  FEEDBACK_SUBS,
  feedbackAreaValue,
  feedbackContextOf,
  feedbackPathIsLinkable,
  sanitizeFeedbackPath,
  sanitizeFeedbackSubmission,
} from "@/features/feedback/feedbackModel";
import { buildPanelFeedbackNotificationPayload } from "@/lib/email/sendFeedbackNotification";

const code = (path: string) => readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

test("der Ort kommt aus der Adresse und deckt sich mit den Bereichen der Seitenleisten", () => {
  assert.deepEqual(feedbackContextOf("/connect/people"), { area: "connect", sub: "people" });
  assert.deepEqual(feedbackContextOf("/connect/messages/abc"), { area: "connect", sub: "contacts" });
  assert.deepEqual(feedbackContextOf("/connect"), { area: "connect", sub: "discover" });
  assert.deepEqual(feedbackContextOf("/discovery/intros"), { area: "find", sub: "intros" });
  assert.deepEqual(feedbackContextOf("/me/profile/workstyle"), { area: "align", sub: "profile" });
  assert.deepEqual(feedbackContextOf("/teams/3f2a/setup"), { area: "align", sub: "team" });
  assert.deepEqual(feedbackContextOf("/advisor/teamraum/aufgaben"), { area: "teamraum", sub: "tasks" });
  assert.deepEqual(feedbackContextOf("/advisor/teamraum"), { area: "teamraum", sub: "week" });
  assert.deepEqual(feedbackContextOf("/advisor/kalender"), { area: "calendar", sub: null });
  assert.deepEqual(feedbackContextOf("/advisor/dashboard"), { area: "today", sub: null });
  assert.deepEqual(feedbackContextOf("/dashboard"), { area: "start", sub: null });
  assert.deepEqual(feedbackContextOf("/irgendwas"), { area: "other", sub: null });
  assert.equal(feedbackAreaValue({ area: "connect", sub: "people" }), "connect.people");
  assert.equal(feedbackAreaValue({ area: "events", sub: null }), "events");
  // Jeder Bereich, den es gibt, ist ein Filter im Admin-Bereich; jeder Unterbereich hat einen eigenen Text.
  for (const path of ["/dashboard", "/me/profile", "/discovery", "/connect", "/events", "/advisor/dashboard", "/advisor/teamraum", "/advisor/kalender", "/programm", "/advisor/begleitung", "/advisor/los-gehts", "/messages", "/account", "/x"]) {
    assert.ok((FEEDBACK_AREAS as readonly string[]).includes(feedbackContextOf(path).area), path);
  }
  const de = JSON.parse(readFileSync("messages/de/feedback.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/feedback.json", "utf8"));
  for (const messages of [de, en]) {
    for (const area of FEEDBACK_AREAS) assert.ok(messages.areas[area], `Bereich ${area}`);
    for (const [area, subs] of Object.entries(FEEDBACK_SUBS)) for (const sub of subs) assert.ok(messages.subs[`${area}_${sub}`], `${area}_${sub}`);
  }
});

test("die Seite wird ohne Kennungen gespeichert - nie ein Code, nie eine Abfrage", () => {
  assert.equal(sanitizeFeedbackPath("/connect/people?q=geheim#x"), "/connect/people");
  assert.equal(sanitizeFeedbackPath("/teams/3f2a9c1e-1111-4222-8333-444455556666/setup"), "/teams/:id/setup");
  assert.equal(sanitizeFeedbackPath("/advisor/programm/3f2a9c1e-1111-4222-8333-444455556666"), "/advisor/programm/:id");
  assert.equal(sanitizeFeedbackPath("/connect/listings/Ab12Cd34"), "/connect/listings/:id");
  assert.equal(sanitizeFeedbackPath("/events/12345"), "/events/:id");
  // Einladungen, Codes und Berichte per Link sind keine Produktseiten: gar nichts.
  for (const path of ["/join/ABC123", "/invite/token", "/report/abc", "/login", "", "/", null, undefined]) assert.equal(sanitizeFeedbackPath(path as string), null, String(path));
  assert.equal(feedbackPathIsLinkable("/connect/people"), true);
  assert.equal(feedbackPathIsLinkable("/teams/:id/setup"), false);
  assert.equal(feedbackPathIsLinkable(null), false);
});

test("die Eingabe: eine bekannte Art und ein Text sind Pflicht, alles andere ist freiwillig", () => {
  const base = { source: "nav" as const, kind: "bug", message: "  Der Haken springt zurück  ", pathname: "/advisor/teamraum/aufgaben", device: "phone", importance: "very" };
  const ok = sanitizeFeedbackSubmission(base);
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.equal(ok.value.message, "Der Haken springt zurück");
    assert.equal(ok.value.area, "teamraum.tasks");
    assert.equal(ok.value.pagePath, "/advisor/teamraum/aufgaben");
    assert.equal(ok.value.device, "phone");
    assert.equal(ok.value.importance, "very");
  }
  assert.deepEqual(sanitizeFeedbackSubmission({ ...base, kind: "praise" }), { ok: false, error: "invalid_kind" });
  assert.deepEqual(sanitizeFeedbackSubmission({ ...base, message: "   " }), { ok: false, error: "missing_message" });
  const bare = sanitizeFeedbackSubmission({ source: "nav", kind: "help", message: "Danke" });
  assert.ok(bare.ok && bare.value.importance === null && bare.value.device === null && bare.value.pagePath === null && bare.value.area === "other");
  // Unbekannte Wichtigkeit und Geräte zählen als "keine Angabe".
  const odd = sanitizeFeedbackSubmission({ ...base, importance: "huge", device: "toaster" });
  assert.ok(odd.ok && odd.value.importance === null && odd.value.device === null);
  // Lange Texte werden gekappt, nicht abgewiesen.
  const long = sanitizeFeedbackSubmission({ ...base, message: "x".repeat(9000) });
  assert.ok(long.ok && long.value.message.length === 4000);
});

test("Anschreiben nur mit ausdrücklichem Ja", () => {
  const base = { source: "nav" as const, kind: "help", message: "x" };
  for (const value of [undefined, false, "yes", 1, "true", null]) {
    const result = sanitizeFeedbackSubmission({ ...base, mayContact: value as unknown as boolean });
    assert.ok(result.ok && result.value.mayContact === false, String(value));
  }
  const yes = sanitizeFeedbackSubmission({ ...base, mayContact: true });
  assert.ok(yes.ok && yes.value.mayContact === true);
});

test("die Mail an die Gründerin nennt Art, Ort, Text - aber keine E-Mail-Adresse", () => {
  const sanitized = sanitizeFeedbackSubmission({ source: "nav", kind: "unclear", message: "Was heißt das?", pathname: "/connect/people", device: "desktop", importance: "important", mayContact: true });
  assert.ok(sanitized.ok);
  if (!sanitized.ok) return;
  const mail = buildPanelFeedbackNotificationPayload({ ...sanitized.value, userId: "u-1" });
  assert.match(mail.subject, /Das war unklar/);
  assert.match(mail.text, /Bereich: connect\.people/);
  assert.match(mail.text, /Seite: \/connect\/people/);
  assert.match(mail.text, /Wichtigkeit: Wichtig/);
  assert.match(mail.text, /Darf angeschrieben werden: ja/);
  assert.match(mail.text, /Was heißt das\?/);
  assert.doesNotMatch(mail.text, /@/);
});

test("die Aktion bestimmt den Ort selbst und prüft die Anmeldung", () => {
  const actions = code("src/features/feedback/actions.ts");
  const action = actions.slice(actions.indexOf("export async function submitFeedbackAction"));
  assert.match(action, /sanitizeFeedbackSubmission\(input\)/);
  assert.match(action, /auth\.getUser\(\)/);
  assert.match(action, /area: value\.area/);
  assert.match(action, /may_contact: value\.mayContact/);
  // Die Eingabe hat kein Feld "area": Der Bereich kommt nur aus der Adresse.
  assert.doesNotMatch(code("src/features/feedback/feedbackModel.ts").slice(code("src/features/feedback/feedbackModel.ts").indexOf("export type FeedbackSubmissionInput")).slice(0, 400), /\barea\b/);
});

test("das Panel: am Computer bleibt die Seite bedienbar, auf dem Handy ein Blatt von unten", () => {
  const panel = code("src/features/feedback/ProductFeedbackEntry.tsx");
  assert.match(panel, /submitFeedbackAction\(/);
  assert.match(panel, /aria-modal=\{compact \? true : undefined\}/);
  // Nur auf dem Handy wird die Seite gesperrt.
  assert.match(panel, /if \(!compact\) return;\s*const previous = document\.body\.style\.overflow/);
  // Art und Text sind Pflicht, die Wichtigkeit nicht; "anschreiben" ist standardmäßig aus.
  assert.match(panel, /if \(!kind\) return setError\(t\("panel\.kindRequired"\)\)/);
  assert.match(panel, /useState\(false\);\s*const \[error/);
  assert.match(panel, /t\("nameNotice"\)/);
  assert.match(panel, /feedbackContextOf\(pathname/);
});

test("Admin: Filter nach Art und Bereich, die Adresse nur mit Erlaubnis", () => {
  const sql = readFileSync("../supabase/migrations/20270404120000_product_feedback_panel.sql", "utf8");
  assert.match(sql, /may_contact boolean not null default false/);
  assert.match(sql, /case when f\.may_contact then \(select u\.email/);
  assert.match(sql, /check \(kind in \('help', 'unclear', 'bug', 'missing'\)\)|kind in \('help', 'unclear', 'bug', 'missing'\)/);
  const panel = code("src/features/admin/AdminFeedbackPanel.tsx");
  assert.match(panel, /p_kind: kind, p_area: area/);
  assert.match(panel, /selected\.may_contact/);
  assert.match(panel, /mailto:/);
  // Die Mailadresse steht nur im Link, nicht als Text.
  assert.doesNotMatch(panel, />\s*\{selected\.contact_email\}/);
  // Die Filter bleiben beim Weiterspringen.
  assert.match(code("src/features/admin/adminFeedbackActions.ts"), /feedbackKindOf\(form\.get\("kind"\)\)/);
  assert.match(code("src/app/(product)/admin/page.tsx"), /parseFeedbackKind/);
  // Die alten Einträge bleiben lesbar.
  assert.match(panel, /selected\.kind \? \(/);
  assert.match(panel, /tf\("questions\.q4"\)/);
});

test("deutsch und englisch haben dieselben Schlüssel für das Panel und die Admin-Ansicht", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  for (const file of ["feedback", "admin"]) {
    const de = JSON.parse(readFileSync(`messages/de/${file}.json`, "utf8"));
    const en = JSON.parse(readFileSync(`messages/en/${file}.json`, "utf8"));
    const a = file === "admin" ? de.feedback : de.panel;
    const b = file === "admin" ? en.feedback : en.panel;
    assert.deepEqual(keys(a).sort(), keys(b).sort(), file);
  }
});
