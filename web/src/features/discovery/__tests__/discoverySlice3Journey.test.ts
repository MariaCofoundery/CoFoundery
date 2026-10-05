import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import deDiscovery from "../../../../messages/de/discovery.json";
import enDiscovery from "../../../../messages/en/discovery.json";
import deReport from "../../../../messages/de/report.json";
import enReport from "../../../../messages/en/report.json";
import deTeams from "../../../../messages/de/teams.json";
import enTeams from "../../../../messages/en/teams.json";

const matchingPage = readFileSync(
  new URL(
    "../../../app/(product)/discovery/intros/[introRequestId]/matching/page.tsx",
    import.meta.url
  ),
  "utf8"
);
const matchingActions = readFileSync(
  new URL("../discoveryMatchingStartActions.ts", import.meta.url),
  "utf8"
);

test("the founder journey uses one plain-language state map in German and English", () => {
  assert.equal(deDiscovery.intros.title, "Kennenlernen");
  assert.equal(enDiscovery.intros.title, "Meet founders");
  assert.equal(deDiscovery.detail.intro.request, "Kennenlernen anfragen");
  assert.equal(enDiscovery.detail.intro.request, "Ask to connect");
  // Phase 11: Der zweite Schritt fuehrt in den Teambereich, nicht in einen Vergleich.
  assert.equal(deDiscovery.matchingPreparation.states.startTitle, "Gemeinsam weitergehen");
  assert.equal(enDiscovery.matchingPreparation.states.startTitle, "Continue together");
  assert.equal(
    deDiscovery.matchingPreparation.readiness.completeInputs,
    "Angaben vervollständigen"
  );
  assert.equal(
    enDiscovery.matchingPreparation.readiness.completeInputs,
    "Complete your details"
  );
  assert.equal(deDiscovery.matchingPreparation.readiness.viewAlignment, "Alignment ansehen");
  assert.equal(enDiscovery.matchingPreparation.readiness.viewAlignment, "View Alignment");
  assert.equal(deReport.session.startWorkspace, "Zusammenarbeit starten");
  assert.equal(enReport.session.startWorkspace, "Start collaborating");
});

test("the explicit joint-check action folds in technical preparation without removing consent", () => {
  assert.match(matchingActions, /requestDiscoveryJointCheckAction/);
  const prepareAt = matchingActions.indexOf("await startDiscoveryMatchingPreparation({");
  const requestAt = matchingActions.indexOf("await requestFullDiscoveryMatching({", prepareAt);
  assert.ok(prepareAt >= 0);
  assert.ok(requestAt > prepareAt);
  assert.match(matchingPage, /action=\{requestJointCheck\}/);
  assert.match(matchingPage, /confirmFullDiscoveryMatchingAction/);
  assert.match(matchingPage, /actions\.confirmMatching/);
});

test("the second consent creates no legacy matching session and leads into the current team path", () => {
  // Phase 10: Frueher legte die Bestaetigung still eine Matching-Session des
  // frueheren Fragebogens an. Jetzt nur noch die Zustimmung selbst; danach
  // fuehrt die Seite (ready_for_matching) in den aktuellen Teamweg.
  const confirmationAt = matchingPage.indexOf("await confirmFullDiscoveryMatchingAction(");
  assert.ok(confirmationAt >= 0);
  const actionBody = matchingPage.slice(confirmationAt, matchingPage.indexOf("async function createMatchingSession()", confirmationAt));
  assert.doesNotMatch(actionBody, /createMatchingSessionFromDiscoveryStartAction|startWorkspaceFromMatchingSession/);
  assert.match(actionBody, /redirect\(matchingStartResultUrl\(introRequestId, result\)\)/);
  assert.match(matchingPage, /open_discovery_workstyle_team/);
  assert.match(matchingPage, /redirect\(`\/teams\/\$\{data\}\/workstyle`\)/);
});

test("no legacy matching session or matching report on the current FIND path", () => {
  // Phase 11: Die unerreichbare Readiness-/Report-Ansicht ist entfernt. Nach
  // beidseitiger Zustimmung fuehrt die Seite nur noch in den aktuellen
  // Teambereich; fruehere Reports bleiben ueber ihre eigenen Seiten lesbar.
  const code = matchingPage.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert.doesNotMatch(
    code,
    /currentUserBaseMissing|createMatchingReport|createMatchingSession|getMatchingSessionForDiscoveryStart|getMatchingReportRunForSession|matchingCore/
  );
  assert.doesNotMatch(matchingPage, /answeredCount|answer_count|36 questions/);
  assert.match(matchingPage, /open_discovery_workstyle_team/);
  assert.match(matchingPage, /t\("matchingPreparation\.team\.open"\)/);
  assert.doesNotMatch(matchingPage, />\s*Euer Zusammenspiel öffnen\s*</, "keine hartkodierten Texte mehr");
  for (const copy of [deDiscovery.matchingPreparation, enDiscovery.matchingPreparation]) {
    const values = (o: unknown): string[] =>
      typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(values) : [];
    const visible = values({ ...copy, readiness: undefined, feedback: undefined }).join(" ");
    assert.doesNotMatch(visible, /Alignment|Workbook|Report/i);
  }
});

test("starting collaboration remains a conscious non-evaluative boundary", () => {
  assert.equal(deReport.session.prepareWorkspaceTitle, "Möchtet ihr weiter zusammenarbeiten?");
  assert.match(deReport.session.prepareWorkspaceSafety, /keine Aussage/);
  assert.match(enReport.session.prepareWorkspaceSafety, /does not state/);
  const copy = JSON.stringify({
    de: {
      intro: deDiscovery.intros,
      journey: deDiscovery.matchingPreparation,
      report: deReport.session,
    },
    en: {
      intro: enDiscovery.intros,
      journey: enDiscovery.matchingPreparation,
      report: enReport.session,
    },
  });
  assert.doesNotMatch(
    copy,
    /perfect match|perfektes match|compatibility score|kompatibilit[aä]t|match score/i
  );
});

test("introductions and connections have distinct visible roles", () => {
  assert.equal(deTeams.connections.title, "Verbindungen & Teams");
  assert.equal(enTeams.connections.title, "Connections & teams");
  assert.equal(deTeams.connections.potential.title, "Kennenlernen & gemeinsam prüfen");
  assert.equal(enTeams.connections.potential.title, "Meet & explore together");
  assert.match(deDiscovery.intros.subtitle, /Anfragen/);
  assert.match(deTeams.connections.established.description, /Arbeitsbereiche/);
});

test("the relevant actions retain mobile-safe wrapping and one primary action per state", () => {
  assert.match(matchingPage, /flex flex-wrap gap-3/);
  assert.equal(deDiscovery.matchingPreparation.actions.confirmMatching, "Zustimmen");
  assert.equal(enDiscovery.matchingPreparation.actions.confirmMatching, "Agree");
});
