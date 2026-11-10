import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCalendarItems,
  type CalendarLayer,
  calendarHref,
  eventsNeedingPosts,
  hiddenLayersOf,
  hiddenParam,
  itemsByDay,
  tabOf,
  viewOf,
  visibleRange,
} from "@/features/advisor/calendar/calendarModel";
import { timelinePosition } from "@/features/advisor/postPlanning";
import type { OrgPost } from "@/features/advisor/socialCalendarModel";
import type { OrgTask } from "@/features/advisor/teamraumModel";
import type { ProgramEvent } from "@/features/advisor/teamProgramData";

/**
 * Kalender (Entwurf 05.11.2026): Programm-Termine, Posts, Aufgaben-Fristen und gemerkte Events auf einem Raster.
 * Die Tests halten fest, was auf dem Raster steht, was ausgeblendet werden kann, und dass alles in der Adresse steht.
 */

const read = (path: string) => readFileSync(path, "utf8");
const ORG = "5498b60c-508a-4da4-b31b-9422d64b2786";

const event = (id: string, startsAt: string, patch: Partial<ProgramEvent> = {}): ProgramEvent => ({ eventId: id, title: `Termin ${id}`, kind: "education", startsAt, location: null, notes: null, todos: null, audience: "all", ...patch });
const post = (id: string, plannedOn: string, patch: Partial<OrgPost> = {}): OrgPost => ({ id, title: `Post ${id}`, body: null, channels: ["linkedin"], plannedOn, plannedTime: "09:00", status: "idea", campaignId: null, eventId: null, assigneeUserId: null, createdByUserId: null, brandId: null, pillarId: null, formatId: null, materialUrl: null, approverUserId: null, openInfo: null, postNo: 1, publishedUrl: null, resultViews: null, resultReactions: null, resultClicks: null, resultNote: null, ...patch });
const task = (id: string, dueOn: string | null, patch: Partial<OrgTask> = {}): OrgTask => ({ id, orgId: ORG, title: `Aufgabe ${id}`, details: null, status: "open", assigneeUserIds: [], dueOn, programId: null, eventId: null, pageId: null, visibility: "team", checklist: [], createdByUserId: null, createdAt: "", updatedAt: "", doneAt: null, ...patch });
const hrefs = { event: (id: string) => `/e/${id}`, post: (p: OrgPost) => `/p/${p.id}`, task: (t: OrgTask) => `/t/${t.id}`, eco: "/events" };

test("Ansicht, Ebenen und Reiter stehen in der Adresse und fallen bei Unsinn auf die Voreinstellung zurueck", () => {
  assert.equal(viewOf(undefined), "month");
  assert.equal(viewOf("woche"), "week");
  assert.equal(viewOf("plan"), "plan");
  assert.equal(viewOf("liste"), "month", "die Liste ist der Programmplan geworden");
  assert.equal(viewOf("formate"), "formats");
  assert.equal(viewOf("<script>"), "month");
  assert.equal(tabOf("aufgaben"), "tasks");
  assert.equal(tabOf("teilnahme"), "teams");
  assert.equal(tabOf("x"), "social");
  const hidden = hiddenLayersOf("posts,aufgaben,termine,quatsch");
  assert.deepEqual([...hidden].sort(), ["post", "task"], "die Termine selbst lassen sich nie ausblenden");
  assert.equal(hiddenParam(hidden), "posts,aufgaben");
});

test("calendarHref laesst leere Angaben weg und haengt an der Organisation", () => {
  assert.equal(calendarHref(null), "/advisor/kalender");
  assert.equal(calendarHref(ORG, { termin: "x", reiter: null, aus: "" }), `/advisor/kalender?org=${ORG}&termin=x`);
});

test("das Raster mischt vier Ebenen, Termine zuerst nach Uhrzeit", () => {
  const items = buildCalendarItems({
    events: [event("a", "2026-11-10T16:00:00Z"), event("b", "2026-11-10T08:00:00Z")],
    posts: [post("p", "2026-11-10")],
    tasks: [task("t", "2026-11-10"), task("ohne", null), task("fertig", "2026-11-10", { status: "done" })],
    eco: [{ id: "e", title: "Stammtisch", day: "2026-11-10", time: "19:00" }],
    hidden: new Set<CalendarLayer>(),
    hrefs,
  });
  const day = itemsByDay(items).get("2026-11-10") ?? [];
  assert.deepEqual(day.map((item) => item.layer), ["post", "program", "program", "eco", "task"]);
  assert.deepEqual(day.map((item) => item.time), ["09:00", "09:00", "17:00", "19:00", null]);
  assert.ok(!items.some((item) => item.key === "t-ohne" || item.key === "t-fertig"), "ohne Frist oder erledigt steht nicht im Kalender");
});

