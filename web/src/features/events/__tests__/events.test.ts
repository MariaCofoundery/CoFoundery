import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { agenda, eventFilterOf, type CalendarEntry, type EcosystemEvent } from "@/features/events/eventsModel";

const event = (id: string, startsAt: string, extra: Partial<EcosystemEvent> = {}): EcosystemEvent => ({
  id,
  title: id,
  startsAt,
  endsAt: null,
  allDay: false,
  place: null,
  region: "SN",
  online: false,
  organizer: null,
  url: `https://example.org/${id}`,
  status: "published",
  source: null,
  submittedOrgName: "Org",
  submittedByMe: false,
  reviewNote: null,
  ...extra,
});
const eco = (e: EcosystemEvent, saved = false): CalendarEntry => ({ kind: "ecosystem", key: e.id, event: e, saved });

test("Events: nach Tag (Berlin) gruppiert und sortiert, Filter und Region", () => {
  const entries: CalendarEntry[] = [
    eco(event("late", "2026-11-12T20:00:00Z")),
    { kind: "program", key: "p", title: "Pitch-Training", startsAt: "2026-11-12T17:00:00Z", place: null, label: "Programm", href: "/programm" },
    // 23:30 UTC ist in Berlin schon der naechste Tag.
    eco(event("night", "2026-11-12T23:30:00Z"), true),
    eco(event("bavaria", "2026-11-13T09:00:00Z", { region: "BY" })),
    eco(event("web", "2026-11-13T10:00:00Z", { region: null, online: true })),
  ];
  const all = agenda(entries, "all", null);
  assert.deepEqual(all.map((day) => day.day), ["2026-11-12", "2026-11-13"]);
  assert.deepEqual(all[0].entries.map((entry) => entry.key), ["p", "late"]);
  assert.deepEqual(all[1].entries.map((entry) => entry.key), ["night", "bavaria", "web"]);
  assert.deepEqual(agenda(entries, "saved", null).flatMap((day) => day.entries.map((entry) => entry.key)), ["night"]);
  assert.deepEqual(agenda(entries, "program", null).flatMap((day) => day.entries.map((entry) => entry.key)), ["p"]);
  // Region: das Bundesland plus alles Online; Programm-Termine bleiben immer.
  assert.deepEqual(agenda(entries, "all", "SN").flatMap((day) => day.entries.map((entry) => entry.key)), ["p", "late", "night", "web"]);
  assert.deepEqual(agenda(entries, "ecosystem", "online").flatMap((day) => day.entries.map((entry) => entry.key)), ["web"]);
  assert.equal(eventFilterOf("x"), "all");
});

test("Events: nur Fakten - kein Feld fuer Beschreibung oder Bild, Herkunft an jedem Event, Freigabe vor Sichtbarkeit", () => {
  const sql = readFileSync("../supabase/migrations/20270323120000_ecosystem_events.sql", "utf8");
  const table = sql.slice(sql.indexOf("create table public.ecosystem_events ("), sql.indexOf("create index ecosystem_events_published_idx"));
  assert.doesNotMatch(table, /description|image|body|text_content|photo/i);
  assert.match(table, /constraint ecosystem_events_url check \(url ~ '\^https:\/\//);
  assert.match(sql, /status = 'published' or submitted_by_user_id = auth\.uid\(\) or public\.is_platform_admin\(\)/);
  assert.match(sql, /permission_note text not null/);
  assert.match(sql, /enabled boolean not null default false/);
  assert.match(sql, /grant execute on function public\.import_ecosystem_events\(uuid, jsonb, text\) to service_role;/);
  const view = readFileSync("src/features/events/EventsView.tsx", "utf8");
  assert.match(view, /t\("fromSource"\)/);
  assert.match(view, /t\("fromOrg"/);
  assert.match(view, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(view, /score|rank|percent/i);
  const parser = readFileSync("src/features/events/icsParser.ts", "utf8");
  assert.doesNotMatch(parser, /get\("DESCRIPTION"\)|ATTACH/);
});

test("Events: Menue fuer Gruendende und Advisor, Import im taeglichen Lauf, Export und Datenschutz", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  assert.match(shell, /\.\.\.\(\(hasFounder \|\| hasAdvisor\) && !isConnectOnly \? \[eventsItem\] : \[\]\)/);
  const cron = readFileSync("src/app/api/cron/connect-suggestions/route.ts", "utf8");
  assert.match(cron, /runEcosystemEventImport\(\)/);
  const exported = readFileSync("src/features/account/accountExport.ts", "utf8");
  assert.match(exported, /table: "ecosystem_events", column: "submitted_by_user_id"/);
  assert.match(exported, /table: "ecosystem_event_saves", column: "user_id"/);
  assert.match(readFileSync("src/app/datenschutz/page.tsx", "utf8"), /Im Bereich Events stehen Termine/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/events.json`, "utf8"));
    assert.equal(Object.keys(messages.regions).length, 16, locale);
    assert.ok(messages.submit.confirm, locale);
  }
});
