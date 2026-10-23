import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cronState, daysSince } from "@/features/admin/adminOverviewModel";
import { parseFeedbackTab } from "@/features/admin/feedbackTab";

const source = (path: string) => readFileSync(path, "utf8");
const NOW = new Date("2026-10-23T12:00:00Z").getTime();

test("ein taeglicher Lauf ist in Ordnung, wenn er unter 36 Stunden her und fehlerfrei ist", () => {
  assert.equal(cronState({ last_run_at: "2026-10-23T07:00:00Z", ok: true }, NOW), "ok");
  assert.equal(cronState({ last_run_at: "2026-10-21T07:00:00Z", ok: true }, NOW), "late");
  assert.equal(cronState({ last_run_at: "2026-10-23T07:00:00Z", ok: false }, NOW), "failed");
  assert.equal(cronState(undefined, NOW), "never");
});

test("Tage seit dem letzten Dump", () => {
  assert.equal(daysSince("2026-10-17T12:00:00Z", NOW), 6);
  assert.equal(daysSince("2026-10-23T11:00:00Z", NOW), 0);
  assert.equal(daysSince(null, NOW), null);
});

test("der Feedback-Reiter faellt bei Unsinn auf Neu zurueck", () => {
  assert.equal(parseFeedbackTab("read"), "read");
  assert.equal(parseFeedbackTab("all"), "all");
  assert.equal(parseFeedbackTab("x"), "new");
  assert.equal(parseFeedbackTab(undefined), "new");
});

test("das Dashboard ist nur fuer Admins, ohne Scores, und die Cron-Routen melden nur nach einem echten Lauf", () => {
  for (const path of ["src/app/(product)/admin/page.tsx", "src/features/admin/adminFeedbackActions.ts", "src/features/moderation/adminReminderActions.ts"]) {
    assert.match(source(path), /requirePlatformAdmin\(\)/, `${path} prueft den Admin nicht`);
  }
  for (const path of ["src/features/admin/AdminOverview.tsx", "src/features/admin/AdminFeedbackPanel.tsx"]) {
    assert.doesNotMatch(source(path).replace(/\/\*[\s\S]*?\*\//g, ""), /\b(score|rank|popularity|ranking)\b/i, `${path}: Rangliste/Score`);
  }
  const retention = source("src/app/api/cron/privacy-retention/route.ts");
  assert.match(retention, /outcome\.status === 200 \|\| outcome\.status === 500/);
  assert.match(source("src/app/api/cron/connect-suggestions/route.ts"), /recordCronHeartbeat\("connect-suggestions"/);
  // Nur der Service-Role-Weg darf den Herzschlag schreiben.
  assert.match(source("../supabase/migrations/20261223120000_admin_dashboard.sql"), /grant execute on function public\.record_cron_heartbeat\(text, boolean\) to service_role/);
});

test("Feedback wird pro Admin als gelesen gefuehrt und der Dialog nennt vorher, dass der Name gespeichert wird", () => {
  const sql = source("../supabase/migrations/20261223120000_admin_dashboard.sql");
  assert.match(sql, /primary key \(feedback_id, admin_user_id\)/);
  for (const locale of ["de", "en"]) {
    assert.ok(JSON.parse(source(`messages/${locale}/feedback.json`)).nameNotice, `${locale}: Hinweis fehlt`);
  }
  assert.match(source("src/features/feedback/ProductFeedbackEntry.tsx"), /t\("nameNotice"\)/);
});
