import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const WORKBOOK_PAGE = "src/app/(product)/founder-alignment/workbook/page.tsx";
const ADVISOR_SURFACES = [
  "src/app/(product)/advisor/dashboard/page.tsx",
  "src/app/(product)/advisor/report/page.tsx",
  "src/app/(product)/advisor/session/page.tsx",
  "src/app/(product)/advisor/snapshot/page.tsx",
  "src/features/reporting/AdvisorReportProductView.tsx",
];

// ---------------------------------------------------------------------------
// Das Workbook ist aus dem Advisor-Bereich heraus
// ---------------------------------------------------------------------------
test("keine Advisor-Fläche führt mehr ins Workbook", () => {
  // Es war der vierte Knopf auf der Teamkarte, beschriftet als "historisch".
  // Was es leisten sollte, leisten inzwischen der Report, der Snapshot und das
  // Sitzungsblatt.
  for (const path of ADVISOR_SURFACES) {
    const code = codeOnly(path);
    assert.doesNotMatch(code, /buildAdvisorWorkbookHref/, `${path} baut noch einen Workbook-Link`);
    assert.doesNotMatch(code, /workbookHref/, `${path} reicht den Workbook-Link noch durch`);
    assert.doesNotMatch(
      code,
      /openHistoricalWorkbook|historicalWorkbookAvailable/,
      `${path} zeigt das historische Workbook noch an`
    );
  }
});

test("die Tür ist zu, nicht nur unverlinkt", () => {
  // Ein Bereich, den man nur noch ueber eine gemerkte Adresse erreicht, ist der
  // schlechteste Zustand: gepflegt wird er nicht mehr, benutzt aber doch.
  const page = codeOnly(WORKBOOK_PAGE);
  assert.match(page, /if \(advisorContext\) \{/, "der Parameter wird nicht abgewiesen");

  // UND die zweite Haelfte: `hasRelationshipAdvisorAccess` haengt NICHT am
  // Parameter. Ohne diese Pruefung kaeme eine begleitende Person weiterhin
  // hinein, indem sie das Kuerzel einfach weglaesst.
  assert.match(
    page,
    /if \(data\.currentUserRole === "advisor"\) \{\s*redirect\(/,
    "die Rolle wird nicht abgewiesen - der Riegel ist Fassade"
  );
  // Der RUECKGABEBLOCK, nicht der Typ oben: Dort steht der erste Treffer für
  // denselben Namen, und der Ausschnitt ab dort enthielt noch die
  // relationshipId-Ableitung, die den Parameter sehr wohl benutzt.
  const access = source("src/features/reporting/workbookRelationshipAccess.ts");
  assert.doesNotMatch(
    access.slice(access.indexOf("  return {")),
    /advisorContext/,
    "wenn der Zugriff doch am Parameter hängt, ist diese Begründung veraltet"
  );
});

test("die Workbook-Seite trägt keine Advisor-Zweige mehr", () => {
  // TypeScript hat sie nach der Weiterleitung als unerreichbar nachgewiesen -
  // "This comparison appears to be unintentional". Abgeschalteter Code kostet
  // beim Lesen genauso viel wie lebender.
  const page = codeOnly(WORKBOOK_PAGE);
  assert.doesNotMatch(page, /currentUserRole !== "advisor"/);
  assert.doesNotMatch(page, /advisorLegacyTitle|advisorLegacyDescription/);
  assert.doesNotMatch(page, /activeView=\{advisorContext/);

  // Und die beiden zeichengleichen Aufrufe der Workbook-Komponente sind einer.
  assert.equal(
    (page.match(/<FounderAlignmentWorkbookClient/g) ?? []).length,
    1,
    "die identische Verzweigung ist zurück"
  );
});

test("der Snapshot bleibt – er las dieselben Daten, war aber nie das Workbook", () => {
  // Wichtig beim Abbau: `advisorContext` im DATENZUGRIFF bedient auch den
  // Snapshot, und der ist eine gewollte Advisor-Funktion. Entfernt wurde der
  // Weg in die Workbook-SEITE, nicht der Datenweg.
  const snapshot = codeOnly("src/app/(product)/advisor/snapshot/page.tsx");
  assert.match(snapshot, /getFounderAlignmentWorkbookPageData/);
  assert.match(snapshot, /advisorContext: true/);
});

// ---------------------------------------------------------------------------
// Die Teamkarte
// ---------------------------------------------------------------------------
test("die Report-Ampel hängt an dem, was sie anzeigt", () => {
  // BEHOBEN am 20.09.2026: Sie hing an `team.reportReady &&
  // team.workbookAvailable`. Ein fertiger Report sah gedämpft aus, solange
  // kein historisches Workbook existierte - und das gibt es hier gar nicht
  // mehr.
  const dashboard = codeOnly("src/app/(product)/advisor/dashboard/page.tsx");
  assert.doesNotMatch(dashboard, /active: team\.reportReady && team\.workbookAvailable/);
  assert.match(dashboard, /active: team\.reportReady,/);
});

test("die eigene Wiedervorlage steht nicht im Kasten mit dem Zustand des Teams", () => {
  // Das war die unlogische Optik: Was das TEAM angeht und was man sich SELBST
  // vorgenommen hat, stand durcheinander - und vier gleich laute Knöpfe
  // darunter, von denen keiner der nächste Schritt war.
  const dashboard = codeOnly("src/app/(product)/advisor/dashboard/page.tsx");
  const statusBox = dashboard.indexOf("dashboard.fields.report");
  const followUp = dashboard.indexOf("dashboard.fields.followUp");
  const ctaRow = dashboard.indexOf("team.sessionHref");
  assert.ok(statusBox > 0 && followUp > 0 && ctaRow > 0);
  assert.ok(followUp > ctaRow, "die Wiedervorlage steht wieder im Zustandskasten");

  // Genau EIN hervorgehobener Weg - das Sitzungsblatt, wo die eigene Arbeit
  // liegt. Der Report daneben, der Snapshot still.
  const primaryAt = dashboard.indexOf("PRIMARY_CTA_CLASS", ctaRow - 400);
  assert.ok(primaryAt > 0);
  assert.equal(
    (dashboard.slice(ctaRow - 400).match(/PRIMARY_CTA_CLASS/g) ?? []).length,
    1,
    "es gibt wieder mehr als einen hervorgehobenen Weg"
  );
});
