import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getNetworkNotificationEmailCopy } from "@/features/email/emailMessages";
import { emailOptInForKind, isNotificationEmailOptIn, isNotificationKind } from "@/features/account/notificationKinds";

const source = (path: string) => readFileSync(path, "utf8");
const sql = source("../supabase/migrations/20270104120000_team_check_in_reminders.sql")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/^\s*--.*$/gm, "");

test("Erinnerung: eigene Art mit eigener Mail-Zustimmung", () => {
  assert.equal(isNotificationKind("team_check_in"), true);
  assert.equal(isNotificationEmailOptIn("team_check_in_email"), true);
  assert.equal(emailOptInForKind("team_check_in")?.kind, "team_check_in_email");
});

test("Erinnerung: nur der Zeitplan darf die Funktion rufen, Nutzer lesen die Stempel nicht", () => {
  assert.match(sql, /revoke all on function public\.prepare_team_check_in_reminders\(integer\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.prepare_team_check_in_reminders\(integer\) to service_role/);
  assert.doesNotMatch(sql, /grant [^;]*team_check_in_reminders[^;]* to authenticated/);
  assert.match(sql, /alter table public\.team_check_in_reminders enable row level security/);
});

test("Erinnerung: gestempelt wird vor dem Senden, hoechstens einmal je Person, Team und Faelligkeit", () => {
  assert.match(sql, /primary key \(team_id, user_id, due_on\)/);
  assert.match(sql, /insert into public\.team_check_in_reminders[\s\S]*on conflict do nothing[\s\S]*returning/);
  assert.match(sql, /wants_email_notification\(m\.user_id, 'team_check_in'\)/);
  assert.match(sql, /wants_email_channel\(s\.user_id, 'team_check_in'\)/);
});

test("Erinnerung: die Mail geht nur mit wants_email, der Text nennt kein Team", () => {
  const runner = source("src/features/checkIn/checkInReminders.ts");
  assert.match(runner, /prepare_team_check_in_reminders/);
  assert.match(runner, /row\.wants_email\s*\?\s*sendNetworkNotificationEmail/);
  for (const locale of ["de", "en"] as const) {
    const copy = getNetworkNotificationEmailCopy(locale, { kind: "team_check_in", senderName: null });
    assert.ok(copy.subject && copy.intro && copy.cta && copy.note);
    assert.doesNotMatch(`${copy.subject} ${copy.intro}`, /\{|undefined|null/);
  }
});

test("Erinnerung: laeuft im bestehenden Cron mit, ein Fehler dort verhindert die Vorschlaege nicht", () => {
  const route = source("src/app/api/cron/connect-suggestions/route.ts");
  assert.match(route, /runCheckInReminders\(\)\.catch/);
  assert.match(route, /runSuggestionNotifications\(BATCH\)/);
  const vercel = JSON.parse(source("vercel.json")) as { crons: unknown[] };
  assert.equal(vercel.crons.length, 2, "Vercel Hobby erlaubt nur zwei Zeitplaene");
});

test("Erinnerung: die Check-in-Seite zeigt den eigenen Stand und verweist ins Konto", () => {
  const page = source("src/app/(product)/teams/[teamId]/check-in/page.tsx");
  assert.match(page, /reminders\.missWarning/);
  assert.match(page, /href="\/account#post"/);
});
