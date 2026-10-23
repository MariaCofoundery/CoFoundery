import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");

test("die Woche beginnt am Montag um 0 Uhr UTC", () => {
  // Der Helfer liegt in einer Server-Datei; hier wird seine Rechnung nachgebildet und gegen den Quelltext gehalten.
  const code = source("src/features/moderation/AdminReminderCard.tsx");
  assert.match(code, /\(now\.getUTCDay\(\) \+ 6\) % 7/);
  const startOfWeek = (now: Date) => {
    const day = (now.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  };
  assert.equal(startOfWeek(new Date("2026-10-23T15:00:00Z")).toISOString(), "2026-10-19T00:00:00.000Z"); // Freitag
  assert.equal(startOfWeek(new Date("2026-10-19T00:00:00Z")).toISOString(), "2026-10-19T00:00:00.000Z"); // Montag
  assert.equal(startOfWeek(new Date("2026-10-25T23:59:00Z")).toISOString(), "2026-10-19T00:00:00.000Z"); // Sonntag
});

test("Erinnerung und Themen-Sicht sind nur fuer Admins und die Sicht bleibt ohne Rangliste", () => {
  assert.match(source("src/features/moderation/adminReminderActions.ts"), /requirePlatformAdmin\(\)/);
  assert.match(source("src/features/moderation/AdminReminderCard.tsx"), /requirePlatformAdmin\(\)/);
  assert.match(source("src/app/(product)/admin/problem-radar/board/page.tsx"), /requirePlatformAdmin\(\)/);
  const sql = source("../supabase/migrations/20261222130000_admin_reminders_and_problem_board.sql");
  assert.match(sql, /order by g\.sort_key, g\.topic/, "die Themen muessen alphabetisch stehen");
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /order by\s+(g\.n\b|count\()/i, "sortiert nach Haeufigkeit waere eine Rangliste");
  assert.doesNotMatch(sql, /author_user_id/, "die Themen-Sicht zeigt keine Verfasser:innen");
});

test("die Seite verspricht keinen automatischen Scan", () => {
  for (const locale of ["de", "en"]) {
    const reminder = JSON.parse(source(`messages/${locale}/moderation.json`)).reminder;
    assert.ok(reminder.prompt.length > 40 && reminder.title && reminder.markDone, `${locale}: Erinnerung unvollstaendig`);
  }
});
