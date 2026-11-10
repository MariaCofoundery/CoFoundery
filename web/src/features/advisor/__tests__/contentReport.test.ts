import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterPosts, lookupOf, parseReportFilters, plannedRows, publishedRows, resultText, toCsv, type ReportLabels } from "@/features/advisor/contentReport/contentReportModel";
import { filterContacts, type OrgContact } from "@/features/advisor/partners/partnersModel";
import { postNoLabel, type OrgPost } from "@/features/advisor/socialCalendarModel";

const labels: ReportLabels = { status: (s) => s, channel: (c) => c, none: "", noResults: "Noch nichts eingetragen", linkWord: "Link", posts: (n) => `${n} Beiträge`, day: (d) => d };
const post = (patch: Partial<OrgPost>): OrgPost => ({ id: "p", title: "T", body: null, channels: ["linkedin"], plannedOn: "2026-11-12", plannedTime: null, status: "idea", campaignId: null, eventId: null, assigneeUserId: null, createdByUserId: null, brandId: null, pillarId: null, formatId: null, materialUrl: null, approverUserId: null, openInfo: null, postNo: 1, publishedUrl: null, resultViews: null, resultReactions: null, resultClicks: null, resultNote: null, ...patch });
const lookup = lookupOf([{ id: "b1", kind: "brand", name: "Accelerator", color: null }], [{ userId: "u1", name: "Tom" }], [], []);
const read = (path: string) => readFileSync(path, "utf8");

test("Beitrags-ID: B-014, dreistellig", () => {
  assert.equal(postNoLabel(14), "B-014");
  assert.equal(postNoLabel(1234), "B-1234");
});

test("Zeitraum und Filter: Standard 90 Tage zurueck bis neun Monate voraus, Unsinn faellt weg", () => {
  const f = parseReportFilters({ bereich: "kampagnen", marke: "kein-uuid", kanal: "xyz" }, "2026-11-10");
  assert.equal(f.area, "kampagnen");
  assert.equal(f.from, "2026-08-12");
  assert.equal(f.brandId, null);
  assert.equal(f.channel, null);
  assert.equal(f.periodChosen, false);
  assert.equal(parseReportFilters({ bereich: "x" }, "2026-11-10").area, "geplant");
});

test("Geplant: ohne Veroeffentlichtes, nach Tag; Veroeffentlicht: neueste zuerst, ohne Ergebnisse steht es da", () => {
  const f = parseReportFilters({}, "2026-11-10");
  const posts = filterPosts([post({ id: "a", plannedOn: "2026-11-18", postNo: 2, brandId: "b1" }), post({ id: "b", plannedOn: "2026-11-12", postNo: 1, approverUserId: "u1" }), post({ id: "c", status: "published", plannedOn: "2026-11-04", postNo: 3, resultViews: 4200, publishedUrl: "https://x.example/1" })], f);
  const planned = plannedRows(posts, lookup, labels, (p) => `/p/${p.id}`);
  assert.deepEqual(planned.map((row) => row.cells[0]), ["B-001", "B-002"]);
  assert.equal(planned[0].cells[11], "Tom");
  assert.equal(planned[1].cells[3], "Accelerator");
  const words = { views: "Aufrufe", reactions: "Reaktionen", clicks: "Klicks" };
  const done = publishedRows(posts, lookup, labels, words, () => "");
  assert.equal(done.length, 1);
  assert.equal(done[0].cells[5], "4200 Aufrufe");
  assert.equal(resultText(post({}), labels, words), "Noch nichts eingetragen");
  assert.equal(filterPosts(posts, { ...f, brandId: "b1" }).length, 1);
});

test("CSV: Semikolon, Anfuehrungszeichen verdoppelt, Formeln entschaerft", () => {
  const csv = toCsv({ columns: ["A", "B"], rows: [{ key: "1", href: null, cells: ["=SUMME(1)", 'sag "hallo"; ja'] }] });
  assert.ok(csv.startsWith("﻿A;B\r\n"));
  assert.ok(csv.includes("'=SUMME(1)"));
  assert.ok(csv.includes('"sag ""hallo""; ja"'));
});

test("Partnerliste: Filter nach Art und Suche, nach Name sortiert", () => {
  const c = (patch: Partial<OrgContact>): OrgContact => ({ id: "x", name: "N", kinds: ["partner"], company: null, email: null, phone: null, url: null, notes: null, status: "asked", ownerUserId: null, ...patch });
  const list = [c({ id: "1", name: "Zoe", kinds: ["investor"] }), c({ id: "2", name: "Anna", kinds: ["speaker", "partner"], company: "Stadtwerke" })];
  assert.deepEqual(filterContacts(list, null, "").map((x) => x.id), ["2", "1"]);
  assert.deepEqual(filterContacts(list, "investor", "").map((x) => x.id), ["1"]);
  assert.deepEqual(filterContacts(list, null, "stadtwerke").map((x) => x.id), ["2"]);
});

test("Seiten: Report nur mit Recht results, Partnerliste nur mit people, kein Wert fuer Personen, Download-Route prueft das Recht", () => {
  const page = read("src/app/(product)/advisor/organisation/page.tsx");
  assert.match(page, /tab === "contentReport" && org\.role !== "guest" && org\.rights\.results/);
  assert.match(page, /canUse=\{org\.rights\.people && orgActive\}/);
  assert.match(read("src/app/api/advisor/content-report/route.ts"), /p_right: "results"/);
  const report = read("src/features/advisor/contentReport/OrgContentReport.tsx").replace(/\/\*\*[\s\S]*?\*\//g, "");
  const partners = read("src/features/advisor/partners/OrgPartners.tsx").replace(/\/\*\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(report + partners, /score|ranking|percent|Sterne/i);
  assert.match(partners, /noRight/);
});

test("Texte: Reiter, Bereiche und Spalten in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const m = JSON.parse(read(`messages/${locale}/advisor.json`));
    assert.equal(m.contentReport.columns.geplant.split(" | ").length, 12, locale);
    assert.equal(m.contentReport.columns.kampagnen.split(" | ").length, 7, locale);
    assert.equal(m.contentReport.columns.veroeffentlicht.split(" | ").length, 6, locale);
    for (const kind of ["partner", "investor", "speaker", "mentor", "other"]) assert.ok(m.partners.kinds[kind], `${locale} ${kind}`);
  }
});

test("Termine liest man ueber list_program_events, nie direkt aus der Tabelle (sie ist fuer Mitglieder nicht lesbar)", () => {
  for (const file of ["src/features/advisor/contentReport/contentReportData.ts", "src/features/advisor/partners/OrgPartners.tsx", "src/features/advisor/partners/partnersData.ts"]) {
    assert.doesNotMatch(read(file), /from\("team_program_events"\)/, file);
  }
  assert.match(read("src/features/advisor/contentReport/contentReportData.ts"), /listProgramEventsSplit/);
});

test("Handy: der Programmwechsel steht in einer eigenen Zeile unter der Leiste; die Empfehlungs-Zahl kommt aus dem Layout", () => {
  const chrome = read("src/features/navigation/workspace/WorkspaceChrome.tsx");
  assert.match(chrome, /<\/header>\s*\{\/\*[^]*?\*\/\}\s*\{hasOrg && active && orgs\.length > 1 \? <div className="[^"]*min-\[700px\]:hidden">\{programSwitcher\("light"\)\}/);
  assert.match(read("src/app/layout.tsx"), /pendingRecommendationCount=\{pendingRecommendationCount\}/);
  assert.match(read("src/features/recommendations/recommendationsData.ts"), /eq\("status", "pending_consent"\)/);
});
