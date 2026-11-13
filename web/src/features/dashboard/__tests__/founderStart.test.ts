import assert from "node:assert/strict";
import test from "node:test";

import {
  duplicatesNextStep,
  isShownOnStart,
  resolveFounderStart,
  startStepHref,
  type StartInput,
  type StartTeamInput,
} from "@/features/dashboard/founderStart";

const team = (overrides: Partial<StartTeamInput> = {}): StartTeamInput => ({
  id: "team-1",
  venture: "present",
  setup: { total: 23, settled: 0, awaitingConfirmation: 0, started: false },
  testProject: "none",
  rhythmSet: false,
  checkIn: null,
  ...overrides,
});

const input = (overrides: Partial<StartInput> = {}): StartInput => ({
  needsOnboarding: false,
  work: "completed",
  capabilityAreas: 4,
  ventureWithoutTeam: "present",
  team: team(),
  ...overrides,
});

const settled = { total: 23, settled: 23, awaitingConfirmation: 0, started: true };

test("neu dabei: erst das Basisprofil, dann die Arbeitsweise", () => {
  const fresh = input({ work: "new", capabilityAreas: 0, ventureWithoutTeam: "open", team: null });
  assert.deepEqual(resolveFounderStart({ ...fresh, needsOnboarding: true }).next, { kind: "complete_profile" });
  const start = resolveFounderStart(fresh);
  assert.deepEqual(start.next, { kind: "workstyle_start" });
  assert.equal(start.phase, "foundation");
  assert.deepEqual(
    start.steps.map((step) => step.state),
    ["current", "open", "open", "open"]
  );
  // Eine fruehere Fassung zaehlt nicht als aktuelles Arbeitsprofil.
  assert.deepEqual(resolveFounderStart({ ...fresh, work: "legacy" }).next, { kind: "workstyle_start" });
  assert.deepEqual(resolveFounderStart({ ...fresh, work: "started" }).next, { kind: "workstyle_continue" });
});

test("die Grundlagen in fester Reihenfolge: Bereiche, Vorhaben, dann einladen", () => {
  assert.deepEqual(resolveFounderStart(input({ capabilityAreas: 0 })).next, { kind: "capability" });
  assert.deepEqual(resolveFounderStart(input({ team: team({ venture: "inProgress" }) })).next, {
    kind: "venture_continue",
    teamId: "team-1",
  });
  // Seit 12.11.2026 gibt es nur noch die Beta, und sie legt kein Vorhaben an: Ohne Team geht es mit dem Einladen weiter.
  assert.deepEqual(resolveFounderStart(input({ team: null, ventureWithoutTeam: "open" })).next, { kind: "invite" });
  assert.deepEqual(resolveFounderStart(input({ team: team({ venture: "open" }) })).next, { kind: "venture_start", teamId: "team-1" });
  const solo = resolveFounderStart(input({ team: null }));
  assert.deepEqual(solo.next, { kind: "invite" });
  assert.deepEqual(
    solo.steps.map((step) => [step.key, step.state]),
    [
      ["work", "done"],
      ["can", "done"],
      ["venture", "done"],
      ["agree", "current"],
    ]
  );
});

test("Founder Setup: Bestaetigungen zuerst, dann die offenen Themen", () => {
  assert.deepEqual(
    resolveFounderStart(input({ team: team({ setup: { total: 23, settled: 7, awaitingConfirmation: 2, started: true } }) })).next,
    { kind: "setup_confirm", teamId: "team-1", count: 2 }
  );
  assert.deepEqual(
    resolveFounderStart(input({ team: team({ setup: { total: 23, settled: 7, awaitingConfirmation: 0, started: true } }) })).next,
    { kind: "setup_continue", teamId: "team-1", open: 16 }
  );
  assert.deepEqual(resolveFounderStart(input()).next, { kind: "setup_start", teamId: "team-1" });
  // Nicht lesbar heisst nicht fertig.
  const unreadable = resolveFounderStart(input({ team: team({ setup: null }) }));
  assert.equal(unreadable.phase, "foundation");
  assert.deepEqual(unreadable.next, { kind: "setup_start", teamId: "team-1" });
});

