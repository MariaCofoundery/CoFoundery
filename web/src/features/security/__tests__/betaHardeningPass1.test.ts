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

  assert.equal(loggingStatements.length, 2);
  assert.match(loggingStatements[0] ?? "", /operation: "load_advisor_report"/u);
  assert.match(loggingStatements[0] ?? "", /status: "forbidden"/u);
  assert.match(loggingStatements[1] ?? "", /operation: "resolve_advisor_navigation"/u);

  for (const statement of loggingStatements) {
    assert.doesNotMatch(
      statement,
      /\b(?:userId|teamId|relationshipId|invitationId|reportRunId|email|token|score|answer)\b/u
    );
  }

  assert.doesNotMatch(advisorReportPage, /console\.(?:log|info|warn|error)/u);
});
