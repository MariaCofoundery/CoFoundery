import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CHECK_IN_LIMITS,
  daysUntil,
  isCheckInDue,
  isRetroComplete,
  nextCheckInDue,
  normalizeCheckInItems,
  summarizeCheckIn,
  checkInHref,
  checkInSetupTopicHref,
  type CheckInAnswerRow,
  type CheckInTopic,
} from "@/features/checkIn/checkInModel";
import { CHECK_IN_RETRO_QUESTIONS } from "@/features/checkIn/checkInDefaults";

const source = (path: string) => readFileSync(path, "utf8");
const copy = (locale: string) => JSON.parse(source(`messages/${locale}/teams.json`)).checkIn as Record<string, unknown>;
const flatten = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => flatten(inner, `${prefix}${key}.`))
    : [prefix];

const topic = (id: string, position: number, included = true): CheckInTopic => ({ id, position, itemKey: "decision_rights", customText: null, included });
const row = (topicId: string, userId: string, answer: CheckInAnswerRow["answer"], note = ""): CheckInAnswerRow => ({ topicId, userId, answer, note });

test("faellig: ab dem letzten Check-in, sonst ab der aeltesten Bestaetigung, sonst nie", () => {
  const due = nextCheckInDue({ intervalDays: 60, lastClosedAt: "2026-01-01T00:00:00Z", earliestConfirmedAt: "2025-06-01T00:00:00Z" });
  assert.equal(due?.toISOString().slice(0, 10), "2026-03-02");
  assert.equal(nextCheckInDue({ intervalDays: 30, lastClosedAt: null, earliestConfirmedAt: "2026-01-01T00:00:00Z" })?.toISOString().slice(0, 10), "2026-01-31");
  assert.equal(nextCheckInDue({ intervalDays: 90, lastClosedAt: null, earliestConfirmedAt: null }), null);
});

test("fällig ist, was heute oder früher ist; Tage bis zum Datum nie negativ", () => {
  const now = new Date("2026-02-01T12:00:00Z");
  assert.equal(isCheckInDue(null, now), false);
  assert.equal(isCheckInDue(new Date("2026-02-01T11:00:00Z"), now), true);
  assert.equal(isCheckInDue(new Date("2026-02-02T11:00:00Z"), now), false);
  assert.equal(daysUntil(new Date("2026-01-01T00:00:00Z"), now), 0);
  assert.equal(daysUntil(new Date("2026-02-03T00:00:00Z"), now), 2);
});

test("Ergebnis: nur auffaellig, wenn Antworten auseinandergehen oder jemand sprechen moechte", () => {
  const topics = [topic("t1", 1), topic("t2", 2), topic("t3", 3), topic("t4", 4, false)];
  const answers = [
    row("t1", "a", "same"), row("t1", "b", "same"),            // alle gleich -> ruhig
    row("t2", "a", "same"), row("t2", "b", "partly"),          // verschieden -> auffaellig
    row("t3", "a", "talk"), row("t3", "b", "talk"),            // beide wollen sprechen -> auffaellig
    row("t4", "a", "talk"), row("t4", "b", "same"),            // abgewaehltes Thema zaehlt nicht
  ];
  const summary = summarizeCheckIn(topics, answers, ["a", "b"]);
  assert.deepEqual(summary.map((entry) => [entry.topicId, entry.notable]), [["t1", false], ["t2", true], ["t3", true]]);
});

test("Ergebnis: ein einzelnes 'Wir sollten sprechen' ist auffaellig, auch wenn alle anderen 'Ja, so' sagen", () => {
  const summary = summarizeCheckIn([topic("t1", 1)], [row("t1", "a", "talk"), row("t1", "b", "talk"), row("t1", "c", "talk")], ["a", "b", "c"]);
  assert.equal(summary[0].notable, true);
  const calm = summarizeCheckIn([topic("t1", 1)], [row("t1", "a", "same"), row("t1", "b", "same"), row("t1", "c", "same")], ["a", "b", "c"]);
  assert.equal(calm[0].notable, false);
});

