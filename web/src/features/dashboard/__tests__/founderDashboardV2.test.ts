import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  resolveDashboardHeroAction,
  resolveDiscoveryFoundationState,
  resolveFounderAlignmentFoundationState,
  resolveValuesFoundationState,
} from "@/features/dashboard/founderDashboardV2";

const dashboardSource = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
const journeySource = readFileSync(
  "src/features/dashboard/DashboardJourneyLine.tsx",
  "utf8"
);
type DashboardMessages = {
  hero: { eyebrow: string; quoteEyebrow: string };
  foundation: {
    alignment: { title: string };
    values: { optionalBadge: string };
    discovery: { eyebrow: string };
  };
  outlook: {
    inDevelopment: string;
    items: Record<string, string>;
  };
};

const deDashboard = JSON.parse(
  readFileSync("messages/de/dashboard.json", "utf8")
) as DashboardMessages;
const enDashboard = JSON.parse(
  readFileSync("messages/en/dashboard.json", "utf8")
) as DashboardMessages;
const deReport = JSON.parse(readFileSync("messages/de/report.json", "utf8")) as {
  legacy: { lockedPdfText: string };
};
const enReport = JSON.parse(readFileSync("messages/en/report.json", "utf8")) as {
  legacy: { lockedPdfText: string };
};

test("dashboard hero prioritizes an incoming invitation over all other states", () => {
  assert.equal(
    resolveDashboardHeroAction({
      hasIncomingInvitation: true,
      hasSubmittedFounderAlignment: true,
      hasStartedFounderAlignment: true,
      hasStartedValues: true,
      hasAlignmentReport: true,
      hasTeam: true,
      hasConnectionActivity: true,
    }),
    "incoming_invitation"
  );
});

test("dashboard hero continues personal work without making unopened values mandatory", () => {
  assert.equal(
    resolveDashboardHeroAction({
      hasIncomingInvitation: false,
      hasSubmittedFounderAlignment: false,
      hasStartedFounderAlignment: true,
      hasStartedValues: false,
      hasAlignmentReport: false,
      hasTeam: false,
      hasConnectionActivity: false,
    }),
    "founder_alignment_continue"
  );

  assert.equal(
    resolveDashboardHeroAction({
      hasIncomingInvitation: false,
      hasSubmittedFounderAlignment: true,
      hasStartedFounderAlignment: true,
      hasStartedValues: false,
      hasAlignmentReport: true,
      hasTeam: true,
      hasConnectionActivity: true,
    }),
    "alignment_report"
  );

  assert.equal(
    resolveDashboardHeroAction({
      hasIncomingInvitation: false,
      hasSubmittedFounderAlignment: true,
      hasStartedFounderAlignment: true,
      hasStartedValues: true,
      hasAlignmentReport: true,
      hasTeam: true,
      hasConnectionActivity: true,
    }),
    "values_continue"
  );
});

test("foundation states remain factual and independent", () => {
  assert.equal(
    resolveFounderAlignmentFoundationState({ submitted: false, started: false }),
    "not_started"
  );
  assert.equal(
    resolveFounderAlignmentFoundationState({ submitted: false, started: true }),
    "started"
  );
  assert.equal(
    resolveFounderAlignmentFoundationState({ submitted: true, started: true }),
    "result_available"
  );
  assert.equal(resolveValuesFoundationState({ submitted: false, started: false }), "optional");
  assert.equal(resolveValuesFoundationState({ submitted: false, started: true }), "started");
  assert.equal(resolveValuesFoundationState({ submitted: true, started: true }), "completed");
  assert.equal(resolveDiscoveryFoundationState("active"), "active");
  assert.equal(resolveDiscoveryFoundationState("paused"), "paused");
  assert.equal(resolveDiscoveryFoundationState(undefined), "not_created");
});

