import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  attendanceCsv,
  buildProgramReport,
  parseReportRange,
  teamsCsv,
  type ReportAttendanceRow,
  type ReportCheckInRow,
  type ReportCsvLabels,
} from "@/features/advisor/programReport";

const now = new Date("2026-11-04T12:00:00Z");
const past = "2026-10-20T15:00:00Z";
const later = "2026-11-20T15:00:00Z";

const row = (overrides: Partial<ReportAttendanceRow>): ReportAttendanceRow => ({
  eventId: "e1",
  title: "Demo Day",
  kind: "education",
  startsAt: past,
  programId: "p1",
  teamName: "Nova",
  members: 2,
  attendance: null,
  rsvpYes: 0,
  rsvpNo: 0,
  ...overrides,
});
const team = (overrides: Partial<ReportCheckInRow>): ReportCheckInRow => ({
  programId: "p1",
  teamName: "Nova",
  members: 2,
  checkIns: 0,
  lastHeldOn: null,
  nextOn: null,
  ...overrides,
});

const labels: ReportCsvLabels = {
  date: "Datum", event: "Veranstaltung", kind: "Art", team: "Team", people: "Personen", attendance: "Teilnahme",
  rsvpYes: "Zusagen", rsvpNo: "Absagen", rsvpOpen: "Ohne Antwort", checkIns: "Gespräche", lastCheckIn: "Letztes", nextCheckIn: "Nächstes",
  present: "Da", absent: "Fehlte", excused: "Entschuldigt", unmarked: "Nicht eingetragen", planned: "geplant", unnamedTeam: "Ohne Namen",
  kinds: { education: "Education", internal: "Intern", external: "Extern" },
  formatDate: (iso) => iso.slice(0, 10),
};

test("zaehlt Veranstaltungen, Teilnahme und Gespraeche - nur ueber stattgefundene Termine", () => {
  const report = buildProgramReport(
    [
      row({ attendance: "present" }),
      row({ programId: "p2", teamName: "Atlas", members: 3, attendance: "absent" }),
      row({ eventId: "e2", title: "Pitch", startsAt: later, rsvpYes: 1, rsvpNo: 1 }),
      row({ eventId: "e2", title: "Pitch", startsAt: later, programId: "p2", teamName: "Atlas", members: 3, rsvpYes: 3 }),
    ],
    [team({ checkIns: 2, lastHeldOn: "2026-10-30", nextOn: "2026-11-27" }), team({ programId: "p2", teamName: "Atlas", members: 3, checkIns: 0 })],
    now
  );
  assert.deepEqual(report.totals, {
    teams: 2,
    people: 5,
    eventsHeld: 1,
    eventsPlanned: 1,
    attendance: { present: 1, absent: 1, excused: 0, unmarked: 0 },
    checkIns: 2,
    teamsWithCheckIn: 1,
  });
  const planned = report.events.find((event) => event.eventId === "e2");
  assert.equal(planned?.held, false);
  assert.deepEqual(planned?.attendance, { present: 0, absent: 0, excused: 0, unmarked: 0 }, "geplant hat noch keine Anwesenheit");
  assert.deepEqual(planned?.rsvp, { yes: 4, no: 1, open: 0 });
});

test("keine Rangfolge: Teams alphabetisch, nicht nach Teilnahme", () => {
  const report = buildProgramReport(
    [row({ programId: "p1", teamName: "Zeta", attendance: "present" }), row({ programId: "p2", teamName: "Atlas", attendance: "absent" })],
    [team({ programId: "p1", teamName: "Zeta" }), team({ programId: "p2", teamName: "Atlas" })],
    now
  );
  assert.deepEqual(report.teams.map((entry) => entry.teamName), ["Atlas", "Zeta"]);
  // Kein Feld, das eine Quote oder einen Rang traegt.
  const source = readFileSync("src/features/advisor/programReport.ts", "utf8") + readFileSync("src/features/advisor/OrgProgramReport.tsx", "utf8");
  assert.doesNotMatch(source, /percent|rate\b|rank|score|%\}/i);
});

test("wer wo: nur Termine, die fuer das Team zaehlten; nicht eingetragen bleibt sichtbar", () => {
  const report = buildProgramReport([row({ attendance: null })], [team({}), team({ programId: "p2", teamName: "Atlas" })], now);
  assert.deepEqual(report.teams.find((entry) => entry.programId === "p1")?.byEvent, { e1: null });
  assert.deepEqual(report.teams.find((entry) => entry.programId === "p2")?.byEvent, {}, "kam erst spaeter ins Programm");
  assert.equal(report.totals.attendance.unmarked, 1);
});

test("ohne erfasste Gespraeche steht 'nicht erfasst', nicht 0", () => {
  const report = buildProgramReport([], [team({ checkIns: null })], now);
  assert.equal(report.totals.checkIns, null);
  assert.equal(report.totals.teamsWithCheckIn, null);
  assert.doesNotMatch(teamsCsv(report, labels), /Gespräche/);
});

test("CSV: Semikolon, BOM, Anfuehrungszeichen und keine Formeln aus Teamnamen", () => {
  const file = attendanceCsv([row({ teamName: "=HYPERLINK(\"x\")", title: "Demo; Day", attendance: "excused" })], now, labels);
  assert.ok(file.startsWith("﻿Datum;Veranstaltung;Art;Team;Personen;Teilnahme;Zusagen;Absagen;Ohne Antwort\r\n"));
  assert.match(file, /"Demo; Day"/);
  assert.match(file, /"'=HYPERLINK\(""x""\)"/);
  assert.match(file, /;Entschuldigt;0;0;2\r\n$/);
  const plannedFile = attendanceCsv([row({ startsAt: later })], now, labels);
  assert.match(plannedFile, /;geplant;/);
});

test("Zeitraum aus der Adresse: nur gueltige Daten, vertauscht wird gedreht", () => {
  assert.deepEqual(parseReportRange(undefined, undefined), { from: null, to: null });
  assert.deepEqual(parseReportRange("2026-10-01", "2026-10-31"), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(parseReportRange("2026-10-31", "2026-10-01"), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(parseReportRange("gestern", "2026-13-45"), { from: null, to: null });
});

test("die Datenbank entscheidet, welche Teams in der Auswertung stehen - und gibt keine Gespraechsinhalte heraus", () => {
  const sql = readFileSync("../supabase/migrations/20270308120000_program_report.sql", "utf8");
  assert.match(sql, /public\.is_advisor_org_owner_of\(p_org_id\)\s+or exists \(select 1 from public\.team_program_contacts c where c\.program_id = p\.id and c\.advisor_user_id = auth\.uid\(\)\)/);
  assert.match(sql, /on \(e\.starts_at at time zone 'Europe\/Berlin'\)::date >= p\.active_since/);
  assert.match(sql, /case when public\.org_success_enabled\(p_org_id\) then/);
  assert.doesNotMatch(sql, /\bsummary\b/);
  assert.match(sql, /revoke all on function public\.program_report_programs\(uuid\) from public, anon, authenticated;/);
  const route = readFileSync("src/app/(product)/advisor/organisation/auswertung/route.ts", "utf8");
  assert.match(route, /getOrgReportRows\(client, orgId, range\)/);
  assert.match(route, /"Cache-Control": "private, no-store"/);
});

test("DE und EN tragen dieselben Auswertungs-Texte", () => {
  const keys = (locale: string) =>
    Object.keys(JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8")).programReport as Record<string, string>).sort();
  assert.deepEqual(keys("en"), keys("de"));
});
