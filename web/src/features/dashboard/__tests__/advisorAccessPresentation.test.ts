import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
/**
 * Ohne Kommentare. Sonst findet die Pruefung die deutschen Anzeigetexte in der
 * Erklaerung daneben, warum sie dort gerade NICHT mehr stehen duerfen.
 */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const DATA = "src/features/dashboard/dashboardRoleData.ts";
const PAGE = "src/app/(product)/advisor/dashboard/page.tsx";

const advisorCopy = (locale: string) =>
  JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8")) as {
    dashboard: {
      statuses: Record<string, string>;
      accessDescription: Record<string, string>;
    };
  };

// ---------------------------------------------------------------------------
// Der Fehler, der diesen Test erzeugt hat
// ---------------------------------------------------------------------------
test("pausiert und widerrufen sind zwei verschiedene Meldungen", () => {
  // GEFUNDEN AM 19.09.2026 im Audit. Die Seite unterschied beides am Hilfsfeld
  // `canOpenWorkbook`:
  //
  //   team.canOpenWorkbook ? accessPaused : accessRevoked
  //
  // Das Feld war bei pausiert UND bei widerrufen false. Also bekam jeder
  // pausierte Advisor "Zugriff widerrufen" zu sehen, und die Beschriftung
  // "Zugriff pausiert" war unerreichbar. Wer nur darauf wartete, dass eine
  // Zustimmung zurueckkommt, las, die Founder haetten ihn abgesetzt.
  const page = codeOnly(PAGE);
  assert.match(page, /team\.accessStatus === "revoked"/, "die Seite kennt den Widerruf nicht");
  assert.doesNotMatch(
    page,
    /canOpenWorkbook\s*\n?\s*\?\s*t\("dashboard\.statuses\.accessPaused"\)/,
    "die Unterscheidung haengt wieder am Hilfsfeld statt am Status"
  );

  // Der Status muss beides tragen koennen, sonst ist die Unterscheidung nicht
  // herstellbar.
  assert.match(codeOnly(DATA), /accessStatus: "ready" \| "waiting_for_approval" \| "paused" \| "revoked"/);
  assert.match(source(DATA), /return \{ accessStatus: "revoked"/);
  assert.match(source(DATA), /return \{ accessStatus: "paused"/);

  // Und beide Texte gibt es in beiden Sprachen.
  for (const locale of ["de", "en"]) {
    const statuses = advisorCopy(locale).dashboard.statuses;
    assert.ok(statuses.accessPaused, `${locale}: accessPaused fehlt`);
    assert.ok(statuses.accessRevoked, `${locale}: accessRevoked fehlt`);
    assert.notEqual(
      statuses.accessPaused,
      statuses.accessRevoked,
      `${locale}: beide Zustände sagen dasselbe`
    );
  }
});

test("die Beschreibung verspricht keinen Zugriff, den es nicht mehr gibt", () => {
  // Der alte Text sagte bei Widerruf "Du siehst den Stand, arbeitest aber nicht
  // weiter." Ein widerrufener Advisor kommt aber an gar keinen Inhalt mehr:
  // hasAdvisorAccessToRelationship verlangt revoked_at is null. Die Zusage war
  // falsch - und fuer Founder, die gerade widerrufen haben, alarmierend zu
  // lesen.
  for (const locale of ["de", "en"]) {
    const revoked = advisorCopy(locale).dashboard.accessDescription.revoked;
    assert.doesNotMatch(
      revoked,
      locale === "de" ? /siehst den Stand/ : /can see the status/,
      `${locale}: die Beschreibung verspricht weiterhin Einsicht`
    );
    assert.match(
      revoked,
      locale === "de" ? /nicht mehr/ : /no longer/,
      `${locale}: die Beschreibung sagt nicht, dass es vorbei ist`
    );
  }
});

// ---------------------------------------------------------------------------
// Die Ursache: Anzeigetexte als Unterscheidungsmerkmal
// ---------------------------------------------------------------------------
test("die Datenschicht baut keine Anzeigetexte", () => {
  // Die Ursache des Fehlers: `dashboardRoleData` baute eigene deutsche Labels
  // und Beschreibungen, die die Seite nie benutzte - sie loeste alles ueber
  // t(). Wer die Ableitung las, glaubte, diese Texte seien zu sehen, und baute
  // daneben eine zweite, abweichende Zuordnung. Beschriftungen gehoeren
  // ausschliesslich in messages/*/advisor.json.
  const data = codeOnly(DATA);
  assert.doesNotMatch(data, /accessStatusLabel|accessStatusDescription/);
  assert.doesNotMatch(data, /"Zugriff (widerrufen|pausiert)"/);
  assert.doesNotMatch(data, /"Wartet auf Freigabe"|"Freigegeben"/);

  // Dieselbe Falle an drei weiteren Stellen, alle am 19.09.2026 entfernt:
  // Follow-up-Text, Teamkontext und Zeitstempel wurden auf Deutsch gebaut -
  // der Zeitstempel sogar fest mit "de-DE" - und die Seite baute daneben ihre
  // eigenen, uebersetzten Varianten. Zwei davon las niemand mehr.
  assert.doesNotMatch(data, /"Follow-up in \d/);
  assert.doesNotMatch(data, /"Bestehendes Team"|"Noch keine Aktivitaet"/);
  assert.doesNotMatch(data, /Intl\.DateTimeFormat\("de-DE"/);
  assert.doesNotMatch(data, /lastActivityLabel/);
  assert.match(data, /followUp: "four_weeks" \| "three_months" \| "none"/);
});

test("die Zahl der Freigaben ist eine Zahl", () => {
  // Vorher baute die Datenschicht "1 von 2 Freigaben", und die Seite holte die
  // Zahl mit /^(\\d+)/ zurueck. Eine Formulierungsaenderung haette daraus
  // still eine 0 gemacht - und niemandem waere es aufgefallen.
  const data = codeOnly(DATA);
  assert.match(data, /approvalCount: number/);
  assert.doesNotMatch(data, /von 2 Freigaben/);
  assert.doesNotMatch(codeOnly(PAGE), /approvalSummary\.match/);
  assert.match(source(PAGE), /count: team\.approvalCount/);
});

test("woran gearbeitet wird, ist ein Schlüssel und kein deutscher Satz", () => {
  // Die Seite verglich `team.statusLabel === "Founder-Reaktion liegt vor"`.
  // Dasselbe Muster, dieselbe Falle: Formulierung geaendert, Zweig still tot.
  const data = codeOnly(DATA);
  assert.match(data, /activityStatus: AdvisorActivityStatus/);
  assert.match(data, /"founder_reaction_ready"/);
  assert.doesNotMatch(data, /statusLabel:/);

  const page = codeOnly(PAGE);
  assert.doesNotMatch(page, /statusLabel === "/);
  assert.match(page, /activityStatus === "founder_reaction_ready"/);
  assert.match(page, /activityStatus === "founder_reaction_open"/);
});

// ---------------------------------------------------------------------------
// Was unverändert gilt
// ---------------------------------------------------------------------------
test("ein widerrufener oder pausierter Zugriff öffnet nichts", () => {
  // Das war schon vorher richtig und muss es bleiben: Die Berechtigung haengt
  // an der Datenbankpruefung, nicht an der Beschriftung.
  const access = source("src/features/reporting/relationshipAdvisorAccess.ts");
  const predicate = access.slice(access.indexOf("export async function hasAdvisorAccessToRelationship"));
  assert.match(predicate, /\.eq\("founder_a_approved", true\)/);
  assert.match(predicate, /\.eq\("founder_b_approved", true\)/);
  assert.match(predicate, /\.is\("revoked_at", null\)/);
  assert.doesNotMatch(predicate, /"revoked"/);

  // Und kein Team wird nur deshalb als offen gezeigt, weil die Beschriftung
  // freundlich ist. GEAENDERT am 20.09.2026: `canOpenWorkbook` gibt es nicht
  // mehr - es hing am entfernten Advisor-Workbook. Was den Zugriff oeffnet,
  // steht jetzt ohne Umweg am Status.
  assert.match(source(DATA), /accessStatus: "revoked", approvalCount \};/);
  assert.match(source(DATA), /accessStatus: "paused", approvalCount \};/);
  assert.match(
    source(DATA),
    /accessState\.accessStatus === "ready" && Boolean\(relationshipAccessRow\)/,
    "was den Zugriff oeffnet, haengt nicht mehr am Status"
  );
});
