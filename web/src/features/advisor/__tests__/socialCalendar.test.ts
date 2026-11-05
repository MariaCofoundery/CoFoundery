import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { eventsWithoutPosts, explicitDays, monthGrid, shiftMonth, spreadDays, suggestCampaign, type OrgPost } from "@/features/advisor/socialCalendarModel";

// Donnerstag, 5.11.2026
const today = "2026-11-05";
const events = [{ eventId: "demo", title: "Demo Day", startsAt: "2026-11-27T17:00:00Z" }, { eventId: "kick", title: "Kickoff", startsAt: "2026-11-10T09:00:00Z" }];

test("Kalender: Monatsraster mit Montag zuerst, ganze Wochen, Monatswechsel", () => {
  const grid = monthGrid("2026-11");
  assert.equal(grid[0][0].day, "2026-10-26");
  assert.equal(grid[0][6].day, "2026-11-01");
  assert.ok(grid.every((week) => week.length === 7));
  assert.equal(grid[grid.length - 1][6].day, "2026-12-06");
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
});

test("Kalender: Veranstaltungen ohne Posting, nur kuenftige", () => {
  const post = { id: "p", title: "x", body: null, channels: [], plannedOn: "2026-11-09", plannedTime: null, status: "idea", campaignId: null, eventId: "kick", assigneeUserId: null, createdByUserId: null } satisfies OrgPost;
  assert.deepEqual(eventsWithoutPosts(events, [post], today).map((event) => event.eventId), ["demo"]);
});

test("Planungshilfe: Kampagne mit genannten Tagen, Kanaelen, Uhrzeit und Themen", () => {
  const result = suggestCampaign("Ich will eine Kampagne zum Demo Day machen, drei Postings auf LinkedIn und Instagram am 20., 24. und 27. November um 9 Uhr zu Ankündigung, Speaker und Rückblick", { today, events });
  assert.ok(result);
  assert.equal(result.name, "Demo Day");
  assert.deepEqual(result.posts.map((post) => post.plannedOn), ["2026-11-20", "2026-11-24", "2026-11-27"]);
  assert.deepEqual(result.posts[0].channels, ["linkedin", "instagram"]);
  assert.equal(result.posts[0].plannedTime, "09:00");
  assert.deepEqual(result.posts.map((post) => post.title), ["Ankündigung", "Speaker", "Rückblick"]);
  assert.equal(result.posts[0].eventId, "demo");
});

test("Planungshilfe: ohne Tage vor der Veranstaltung verteilt, jeden Montag, Zeitraum", () => {
  const before = suggestCampaign("Fünf Postings auf Instagram vor dem Demo Day", { today, events });
  assert.deepEqual(before?.posts.map((post) => post.plannedOn), spreadDays("2026-11-13", "2026-11-27", 5));
  assert.equal(before?.posts.at(-1)?.plannedOn, "2026-11-27");
  const weekly = suggestCampaign("Kampagne Gründerinnen-Porträts, jeden Montag ab 9.11. ein Post auf LinkedIn, vier Posts", { today, events: [] });
  assert.deepEqual(weekly?.posts.map((post) => post.plannedOn), ["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
  assert.equal(weekly?.name, "Gründerinnen-Porträts");
  const range = suggestCampaign("Vier Beiträge im Newsletter vom 1.12. bis 22.12.", { today, events: [] });
  assert.deepEqual(range?.posts.map((post) => post.plannedOn), ["2026-12-01", "2026-12-08", "2026-12-15", "2026-12-22"]);
  assert.deepEqual(range?.posts[0].channels, ["newsletter"]);
});

test("Planungshilfe: mehr Postings als Tage, Tage aus Zahlen, nichts Ausgedachtes", () => {
  const more = suggestCampaign("Fünf Postings am 10.11. und 12.11.", { today, events: [] });
  assert.deepEqual(more?.posts.map((post) => post.plannedOn), ["2026-11-10", "2026-11-12", "2026-11-14", "2026-11-16", "2026-11-18"]);
  assert.deepEqual(explicitDays("am 3. Januar und am 31.02.", today), ["2027-01-03"]);
  assert.equal(suggestCampaign("hm", { today, events: [] }), null);
  const source = readFileSync("src/features/advisor/socialCalendarModel.ts", "utf8");
  assert.doesNotMatch(source, /fetch\(|anthropic|openai|ollama/i);
  const styles = source.slice(source.indexOf("export const CHANNEL_STYLE"), source.indexOf("export type OrgPost"));
  assert.doesNotMatch(styles, /%/);
});

test("Kalender: nur Mitglieder, nichts wird veroeffentlicht, Freigabe vor dem Eintragen", () => {
  const sql = readFileSync("../supabase/migrations/20270319120000_org_social_calendar.sql", "utf8");
  assert.match(sql, /revoke all on public\.advisor_org_posts from anon, authenticated;/);
  assert.match(sql, /using \(public\.is_advisor_org_member\(org_id\)\)/);
  assert.doesNotMatch(sql, /references auth\.users \(id\)(?! on delete (cascade|set null))/);
  const actions = readFileSync("src/features/advisor/socialCalendarActions.ts", "utf8");
  assert.doesNotMatch(actions, /fetch\(|linkedin\.com|graph\.facebook|api\.instagram/i);
  const create = actions.slice(actions.indexOf("export async function createCampaignAction"));
  assert.match(create, /\.slice\(0, 20\)/);
  assert.match(create, /p_status: "idea"/);
  const ui = readFileSync("src/features/advisor/PlanCampaign.tsx", "utf8");
  assert.match(ui, /draft\.include && draft\.title\.trim\(\) && draft\.plannedOn/);
  const calendar = readFileSync("src/features/advisor/SocialCalendar.tsx", "utf8");
  assert.doesNotMatch(calendar, /has-\[:checked\]:\$\{/);
  assert.match(readFileSync("src/features/account/accountExport.ts", "utf8"), /table: "advisor_org_posts"/);
});

test("Kalender: Woche ab Montag, Kalenderwoche nach ISO, Ziehen in Monat und Woche", async () => {
  const { isoWeekNumber, mondayOf } = await import("@/features/advisor/socialCalendarModel");
  assert.equal(mondayOf("2026-11-05"), "2026-11-02");
  assert.equal(mondayOf("2026-11-08"), "2026-11-02");
  assert.equal(isoWeekNumber("2026-11-05"), 45);
  assert.equal(isoWeekNumber("2027-01-01"), 53);
  assert.equal(isoWeekNumber("2027-01-04"), 1);
  const calendar = readFileSync("src/features/advisor/SocialCalendar.tsx", "utf8");
  assert.equal((calendar.match(/<DropDay /g) ?? []).length, 2);
  assert.match(calendar, /<DraggableItem id=\{post\.id\} kind="post">/);
  const tasks = readFileSync("src/features/advisor/Teamraum.tsx", "utf8");
  assert.match(tasks, /export const TASK_VIEWS = \["board", "list", "calendar"\] as const;/);
  assert.match(tasks, /<DropDay key=\{cell\.day\} day=\{cell\.day\} kind="task" move=\{moveTaskDueAction\}/);
});
