import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FEEDBACK_MOMENTS, feedbackMomentAnswerOf, feedbackMomentOf, sanitizeFeedbackSubmission } from "@/features/feedback/feedbackModel";
import { buildPanelFeedbackNotificationPayload } from "@/lib/email/sendFeedbackNotification";

const code = (path: string) => readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

test("nur bekannte Momente und Antworten gelten", () => {
  assert.deepEqual([...FEEDBACK_MOMENTS], ["setup_done", "workstyle_report", "team_workstyle"]);
  assert.equal(feedbackMomentOf("setup_done"), "setup_done");
  assert.equal(feedbackMomentOf("alles"), null);
  assert.equal(feedbackMomentOf(undefined), null);
  for (const answer of ["yes", "no", "more", "dismissed"]) assert.equal(feedbackMomentAnswerOf(answer), answer);
  assert.equal(feedbackMomentAnswerOf("maybe"), null);
});

test("wer mehr sagt, schreibt ein Feedback mit Anlass - ein unbekannter Anlass fällt weg", () => {
  const base = { source: "nav" as const, kind: "unclear", message: "x", pathname: "/advisor/dashboard" };
  const ok = sanitizeFeedbackSubmission({ ...base, moment: "setup_done" });
  assert.ok(ok.ok && ok.value.moment === "setup_done");
  const odd = sanitizeFeedbackSubmission({ ...base, moment: "<script>" });
  assert.ok(odd.ok && odd.value.moment === null);
  const mail = buildPanelFeedbackNotificationPayload({ ...(ok.ok ? ok.value : (null as never)), userId: "u" });
  assert.match(mail.text, /Anlass: nach dem Einrichten/);
});

test("die Frage steht im Fluss, nie als Pop-up, und kommt je Konto höchstens einmal", () => {
  const server = code("src/features/feedback/FeedbackMoment.tsx");
  // Ein Lesefehler oder eine vorhandene Reaktion heißt: nicht fragen.
  assert.match(server, /if \(error \|\| data\) return null;/);
  assert.match(server, /from\("feedback_moments"\)/);
  assert.match(server, /if \(!user\) return null;/);
  const card = code("src/features/feedback/FeedbackMomentCard.tsx");
  // Kein festes Fenster: die Karte ist ein Abschnitt in der Seite, im Druck ausgeblendet.
  assert.doesNotMatch(card, /fixed|role="dialog"|aria-modal/);
  assert.match(card, /print:hidden/);
  // Jede Reaktion wird vermerkt: Ja, Nicht so, Mehr sagen, weggeklickt.
  assert.match(card, /record\(value\)/);
  assert.match(card, /record\("more"\)/);
  assert.match(card, /record\("dismissed"\)/);
  // Ja wird zu "hat geholfen", Nicht so zu "unklar" - nichts wird ohne Klick vorgewählt.
  assert.match(card, /answer === "yes" \? "help" : answer === "no" \? "unclear" : null/);
});

test("die Frage steht nur an den drei Stellen - und nur, wenn der Moment wirklich da ist", () => {
  const dashboard = code("src/app/(product)/advisor/dashboard/page.tsx");
  assert.match(dashboard, /setupOrg && setup && setup\.progress\.complete && setup\.progress\.done > 0 \? <FeedbackMoment moment="setup_done" \/>/);
  const own = code("src/app/me/profile/workstyle/page.tsx");
  assert.match(own, /!older \? <FeedbackMoment moment="workstyle_report" \/>/);
  const team = code("src/app/(product)/teams/[teamId]/workstyle/page.tsx");
  assert.match(team, /membership \? <FeedbackMoment moment="team_workstyle" \/>/);
});

test("Datenbank und Admin: erste Reaktion gilt, nur Zähler, keine Namen", () => {
  const sql = readFileSync("../supabase/migrations/20270405120000_feedback_moments.sql", "utf8");
  assert.match(sql, /primary key \(user_id, moment\)/);
  assert.match(sql, /on conflict \(user_id, moment\) do nothing/);
  assert.match(sql, /using \(user_id = auth\.uid\(\)\)/);
  assert.match(sql, /on delete cascade/);
  const counts = sql.slice(sql.indexOf("create function public.admin_feedback_moments"), sql.indexOf("alter table public.product_feedback"));
  assert.match(counts, /radar_require_admin\(\)/);
  assert.doesNotMatch(counts, /user_id|display_name|email/);
  const panel = code("src/features/admin/AdminFeedbackPanel.tsx");
  assert.match(panel, /admin_feedback_moments/);
  assert.match(code("src/features/account/accountExport.ts"), /table: "feedback_moments"/);
});

test("deutsch und englisch haben dieselben Schlüssel für die kleine Frage", () => {
  const keys = (v: unknown, p = ""): string[] => (v && typeof v === "object" ? Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => keys(x, `${p}${k}.`)) : [p]);
  const de = JSON.parse(readFileSync("messages/de/feedback.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/feedback.json", "utf8"));
  assert.deepEqual(keys(de.moment).sort(), keys(en.moment).sort());
  for (const key of FEEDBACK_MOMENTS) assert.ok(de.moment.questions[key] && en.moment.questions[key], key);
  const adminDe = JSON.parse(readFileSync("messages/de/admin.json", "utf8")).feedback;
  const adminEn = JSON.parse(readFileSync("messages/en/admin.json", "utf8")).feedback;
  assert.deepEqual(keys(adminDe.moments).sort(), keys(adminEn.moments).sort());
  for (const key of FEEDBACK_MOMENTS) assert.ok(adminDe.moments.names[key], key);
});
