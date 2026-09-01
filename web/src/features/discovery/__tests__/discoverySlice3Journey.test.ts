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
  assert.equal(deDiscovery.matchingPreparation.states.startTitle, "Gemeinsam prüfen");
  assert.equal(enDiscovery.matchingPreparation.states.startTitle, "Explore together");
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

test("the second consent prepares only the idempotent matching session", () => {
  const confirmationAt = matchingPage.indexOf("await confirmFullDiscoveryMatchingAction(");
  const sessionAt = matchingPage.indexOf(
    "await createMatchingSessionFromDiscoveryStartAction(",
    confirmationAt
  );
  assert.ok(confirmationAt >= 0);
  assert.ok(sessionAt > confirmationAt);
  assert.equal(
    matchingPage.slice(confirmationAt, sessionAt).includes("startWorkspaceFromMatchingSession"),
    false
  );
  assert.match(matchingPage, /if \(!result\.ok\)/);
});

test("missing inputs expose status only and the report boundary remains a user action", () => {
  assert.match(matchingPage, /currentUserBaseMissing/);
  assert.match(matchingPage, /counterpartBaseMissing/);
  assert.match(matchingPage, /partnerInputsMissingTitle/);
  assert.doesNotMatch(matchingPage, /answeredCount|answer_count|36 questions/);
  assert.match(matchingPage, /action=\{createMatchingReport\}/);
  assert.equal(
    deDiscovery.matchingPreparation.readiness.partnerInputsMissingTitle,
    "{name} vervollständigt noch den eigenen Teil"
  );
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
  assert.equal(
    deDiscovery.matchingPreparation.actions.confirmMatching,
    "Zustimmen und gemeinsam prüfen"
  );
  assert.equal(
    enDiscovery.matchingPreparation.actions.confirmMatching,
    "Consent and explore together"
  );
});