test("steht das Setup, wechselt der Weg in den Alltag", () => {
  const everyday = resolveFounderStart(input({ team: team({ setup: settled }) }));
  assert.equal(everyday.phase, "everyday");
  assert.deepEqual(everyday.next, { kind: "test_project", teamId: "team-1", running: false });
  assert.deepEqual(
    everyday.steps.map((step) => [step.key, step.state]),
    [
      ["testProject", "current"],
      ["rhythm", "open"],
      ["steady", "open"],
    ]
  );
  assert.deepEqual(resolveFounderStart(input({ team: team({ setup: settled, testProject: "active" }) })).next, {
    kind: "test_project",
    teamId: "team-1",
    running: true,
  });
  assert.deepEqual(resolveFounderStart(input({ team: team({ setup: settled, testProject: "closed" }) })).next, {
    kind: "rhythm",
    teamId: "team-1",
  });
});

test("der Dauerzustand folgt dem Check-in", () => {
  const steady = (checkIn: StartTeamInput["checkIn"]) =>
    resolveFounderStart(input({ team: team({ setup: settled, testProject: "closed", rhythmSet: true, checkIn }) }));
  assert.deepEqual(steady({ state: "open", due: null }).next, { kind: "check_in_open", teamId: "team-1" });
  assert.deepEqual(steady({ state: "due", due: "2026-11-01T00:00:00.000Z" }).next, { kind: "check_in_due", teamId: "team-1" });
  assert.deepEqual(steady({ state: "scheduled", due: "2026-11-12T00:00:00.000Z" }).next, {
    kind: "check_in_scheduled",
    teamId: "team-1",
    due: "2026-11-12T00:00:00.000Z",
  });
  assert.deepEqual(steady(null).next, { kind: "team_steady", teamId: "team-1" });
  assert.deepEqual(
    steady(null).steps.map((step) => step.state),
    ["done", "done", "current"]
  );
});

test("jeder Schritt fuehrt an eine bestehende Stelle", () => {
  assert.equal(startStepHref({ kind: "complete_profile" }), "#dashboard-block-profile-data");
  assert.match(startStepHref({ kind: "workstyle_start" }), /^\/research\/workstyle-pretest\?version=8\.5a-v5/);
  assert.equal(startStepHref({ kind: "capability" }), "/profile?step=areas");
  assert.equal(startStepHref({ kind: "venture_start", teamId: null }), "/founder-alignment/vorhaben/beta");
  assert.equal(startStepHref({ kind: "venture_continue", teamId: "a b" }), "/founder-alignment/vorhaben/beta?venture=a%20b");
  assert.equal(startStepHref({ kind: "invite" }), "/invite/new");
  assert.equal(startStepHref({ kind: "setup_confirm", teamId: "t", count: 1 }), "/teams/t/setup");
  assert.equal(startStepHref({ kind: "test_project", teamId: "t", running: false }), "/teams/t/test-project");
  assert.equal(startStepHref({ kind: "rhythm", teamId: "t" }), "/teams/t/check-in");
  assert.equal(startStepHref({ kind: "check_in_scheduled", teamId: "t", due: "x" }), "/teams/t/check-in");
  assert.equal(startStepHref({ kind: "team_steady", teamId: "t" }), "/teams/t");
});

test("was schon der naechste Schritt ist, steht nicht noch einmal unter 'Wartet auf dich'", () => {
  const setupStep = { kind: "setup_confirm", teamId: "t", count: 2 } as const;
  assert.equal(duplicatesNextStep({ type: "setup_confirmation", href: "/teams/t/setup/decision_rights" }, setupStep), true);
  assert.equal(duplicatesNextStep({ type: "setup_confirmation", href: "/teams/other/setup/decision_rights" }, setupStep), false);
  assert.equal(duplicatesNextStep({ type: "setup_advisor_consent", href: "/teams/t/setup" }, setupStep), false);
  const checkInStep = { kind: "check_in_due", teamId: "t" } as const;
  assert.equal(duplicatesNextStep({ type: "check_in_due", href: "/teams/t/check-in" }, checkInStep), true);
  assert.equal(duplicatesNextStep({ type: "check_in_due", href: "/teams/t/check-in" }, { kind: "capability" }), false);
});

test("Uebungen zu zweit sind kein Schritt - nur die Read-My-Mind-Einladung bleibt als Karte", () => {
  for (const type of [
    "read_my_mind_continue",
    "read_my_mind_reveal",
    "founder_in_the_wild_handoff",
    "founder_in_the_wild_reveal",
    "commitment_lab_continue",
    "values_continue",
    "founder_alignment_continue",
  ]) {
    assert.equal(isShownOnStart({ type }), false, type);
  }
  for (const type of ["read_my_mind_invitation", "incoming_invitation", "setup_advisor_consent", "check_in_open", "network_contact"]) {
    assert.equal(isShownOnStart({ type }), true, type);
  }
});
