import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cronState, daysSince } from "@/features/admin/adminOverviewModel";
import { isMissingDatabaseFunction } from "@/features/admin/rpcErrors";
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

test("eine fehlende Datenbankfunktion ist ein eigener Fall und kein Lesefehler", () => {
  assert.equal(isMissingDatabaseFunction({ code: "PGRST202", message: "Could not find the function public.admin_feedback_counts" }), true);
  assert.equal(isMissingDatabaseFunction({ code: "42883" }), true);
  assert.equal(isMissingDatabaseFunction({ code: "42501", message: "platform_admin_required" }), false);
  assert.equal(isMissingDatabaseFunction(null), false);
});

test("jede Admin-Unterseite hat einen Weg zurueck in den Admin-Bereich", () => {
  const pages: Array<[string, RegExp]> = [
    ["src/app/(product)/admin/moderation/page.tsx", /href="\/admin"/],
    ["src/app/(product)/admin/highlights/page.tsx", /href="\/admin"/],
    ["src/app/(product)/admin/research/workstyle-pretest/page.tsx", /href="\/admin"/],
    // Das Layout traegt alle Seiten unter /admin/problem-radar.
    ["src/app/(product)/admin/problem-radar/layout.tsx", /href="\/admin"/],
  ];
  for (const [path, pattern] of pages) assert.match(source(path), pattern, `${path}: kein Link nach /admin`);
  for (const path of pages.map(([file]) => file)) assert.doesNotMatch(source(path), /href="\/account"/, `${path}: fuehrt noch aufs Konto`);
});

test("Highlights lassen sich aus einer Auswahl vergeben, nicht nur ueber einen eingefuegten Link", () => {
  const page = source("src/app/(product)/admin/highlights/page.tsx");
  assert.match(page, /admin_list_highlight_candidates/);
  assert.match(page, /name="link" value=\{`\/connect\/\$\{PATH\[item\.kind\]\}\/\$\{item\.id\}`\}/);
  const sql = source("../supabase/migrations/20261226120000_admin_highlight_candidates.sql");
  assert.match(sql, /p\.highlightable/, "nur Eintraege von Menschen, die zugestimmt haben");
});
