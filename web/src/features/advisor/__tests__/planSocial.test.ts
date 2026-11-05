import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { berlinLocalToIso, berlinToIso, isoToBerlinLocal } from "@/lib/berlinTime";

const read = (path: string) => readFileSync(path, "utf8");

test("Programmplan: deutsche Zeit, unabhaengig von der Zeitzone des Servers", () => {
  assert.equal(berlinToIso("2026-11-12", "18:00"), "2026-11-12T17:00:00.000Z");
  assert.equal(berlinToIso("2027-07-01", "18:00"), "2027-07-01T16:00:00.000Z");
  assert.equal(berlinLocalToIso("2026-11-12T18:00"), "2026-11-12T17:00:00.000Z");
  assert.equal(isoToBerlinLocal("2026-11-12T17:00:00.000Z"), "2026-11-12T18:00");
  const actions = read("src/features/advisor/teamProgramActions.ts");
  assert.match(actions, /const whenIso = berlinLocalToIso\(/);
  assert.doesNotMatch(actions, /const when = new Date\(String\(formData\.get\("startsAt"\)/);
});

test("Programmplan: Sammel-Eintrag schreibt erst nach Pruefung, jede Zeile ueber dieselbe Funktion", () => {
  const list = read("src/features/advisor/PlanEventList.tsx");
  assert.match(list, /parseEventList\(text, \{ today, formats \}\)/);
  assert.match(list, /<form action=\{createProgramEventsAction\}/);
  const actions = read("src/features/advisor/teamProgramActions.ts");
  assert.match(actions, /export async function createProgramEventsAction[\s\S]*client\.rpc\("save_program_event"/);
  const plan = read("src/features/advisor/OrgProgramPlan.tsx");
  assert.match(plan, /<PlanEventList /);
  assert.match(plan, /<EventFormats /);
  assert.match(read("src/app/(product)/advisor/organisation/page.tsx"), /<EventFormats orgId=\{org\.id\}[^>]*back="features"/);
});

test("Social Media: Vorschlaege in eigenem Feld, gespeichert erst nach Uebernehmen, als Idee, mit Wochenend-Hinweis", () => {
  const suggestions = read("src/features/advisor/EventPostSuggestions.tsx");
  assert.match(suggestions, /<form action=\{createEventPostsAction\}/);
  assert.match(suggestions, /checkPostDay\(row\.plannedOn\)/);
  assert.match(suggestions, /check\.before/);
  assert.match(suggestions, /check\.after/);
  const actions = read("src/features/advisor/socialCalendarActions.ts");
  assert.match(actions, /export async function createEventPostsAction[\s\S]*p_status: "idea"/);
  assert.match(read("src/features/advisor/OrgProgramPlan.tsx"), /<EventPostSuggestions/);
  assert.match(read("src/features/advisor/SocialCalendar.tsx"), /<EventPostSuggestions/);
  assert.match(read("src/features/advisor/SocialCalendar.tsx"), /<PostTemplateEditor /);
});

test("Event-Kalender: Gruendende schlagen vor, Admins sehen die Zahl wartender Vorschlaege", () => {
  assert.match(read("src/app/(product)/events/page.tsx"), /canSubmit=\{roleViews\.hasFounder \|\| /);
  assert.match(read("src/app/(product)/events/neu/page.tsx"), /if \(active\.length === 0 && !roleViews\.hasFounder\) redirect/);
  assert.match(read("src/features/admin/AdminOverview.tsx"), /href: "\/admin\/events", key: "events"/);
});
