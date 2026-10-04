import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  resolveDashboardHeroAction,
  resolveDashboardPrimaryAction,
  resolveDiscoveryFoundationState,
  resolveFounderAlignmentFoundationState,
  resolveValuesFoundationState,
} from "@/features/dashboard/founderDashboardV2";

const dashboardSource = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
const shellSource = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
type DashboardMessages = {
  hero: { eyebrow: string; primary: Record<string, string>; primaryText: Record<string, string> };
  aboutYou: { title: string; ownProfile: { title: string }; find: { title: string }; edit: { title: string } };
  foundation: {
    alignment: { title: string };
    values: { optionalBadge: string };
    discovery: { eyebrow: string };
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
      hasTeam: true,
      hasConnectionActivity: true,
    }),
    "open_team"
  );

  assert.equal(
    resolveDashboardHeroAction({
      hasIncomingInvitation: false,
      hasSubmittedFounderAlignment: true,
      hasStartedFounderAlignment: true,
      hasStartedValues: true,
      hasTeam: true,
      hasConnectionActivity: true,
    }),
    "values_continue"
  );

  assert.equal(
    resolveDashboardHeroAction({
      hasIncomingInvitation: false,
      hasSubmittedFounderAlignment: false,
      hasStartedFounderAlignment: false,
      hasStartedValues: false,
      hasTeam: false,
      hasConnectionActivity: false,
    }),
    "invite_cofounder"
  );
});

test("an old alignment report does not become a persistent hero action", () => {
  assert.equal(
    resolveDashboardHeroAction({
      hasIncomingInvitation: false,
      hasSubmittedFounderAlignment: true,
      hasStartedFounderAlignment: true,
      hasStartedValues: false,
      hasTeam: false,
      hasConnectionActivity: true,
    }),
    "open_connections"
  );
  assert.doesNotMatch(dashboardSource, /case "alignment_report"/);
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
  // Der Prozentwert ist nicht nur aus dem Dashboard verschwunden, sondern
  // ganz: seine Gewichte waren frei gewaehlt, und einer davon belohnte eine
  // Plattformhandlung statt einer Eigenschaft der Person.
  assert.doesNotMatch(dashboardSource, /computeProfileCompletion/);
  const completionSource = readFileSync("src/features/profile/profileCompletion.ts", "utf8");
  assert.doesNotMatch(completionSource, /export function computeProfileCompletion/);
  assert.doesNotMatch(completionSource, /EXTENDED_WEIGHTS/);
  // Die Weiche fuers Routing bleibt - sie ist kein Score.
  assert.match(completionSource, /export function isCoreProfileComplete/);
  assert.doesNotMatch(dashboardSource, /founder_alignment_workbooks/);
  assert.doesNotMatch(dashboardSource, /startWorkbook|continueWorkbook|workbookFocus/);
});

