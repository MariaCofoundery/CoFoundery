import assert from "node:assert/strict";
import test from "node:test";

import { buildFounderDashboardTasks, type FounderDashboardTaskSignals } from "@/features/dashboard/founderDashboardTasks";

const base = (checkIns: FounderDashboardTaskSignals["checkIns"]): FounderDashboardTaskSignals => ({
  currentUserId: "u1",
  now: "2026-10-28T10:00:00.000Z",
  invitations: [],
  personal: { founderAlignmentStarted: false, founderAlignmentSubmitted: false, valuesStarted: false, valuesSubmitted: false },
  discoveryIntros: [],
  relationships: [],
  relationshipAdvisors: [],
  setupAdvisorAccess: [],
  setupItems: [],
  setupConfirmations: [],
  commitmentLabs: [],
  readMyMindRounds: [],
  checkIns,
});

test("Aufgabe: ein faelliger Check-in ist eine gemeinsame Aufgabe und fuehrt in den Check-in", () => {
  const tasks = buildFounderDashboardTasks(base([{ teamId: "t1", teamLabel: "Nora + Ben", state: "due", at: "2026-10-01T00:00:00.000Z" }]));
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].type, "check_in_due");
  assert.equal(tasks[0].kind, "CONTINUE_SHARED");
  assert.equal(tasks[0].href, "/teams/t1/check-in");
  assert.equal(tasks[0].contextLabel, "Nora + Ben");
});

test("Aufgabe: laeuft ein Check-in und die eigene Abgabe fehlt, wartet er auf die Person", () => {
  const tasks = buildFounderDashboardTasks(base([{ teamId: "t1", teamLabel: null, state: "open_needs_you", at: "2026-10-20T00:00:00.000Z" }]));
  assert.equal(tasks[0].type, "check_in_open");
  assert.equal(tasks[0].kind, "NEEDS_YOU");
});

test("Aufgabe: ohne Check-in-Signal entsteht nichts, und 'wartet auf dich' steht vor 'faellig'", () => {
  assert.equal(buildFounderDashboardTasks(base(undefined)).length, 0);
  const tasks = buildFounderDashboardTasks(base([
    { teamId: "a", teamLabel: null, state: "due", at: "2026-10-27T00:00:00.000Z" },
    { teamId: "b", teamLabel: null, state: "open_needs_you", at: "2026-10-01T00:00:00.000Z" },
  ]));
  assert.deepEqual(tasks.map((task) => task.type), ["check_in_open", "check_in_due"]);
});