test("Ergebnis: Reihenfolge der Themen und der Mitglieder bleibt", () => {
  const summary = summarizeCheckIn([topic("t2", 2), topic("t1", 1)], [row("t1", "b", "same"), row("t1", "a", "partly")], ["a", "b"]);
  assert.deepEqual(summary.map((entry) => entry.topicId), ["t1", "t2"]);
  assert.deepEqual(summary[0].answers.map((answer) => answer.userId), ["a", "b"]);
});

test("Rückblick: ab zwei Personen, die dabei sind, und erst wenn alle Dabeien geantwortet haben", () => {
  const invites = [{ userId: "a", response: "in" as const }, { userId: "b", response: "in" as const }, { userId: "c", response: "out" as const }];
  assert.equal(isRetroComplete(invites, [{ userId: "a", answers: [] }]), false);
  assert.equal(isRetroComplete(invites, [{ userId: "a", answers: [] }, { userId: "b", answers: [] }]), true);
  // Wer nicht dabei ist, blockiert nichts, und eine Person allein macht keinen Rueckblick.
  assert.equal(isRetroComplete([{ userId: "a", response: "in" }, { userId: "b", response: null }], [{ userId: "a", answers: [] }]), false);
});

test("Listen: Unerwartetes faellt weg, Text wird gekuerzt", () => {
  assert.deepEqual(normalizeCheckInItems("x"), []);
  assert.deepEqual(normalizeCheckInItems([{ t: "a", on: true }, { t: 1, on: true }]), [{ t: "a", on: true }]);
  assert.equal(normalizeCheckInItems([{ t: "x".repeat(500), on: true }])[0].t.length, CHECK_IN_LIMITS.retroQuestion);
});

test("Links", () => {
  assert.equal(checkInHref("t 1"), "/teams/t%201/check-in");
  assert.equal(checkInHref("t", "closed"), "/teams/t/check-in?result=closed");
  assert.equal(checkInSetupTopicHref("t", "decision_rights"), "/teams/t/setup/decision_rights");
});

test("Rückblick-Fragen fragen nach Erlebtem, mit Beispiel, in beiden Sprachen", () => {
  assert.ok(CHECK_IN_RETRO_QUESTIONS.length >= 3);
  for (const question of CHECK_IN_RETRO_QUESTIONS) {
    assert.ok(question.de.trim() && question.en.trim());
    assert.doesNotMatch(question.de + question.en, /Krise|crisis|Score|Punkte/i);
  }
});

test("DE und EN haben dieselben Texte; Hinweis 'keine Rechtsberatung' in beiden", () => {
  assert.deepEqual(flatten(copy("de")).sort(), flatten(copy("en")).sort());
  assert.match(String(copy("de").disclaimer), /keine Rechtsberatung/);
  assert.match(String(copy("en").disclaimer), /not legal advice/);
});

test("keine Punkte, keine Gesamtbewertung, kein Teamzustand in den Texten und der Seite", () => {
  const text = JSON.stringify([copy("de"), copy("en")]);
  assert.doesNotMatch(text, /Teamzustand|Gesundheit|health score|Ampel|traffic/i);
  const page = source("src/app/(product)/teams/[teamId]/check-in/page.tsx");
  assert.doesNotMatch(page, /score|percent|ranking|health/i);
});

test("die Migration: Antworten erst nach Abgabe aller, nur Themen der aktuellen Runde, keine Direktrechte", () => {
  const sql = source("../supabase/migrations/20270103120000_team_check_ins.sql");
  assert.match(sql, /team_check_in_complete\(check_in_id\)/);
  assert.match(sql, /not exists \(\s*select 1 from public\.founder_team_members m\s*where m\.team_id = p_team_id\s*and not exists \(\s*select 1 from public\.founder_team_setup_confirmations/);
  assert.match(sql, /r\.resolution_status <> 'not_relevant'/);
  assert.match(sql, /revoke all on public\.%I from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*to authenticated/i);
});

test("Navigation, Team-Karte und Export kennen den Check-in", () => {
  assert.match(source("src/features/teams/FounderTeamNavigation.tsx"), /key: "checkin" as const, href: `\/teams\/\$\{team\}\/check-in`/);
  assert.match(source("src/app/(product)/teams/[teamId]/page.tsx"), /checkInHref\(teamId\)/);
  assert.match(source("src/features/account/accountExport.ts"), /team_check_in_answers/);
});