test("dashboard no longer renders a global roadmap, profile percentage, or workbook step", () => {
  assert.doesNotMatch(dashboardSource, /DashboardProgressRoadmap/);
  assert.doesNotMatch(dashboardSource, /currentStep/);
  assert.doesNotMatch(dashboardSource, /computeProfileCompletion/);
  assert.doesNotMatch(dashboardSource, /founder_alignment_workbooks/);
  assert.doesNotMatch(dashboardSource, /startWorkbook|continueWorkbook|workbookFocus/);
});

test("personal hero, quote, foundation and connections remain visible", () => {
  assert.match(dashboardSource, /t\("hero\.eyebrow"\)/);
  assert.match(dashboardSource, /t\("hero\.greeting"/);
  assert.match(dashboardSource, /t\("hero\.quoteEyebrow"\)/);
  assert.match(dashboardSource, /dashboard-block-foundation/);
  assert.match(dashboardSource, /dashboard-block-connections/);
  assert.match(dashboardSource, /foundation\.values\.optionalBadge/);
  assert.match(dashboardSource, /getOwnDiscoveryProfile/);
});

test("right-side section navigation points only to existing V2 sections", () => {
  for (const id of [
    "dashboard-block-foundation",
    "dashboard-block-connections",
    "dashboard-block-outlook",
  ]) {
    assert.match(dashboardSource, new RegExp(`id=\\"${id}\\"`));
    assert.match(dashboardSource, new RegExp(`id: \\"${id}\\"`));
  }
  assert.match(journeySource, /<nav/);
  assert.match(journeySource, /aria-current/);
  assert.match(journeySource, /href=\{`#\$\{section\.id\}`\}/);
  assert.doesNotMatch(dashboardSource, /dashboard-block-roadmap/);
});

test("outlook contains exactly the two V2 future themes in DE and EN", () => {
  const expectedKeys = [
    "checkInsText",
    "checkInsTitle",
    "collaborationText",
    "collaborationTitle",
  ];
  assert.deepEqual(Object.keys(deDashboard.outlook.items).sort(), expectedKeys);
  assert.deepEqual(Object.keys(enDashboard.outlook.items).sort(), expectedKeys);
  assert.equal(deDashboard.outlook.inDevelopment, "In Entwicklung");
  assert.equal(enDashboard.outlook.inDevelopment, "In development");

  const outlookCopy = JSON.stringify({ de: deDashboard.outlook, en: enDashboard.outlook });
  assert.doesNotMatch(outlookCopy, /Investor Readiness|Wissensbibliothek|Knowledge library/);
  assert.doesNotMatch(outlookCopy, /Collaboration Profile|Founder Trial Sprint/);
});

test("DE and EN preserve personal dashboard semantics and optional values", () => {
  assert.equal(deDashboard.hero.eyebrow, "Founder Dashboard");
  assert.equal(enDashboard.hero.eyebrow, "Founder dashboard");
  assert.equal(deDashboard.hero.quoteEyebrow, "Zitat des Tages");
  assert.equal(enDashboard.hero.quoteEyebrow, "Quote of the day");
  assert.equal(deDashboard.foundation.values.optionalBadge, "Optional");
  assert.equal(enDashboard.foundation.values.optionalBadge, "Optional");
  assert.equal(deDashboard.foundation.alignment.title, "Founder Alignment");
  assert.equal(enDashboard.foundation.discovery.eyebrow, "Your discovery profile");
  assert.equal(deReport.legacy.lockedPdfText, "PDF-Export ist derzeit nicht verfügbar.");
  assert.equal(enReport.legacy.lockedPdfText, "PDF export is currently unavailable.");
});

test("historical workbook route remains available while dashboard load finalization stays unchanged", () => {
  const legacyRoute = readFileSync(
    "src/app/(product)/founder-alignment/workbook/page.tsx",
    "utf8"
  );
  assert.ok(legacyRoute.length > 0);
  assert.match(dashboardSource, /finalizeInvitationIfReady/);
});