test("ausgeblendete Ebenen verschwinden; Posts auf Wochenende sind markiert, veroeffentlichte nicht", () => {
  const base = { events: [event("a", "2026-11-10T16:00:00Z")], tasks: [task("t", "2026-11-10")], eco: [{ id: "e", title: "S", day: "2026-11-10", time: null }], hrefs };
  const posts = [post("sa", "2026-11-07"), post("fertig", "2026-11-07", { status: "published" }), post("werktag", "2026-11-06")];
  const all = buildCalendarItems({ ...base, posts, hidden: new Set<CalendarLayer>() });
  assert.deepEqual(all.filter((item) => item.layer === "post").map((item) => [item.key, item.warn]), [["o-werktag", false], ["o-fertig", false], ["o-sa", true]]);
  assert.equal(all.find((item) => item.key === "o-sa")?.suggestion, true, "eine Idee ist ein Vorschlag");
  assert.equal(all.find((item) => item.key === "o-fertig")?.done, true);
  const less = buildCalendarItems({ ...base, posts, hidden: new Set<CalendarLayer>(["post", "eco"]) });
  assert.deepEqual([...new Set(less.map((item) => item.layer))].sort(), ["program", "task"]);
});

test("ein Post zu einem Termin fuehrt in dessen Panel, ein loser zum Post", () => {
  const items = buildCalendarItems({ events: [], posts: [post("mit", "2026-11-06", { eventId: "ev" }), post("lose", "2026-11-06")], tasks: [], eco: [], hidden: new Set<CalendarLayer>(), hrefs });
  assert.equal(items.find((item) => item.key === "o-mit")?.href, "/e/ev");
  assert.equal(items.find((item) => item.key === "o-lose")?.href, "/p/lose");
});

test("interne Termine sind gekennzeichnet und brauchen nie Posts", () => {
  const items = buildCalendarItems({ events: [event("i", "2026-11-12T09:00:00Z", { audience: "internal" })], posts: [], tasks: [], eco: [], hidden: new Set<CalendarLayer>(), hrefs });
  assert.equal(items[0].internal, true);
  const needing = eventsNeedingPosts([event("i", "2026-11-12T09:00:00Z", { audience: "internal" }), event("a", "2026-11-12T09:00:00Z"), event("b", "2026-11-13T09:00:00Z"), event("alt", "2026-10-01T09:00:00Z"), event("fern", "2027-03-01T09:00:00Z")], [post("p", "2026-11-05", { eventId: "b" })], "2026-11-05");
  assert.deepEqual(needing.map((entry) => entry.eventId), ["a"]);
});

test("der gezeigte Zeitraum: Raster des Monats oder die Woche", () => {
  assert.deepEqual(visibleRange("week", "2026-11", "2026-11-02"), { from: "2026-11-02", to: "2026-11-08" });
  const month = visibleRange("month", "2026-11", "2026-11-02");
  assert.equal(month.from, "2026-10-26");
  assert.equal(month.to, "2026-12-06");
});

test("Zeitstrahl der Vorlagen: der Termin liegt bei 0 Tagen, Schritte davor links und danach rechts", () => {
  assert.equal(timelinePosition(-14, -14, 3), 0);
  assert.equal(timelinePosition(3, -14, 3), 100);
  assert.ok(timelinePosition(0, -14, 3) > timelinePosition(-7, -14, 3));
  assert.equal(timelinePosition(-99, -14, 3), 0, "ausserhalb wird begrenzt");
});