test("die eine Hauptaktion: Profil zuerst, dann die eigene Arbeitsweise, sonst nichts", () => {
  assert.equal(resolveDashboardPrimaryAction({ needsOnboarding: true, workProfileState: "completed" }), "complete_profile");
  assert.equal(resolveDashboardPrimaryAction({ needsOnboarding: true, workProfileState: "new" }), "complete_profile");
  assert.equal(resolveDashboardPrimaryAction({ needsOnboarding: false, workProfileState: "new" }), "workstyle_start");
  assert.equal(resolveDashboardPrimaryAction({ needsOnboarding: false, workProfileState: "legacy" }), "workstyle_start");
  assert.equal(resolveDashboardPrimaryAction({ needsOnboarding: false, workProfileState: "started" }), "workstyle_continue");
  // Ist nichts offen, bleibt der Kopfbereich ruhig - keine erzwungene Aktion.
  assert.equal(resolveDashboardPrimaryAction({ needsOnboarding: false, workProfileState: "completed" }), null);
  // Und hoechstens eine: der Bereich rendert genau einen bedingten Link.
  const hero = dashboardSource.slice(
    dashboardSource.indexOf("data-dashboard-hero"),
    dashboardSource.indexOf('id="dashboard-block-tasks"'),
  );
  assert.equal(hero.match(/<Link/g)?.length, 1);
  assert.match(hero, /primaryAction \? \(/);
});

test("vier Bereiche in fester Reihenfolge: Begruessung, Ansteht, Teams, Über dich", () => {
  assert.match(dashboardSource, /t\("hero\.eyebrow"\)/);
  assert.match(dashboardSource, /t\("hero\.greeting"/);
  const order = [
    "data-dashboard-hero",
    'id="dashboard-block-tasks"',
    'id="dashboard-block-connections"',
    'id="dashboard-block-profile"',
    'id="dashboard-legacy-title"',
    'id="dashboard-block-account"',
  ].map((marker) => dashboardSource.indexOf(marker));
  for (const at of order) assert.ok(at > -1, "ein Bereich fehlt");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "die Reihenfolge stimmt nicht");

  assert.match(dashboardSource, /<AlignWorkstyleStatus state=\{alignState\}/);
  assert.match(dashboardSource, /<AlignVentureActions state=\{alignState\}/);
  assert.match(dashboardSource, /getOwnDiscoveryProfile/);
  assert.doesNotMatch(dashboardSource, /foundation\.values\.optionalBadge/);
  assert.doesNotMatch(dashboardSource, /resolvedHeroPanel|prioritizedTask|buildDashboardV2HeroPanel/);
});

test("Zitat, Ausblick, Karussell, Netzwerk-Box und Abschnittsleiste sind weg", () => {
  for (const removed of [
    /hero\.quoteEyebrow|getQuoteOfTheDay/,
    /DashboardJourneyLine|sectionNavigation\./,
    /DashboardSpotlight|explore\./,
    /dashboard-block-outlook|outlook\./,
    /DashboardHeroConstellation/,
    /connectCounts|dashboard-network-title/,
    /dashboard-block-roadmap/,
  ]) {
    assert.doesNotMatch(dashboardSource, removed);
  }
  // Der Kopfbereich traegt keine Sammlung von Wegen mehr.
  assert.doesNotMatch(dashboardSource, /hero\.heroConnections|hero\.heroFind|hero\.heroOwnProfile/);
  // "Team Context" steht nicht mehr im Kopfbereich und nirgends hartkodiert.
  assert.doesNotMatch(dashboardSource, /Team Context/);
  // Die Library bleibt erreichbar - jetzt ueber die Leiste.
  assert.match(shellSource, /href: "\/founder-library"/);
});

test("Team-Intake bleibt fuer Founder erreichbar, aber leise im Teams-Bereich", () => {
  const teams = dashboardSource.slice(
    dashboardSource.indexOf('id="dashboard-block-connections"'),
    dashboardSource.indexOf('id="dashboard-block-profile"'),
  );
  assert.match(teams, /href="\/team-intake"/);
  assert.match(teams, /t\("team\.teamIntakeLink"\)/);
  // Im Advisor-Kontext steht Intake als regulaerer Menuepunkt.
  assert.match(shellSource, /href: "\/team-intake"[\s\S]{0,40}label: t\("advisorIntake"\)/);
});

test("fruehere Auswertungen stehen nur eingeklappt und nur, wenn es sie gibt", () => {
  const at = dashboardSource.indexOf('id="dashboard-legacy-title"');
  const details = dashboardSource.lastIndexOf("{hasHistory ? (", at);
  assert.ok(details > -1 && details < at);
  assert.match(dashboardSource.slice(details, at), /<details/);
  // Die alten Paarreports stehen hier und nicht mehr im Teams-Bereich.
  const teams = dashboardSource.slice(
    dashboardSource.indexOf('id="dashboard-block-connections"'),
    dashboardSource.indexOf('id="dashboard-block-profile"'),
  );
  assert.doesNotMatch(teams, /renderCompactReportRow/);
  assert.ok(dashboardSource.indexOf("renderCompactReportRow(run, t)") > details);
});

test("Current work is the only task presentation and remains capped at three items", () => {
  const taskList = readFileSync("src/features/dashboard/DashboardTaskList.tsx", "utf8");
  assert.equal(dashboardSource.match(/<DashboardTaskList/g)?.length, 1);
  assert.match(taskList, /tasks\.slice\(0, 3\)/);
  assert.doesNotMatch(taskList, /showAll|aria-expanded|useState/);
  assert.doesNotMatch(dashboardSource, /resolvedHeroPanel|tasks\[0\]/);
});

test("DE and EN preserve personal dashboard semantics and optional values", () => {
  assert.equal(deDashboard.hero.eyebrow, "Founder Dashboard");
  assert.equal(enDashboard.hero.eyebrow, "Founder dashboard");
  assert.deepEqual(Object.keys(deDashboard.hero.primary), ["complete_profile", "workstyle_start", "workstyle_continue"]);
  assert.deepEqual(Object.keys(enDashboard.hero.primary), Object.keys(deDashboard.hero.primary));
  assert.deepEqual(Object.keys(enDashboard.hero.primaryText), Object.keys(deDashboard.hero.primaryText));
  assert.equal(deDashboard.aboutYou.title, "Über dich");
  assert.equal(enDashboard.aboutYou.title, "About you");
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
