import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildFundingReport, fundingCsv, MEASURES_OF_KIND, snapshotReportOf, type Grant, type Requirement } from "@/features/advisor/fundingModel";

const grant: Grant = { id: "g", orgId: "o", name: "Landesprogramm", funder: "Ministerium", reference: "AZ 1", startsOn: "2026-09-01", endsOn: "2027-08-31", notes: null };
const req = (overrides: Partial<Requirement>): Requirement => ({
  id: "r",
  grantId: "g",
  title: "Auflage",
  kind: "count",
  measure: "manual",
  formatId: null,
  eventKind: null,
  target: 8,
  unit: null,
  dueOn: null,
  notes: null,
  sortOrder: 0,
  ...overrides,
});

test("Foerderauflagen: Zielzahl, je Team und einmalig werden zu 'x von y' und 'erfuellt' - ohne Prozente", () => {
  const requirements = [
    req({ id: "ws", title: "Workshops", measure: "events", target: 8, sortOrder: 0 }),
    req({ id: "co", title: "Coaching", kind: "per_team", target: 10, unit: "Stunden", sortOrder: 1 }),
    req({ id: "zb", title: "Zwischenbericht", kind: "once", target: null, dueOn: "2026-11-01", sortOrder: 2 }),
    req({ id: "vn", title: "Verwendungsnachweis", kind: "once", target: null, dueOn: "2027-09-30", sortOrder: 3 }),
  ];
  const rows = [
    { requirementId: "ws", programId: null, teamName: null, autoValue: 6, manualValue: 2, tasksDone: 0 },
    { requirementId: "co", programId: "p1", teamName: "Solarwerk", autoValue: 0, manualValue: 10.5, tasksDone: 0 },
    { requirementId: "co", programId: "p2", teamName: "Kita-Kompass", autoValue: 0, manualValue: 4, tasksDone: 0 },
    { requirementId: "zb", programId: null, teamName: null, autoValue: 0, manualValue: 0, tasksDone: 1 },
    { requirementId: "vn", programId: null, teamName: null, autoValue: 0, manualValue: 0, tasksDone: 0 },
  ];
  const report = buildFundingReport(grant, requirements, rows, [], new Map(), "2026-11-05");
  const [workshops, coaching, interim, final] = report.requirements;
  assert.equal(report.countedUntil, "2026-11-05");
  assert.deepEqual([workshops.achieved, workshops.fulfilled], [8, true]);
  assert.deepEqual(coaching.teams.map((team) => [team.name, team.achieved, team.fulfilled]), [["Kita-Kompass", 4, false], ["Solarwerk", 10.5, true]]);
  assert.equal(coaching.fulfilled, false);
  assert.deepEqual([interim.fulfilled, interim.overdue], [true, false]);
  assert.deepEqual([final.fulfilled, final.overdue], [false, false]);
  // Gezaehlt wird hoechstens bis zum Ende der Laufzeit.
  assert.equal(buildFundingReport(grant, [], [], [], new Map(), "2028-01-01").countedUntil, "2027-08-31");
  // Je Team ohne sichtbares Team ist nicht erfuellt.
  assert.equal(buildFundingReport(grant, [req({ id: "x", kind: "per_team" })], [], [], new Map(), "2026-11-05").requirements[0].fulfilled, false);
});

test("Foerderauflagen: CSV mit Semikolon, Zeile je Team, Formeln werden nicht ausgefuehrt", () => {
  const report = buildFundingReport(
    grant,
    [req({ id: "co", title: "=HYPERLINK(\"x\")", kind: "per_team", target: 10, unit: "Stunden" })],
    [{ requirementId: "co", programId: "p1", teamName: "Solar; werk", autoValue: 0, manualValue: 3, tasksDone: 0 }],
    [],
    new Map(),
    "2026-11-05",
  );
  const csv = fundingCsv(report, {
    header: ["Auflage", "Art", "Team", "Ziel", "Erreicht", "Einheit", "Stand"],
    kind: { once: "Einmalig", count: "Zielzahl", per_team: "Je Team" },
    fulfilled: "erfuellt",
    open: "noch offen",
    allTeams: "alle Teams",
  });
  const lines = csv.replace("﻿", "").trim().split("\r\n");
  assert.equal(lines.length, 3);
  assert.ok(lines[1].startsWith(`"'=HYPERLINK(""x"")";Je Team;alle Teams;10;3;Stunden;noch offen`));
  assert.ok(lines[2].includes(`;"Solar; werk";`));
  assert.doesNotMatch(csv, /%/);
});

test("Foerderauflagen: Arten und Zaehlungen passen zur Datenbank, ein kaputter Stand wird nicht geraten", () => {
  const sql = readFileSync("../supabase/migrations/20270314120000_org_funding_requirements.sql", "utf8");
  assert.match(sql, /\(kind = 'once' and measure = 'manual'\)/);
  assert.match(sql, /\(kind = 'count' and measure in \('manual', 'events', 'teams'\)\)/);
  assert.match(sql, /\(kind = 'per_team' and measure in \('manual', 'event_attendance', 'check_ins'\)\)/);
  assert.deepEqual(MEASURES_OF_KIND, { once: ["manual"], count: ["manual", "events", "teams"], per_team: ["manual", "event_attendance", "check_ins"] });
  assert.equal(snapshotReportOf({ grant: {}, requirements: "x" }), null);
  assert.equal(snapshotReportOf(null), null);
});

test("Foerderauflagen: Zugriff in der Datenbank, Zahlen je Team nur fuer sichtbare Teams, schaltbar und standardmaessig aus", () => {
  const sql = readFileSync("../supabase/migrations/20270314120000_org_funding_requirements.sql", "utf8");
  for (const table of ["advisor_org_grants", "advisor_org_requirements", "advisor_org_requirement_entries", "advisor_org_funding_snapshots"]) {
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated;`));
  }
  assert.match(sql, /public\.program_report_programs\(period\.org_id\)/);
  assert.match(sql, /program_id is null or public\.can_see_org_program\(org_id, program_id\)/);
  assert.doesNotMatch(sql, /references auth\.users \(id\)(?! on delete (cascade|set null))/);
  assert.doesNotMatch(sql, /percent|score|rank/i);
  const features = readFileSync("src/features/advisor/orgFeatures.ts", "utf8");
  assert.match(features, /funding: "funding"/);
  assert.match(features, /DEFAULT_NEW_ORG_FEATURES: OrgFeature\[\] = \["plan", "materials", "learning"\]/);
  const ui = readFileSync("src/features/advisor/OrgFunding.tsx", "utf8");
  assert.doesNotMatch(ui, /percent|%|score|rank/i);
  const page = readFileSync("src/app/(product)/advisor/organisation/foerderung/page.tsx", "utf8");
  assert.match(page, /<PrintButton/);
  const exported = readFileSync("src/features/account/accountExport.ts", "utf8");
  for (const table of ["advisor_org_grants", "advisor_org_requirements", "advisor_org_requirement_entries", "advisor_org_funding_snapshots"]) assert.match(exported, new RegExp(`table: "${table}"`));
  const privacy = readFileSync("src/app/datenschutz/page.tsx", "utf8");
  assert.match(privacy, /Förderauflagen/);
});