test("Speichern, Anwesenheit und Posts fuehren zurueck in den Kalender - Fehler oeffnen das Formular wieder", () => {
  const actions = read("src/features/advisor/teamProgramActions.ts");
  assert.match(actions, /const orgPlanTab = \(orgId: string, extra = ""\) => \{[\s\S]*calendarHref\(orgId, Object\.fromEntries\(params\)\)/);
  assert.match(actions, /const reopen = formData\.get\("eventId"\) \? `&bearbeiten=/);
  assert.match(actions, /planError=\$\{reason\}\$\{reopen\}/);
  assert.match(actions, /reiter=teilnahme/);
  assert.match(actions, /export async function createEventChecklistAction[\s\S]*!count/, "die Checkliste entsteht nur, wenn es noch keine Aufgabe zum Termin gibt");
  const social = read("src/features/advisor/socialCalendarActions.ts");
  assert.match(social, /formData\.get\("back"\) === "calendar"/);
  assert.match(social, /calendarHref\(orgId, \{ \.\.\.extra, termin: eventParam/);
});

test("das Panel hat vier Reiter, Vorlage anwenden und Bearbeiten nur fuer die Inhaberin", () => {
  const panel = read("src/features/advisor/calendar/EventPanel.tsx");
  assert.match(panel, /\{isOwner \? \(\s*<div className="relative mt-3\.5[\s\S]*editHref/);
  assert.match(panel, /<EventPostSuggestions[\s\S]*returnEventId=\{event\.eventId\}/);
  assert.match(panel, /\{social && canWrite \? \(/);
  const model = read("src/features/advisor/calendar/calendarModel.ts");
  assert.match(model, /PANEL_TABS = \["social", "tasks", "teams", "details"\]/);
  // Interne Termine: keine Teilnahme, keine Posts.
  assert.match(panel, /internal \? \(\s*<p[^>]*>\{t\("teamsInternal"\)\}/);
  assert.match(panel, /\{internal \? \(\s*<p[^>]*>\{t\("socialInternal"\)\}/);
});

test("Anlegen und Aendern sind ein Seitenpanel mit Speichern unten; Escape und Schliessen fuehren auf die Seite zurueck", () => {
  const sheet = read("src/features/advisor/calendar/EventSheet.tsx");
  assert.match(sheet, /formAction=\{saveProgramEventAction\}/);
  const panel = read("src/features/ui/SidePanel.tsx");
  assert.match(panel, /<EscapeCloses href=\{closeHref\} \/>/);
  assert.match(panel, /<form action=\{formAction\}/);
  assert.match(read("src/features/ui/EscapeCloses.tsx"), /event\.key !== "Escape"/);
  // Anlegen darf nur die Inhaberin (die Datenbank prueft es ohnehin).
  assert.match(read("src/features/advisor/calendar/CalendarScreen.tsx"), /\{isOwner \? <Link href=\{linkOrg\(\{ neu: "termin" \}\)\}/);
});

test("Kalender: nur Gemerktes aus dem Oekosystem, nur lesen - und die Ansicht kennt weder Zahl noch Rang", () => {
  const data = read("src/features/advisor/calendar/calendarData.ts");
  assert.match(data, /saved\.has\(event\.id\)/);
  assert.doesNotMatch(data, /\.insert\(|\.update\(|\.delete\(|\.rpc\(/);
  const screen = read("src/features/advisor/calendar/CalendarScreen.tsx");
  assert.doesNotMatch(screen, /\b(score|ranking|rang|prozent|percent)\b/i);
});

test("alle alten Adressen des Programmplans fuehren in den Kalender", () => {
  for (const file of [
    "src/app/(product)/advisor/dashboard/page.tsx",
    "src/app/(product)/events/page.tsx",
    "src/features/advisor/Teamraum.tsx",
    "src/features/advisor/OrgTeamProgramsSection.tsx",
    "src/app/(product)/advisor/programm/[programId]/page.tsx",
  ]) assert.doesNotMatch(read(file), /tab: "plan"/, file);
  assert.match(read("src/app/(product)/advisor/kalender/page.tsx"), /<CalendarScreen searchParams=\{searchParams\} \/>/);
});

test("Texte des Kalenders in beiden Sprachen, dieselben Schluessel", () => {
  const keys = (value: unknown, prefix = ""): string[] =>
    typeof value === "object" && value !== null ? Object.entries(value).flatMap(([key, inner]) => keys(inner, `${prefix}${key}.`)) : [prefix.slice(0, -1)];
  const de = JSON.parse(read("messages/de/advisor.json"));
  const en = JSON.parse(read("messages/en/advisor.json"));
  assert.deepEqual(keys(de.calendar).sort(), keys(en.calendar).sort());
  assert.deepEqual(keys(de.social.cards).sort(), keys(en.social.cards).sort());
  assert.deepEqual(keys(de.social.tabs).sort(), keys(en.social.tabs).sort());
  assert.deepEqual(keys(de.setup.tips.calendar).sort(), keys(en.setup.tips.calendar).sort());
});

test("ein Kalender: Posts sind eine Ebene, lassen sich anlegen und aendern - der Social-Kalender leitet dorthin", () => {
  const screen = read("src/features/advisor/calendar/CalendarScreen.tsx");
  assert.match(screen, /<PostSheet/);
  assert.match(screen, /nur: onlyPosts \? null : "posts"/);
  assert.match(read("src/features/advisor/calendar/PostSheet.tsx"), /name="calendar" value="1"/);
  const actions = read("src/features/advisor/socialCalendarActions.ts");
  assert.match(actions, /formData\.get\("calendar"\) === "1"/);
  const screenSocial = read("src/features/advisor/TeamraumScreen.tsx");
  assert.match(screenSocial, /query\.reiter !== "vorlagen" && query\.reiter !== "kampagnen"[\s\S]*redirect\(\s*calendarHref\(/);
  // Sidebar: kein Social-Kalender mehr unter Arbeiten, Vorlagen und Kampagnen unter Programm.
  assert.doesNotMatch(read("src/features/advisor/SocialCalendar.tsx"), /<DropDay|<PostEditor|monthGrid/);
});

test("Programmplan: eine Station mit grossem Eintragen, Sammelfeld und Formaten; im Onboarding ein Schritt 'Alle Events eintragen'", () => {
  const plan = read("src/features/advisor/calendar/PlanView.tsx");
  assert.match(plan, /<PlanEventList orgId=\{orgId\}/);
  assert.match(plan, /neu: "termin"/);
  assert.match(plan, /neu: "liste"/);
  assert.match(read("src/features/advisor/setup/setupModel.ts"), /ansicht=plan&losgehts=1/);
  const de = JSON.parse(read("messages/de/advisor.json"));
  assert.equal(de.setup.steps.plan.title, "Alle Events eintragen");
});
