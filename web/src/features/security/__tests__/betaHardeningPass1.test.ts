import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const founderScoringPage = readFileSync(
  "src/app/(product)/debug/founder-scoring/page.tsx",
  "utf8"
);
const founderScoringLoader = readFileSync(
  "src/features/scoring/founderScoringDebug.ts",
  "utf8"
);
const advisorReportLoader = readFileSync(
  "src/features/reporting/advisorReportPageData.ts",
  "utf8"
);
const advisorReportPage = readFileSync(
  "src/app/(product)/advisor/report/page.tsx",
  "utf8"
);
const advisorDashboardPage = readFileSync(
  "src/app/(product)/advisor/dashboard/page.tsx",
  "utf8"
);

test("founder scoring debug route is unavailable only in production", () => {
  assert.match(founderScoringPage, /import \{ notFound \} from "next\/navigation";/u);
  assert.match(
    founderScoringPage,
    /if \(process\.env\.NODE_ENV === "production"\) \{\s*notFound\(\);\s*\}/u
  );
  assert.match(founderScoringPage, /getFounderScoringDebug\(invitationId\)/u);
});

test("founder scoring debug loader does not log identifiers or scores", () => {
  assert.doesNotMatch(founderScoringLoader, /founder-scoring-debug/u);
  assert.doesNotMatch(founderScoringLoader, /console\.(?:log|info|warn|error)/u);
});

test("advisor report logs retain status diagnostics without direct identifiers", () => {
  const loggingStatements = [
    ...advisorReportLoader.matchAll(/console\.(?:log|info|warn|error)\([\s\S]*?\n\s*\}\);/gu),
    ...advisorDashboardPage.matchAll(/console\.(?:log|info|warn|error)\([\s\S]*?\n\s*\}\);/gu),
  ].map((match) => match[0]);

  // GEAENDERT am 19.09.2026: Hier stand eine feste Zahl (2) und eine feste
  // Reihenfolge. Das zweite Protokoll hing am abgeschalteten Debug-Schalter im
  // Advisor-Dashboard und ist mit ihm entfernt worden - ohne dass an der
  // Zusage etwas kaputt war. Die Zusage ist: Was protokolliert wird, nennt den
  // Vorgang und den Status und KEINE Personen- oder Objektkennung.
  assert.ok(loggingStatements.length > 0, "es wird gar nichts mehr protokolliert");

  // Das Protokoll fuer abgelehnte Zugriffe muss es geben: Ohne es laesst sich
  // "ich komme nicht an den Report" nicht beantworten.
  assert.ok(
    loggingStatements.some(
      (statement) =>
        /operation: "load_advisor_report"/u.test(statement) && /status: "forbidden"/u.test(statement)
    ),
    "das Protokoll für abgelehnte Zugriffe fehlt"
  );

  for (const statement of loggingStatements) {
    assert.match(statement, /operation: "/u, `ohne Vorgang: ${statement.slice(0, 60)}`);
  }

  for (const statement of loggingStatements) {
    assert.doesNotMatch(
      statement,
      /\b(?:userId|teamId|relationshipId|invitationId|reportRunId|email|token|score|answer)\b/u
    );
  }

  assert.doesNotMatch(advisorReportPage, /console\.(?:log|info|warn|error)/u);
});
