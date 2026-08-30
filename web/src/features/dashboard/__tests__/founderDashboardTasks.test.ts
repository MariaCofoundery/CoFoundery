import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFounderDashboardTasks,
  splitFounderDashboardTasks,
  type FounderDashboardTaskSignals,
} from "@/features/dashboard/founderDashboardTasks";

const NOW = "2026-08-28T12:00:00.000Z";

function signals(
  overrides: Partial<FounderDashboardTaskSignals> = {}
): FounderDashboardTaskSignals {
  return {
    currentUserId: "founder-a",
    now: NOW,
    invitations: [],
    personal: {
      founderAlignmentStarted: false,
      founderAlignmentSubmitted: false,
      valuesStarted: false,
      valuesSubmitted: false,
    },
    discoveryIntros: [],
    relationships: [],
    relationshipAdvisors: [],
    setupAdvisorAccess: [],
    setupItems: [],
    setupConfirmations: [],
    commitmentLabs: [],
    readMyMindRounds: [],
    ...overrides,
  };
}

function relationship(overrides: Partial<FounderDashboardTaskSignals["relationships"][number]> = {}) {
  return {
    id: "relationship-ab",
    userAId: "founder-a",
    userBId: "founder-b",
    teamId: "team-abc",
    teamLabel: "Team Atlas",
    otherFounderLabel: "Ben",
    ...overrides,
  };
}

test("task priorities follow NEEDS_YOU, CONTINUE_PERSONAL, CONTINUE_SHARED", () => {
  const tasks = buildFounderDashboardTasks(signals({
    invitations: [{
      id: "invite",
      direction: "incoming",
      status: "sent",
      requiredModules: ["base"],
      inviteeBaseStarted: false,
      inviteeBaseSubmitted: false,
      inviteeValuesSubmitted: false,
      isReportReady: false,
      inviterLabel: "Anna",
      createdAt: "2026-08-28T08:00:00.000Z",
      expiresAt: "2026-09-01T00:00:00.000Z",
    }],
    personal: {
      founderAlignmentStarted: true,
      founderAlignmentSubmitted: false,
      valuesStarted: false,
      valuesSubmitted: false,
    },
    relationships: [relationship()],
    commitmentLabs: [{ relationshipId: "relationship-ab", updatedAt: NOW }],
  }));

  assert.deepEqual(tasks.map((task) => task.kind), [
    "NEEDS_YOU",
    "CONTINUE_PERSONAL",
    "CONTINUE_SHARED",
  ]);
});

test("task projection retains its three-item priority split", () => {
  const tasks = buildFounderDashboardTasks(signals({
    discoveryIntros: ["one", "two", "three", "four"].map((id, index) => ({
      id,
      recipientUserId: "founder-a",
      status: "pending",
      updatedAt: `2026-08-28T0${index}:00:00.000Z`,
    })),
  }));
  const split = splitFounderDashboardTasks(tasks);
  assert.equal(split.initial.length, 3);
  assert.equal(split.remaining.length, 1);
  assert.equal(split.hasMore, true);
  assert.deepEqual(splitFounderDashboardTasks([], 3), {
    initial: [],
    remaining: [],
    hasMore: false,
  });
});

test("Read My Mind only creates pending and own-answer tasks for supported two-founder teams", () => {
  const base = { teamId: "team", teamLabel: "Team Atlas", creatorLabel: "Anna", status: "forming", ownParticipantState: "pending", handoffReady: false, ownAnswerComplete: false, wholeAnswerComplete: false, ownRevealComplete: false, nextRevealPosition: null, supportedTwoFounderTeam: true, createdAt: NOW };
  const tasks = buildFounderDashboardTasks(signals({ readMyMindRounds: [
    { id: "pre-handoff", ...base },
    { id: "pending", ...base, handoffReady: true },
    { id: "creator", ...base, ownParticipantState: "joined" },
    { id: "creator-waiting", ...base, ownParticipantState: "joined", ownAnswerComplete: true, handoffReady: true },
    { id: "continue", ...base, status: "active", ownParticipantState: "joined" },
    { id: "waiting", ...base, status: "active", ownParticipantState: "joined", ownAnswerComplete: true },
    { id: "reveal", ...base, status: "active", ownParticipantState: "joined", ownAnswerComplete: true, wholeAnswerComplete: true, nextRevealPosition: 2 },
    { id: "revealed", ...base, status: "active", ownParticipantState: "joined", ownAnswerComplete: true, wholeAnswerComplete: true, ownRevealComplete: true },
    { id: "three", ...base, supportedTwoFounderTeam: false },
  ] }));
  assert.deepEqual(tasks.map((task) => [task.type, task.kind]), [
    ["read_my_mind_invitation", "NEEDS_YOU"],
    ["read_my_mind_continue", "CONTINUE_SHARED"],
    ["read_my_mind_continue", "CONTINUE_SHARED"],
    ["read_my_mind_reveal", "CONTINUE_SHARED"],
  ]);
  assert.match(tasks[0]!.href, /collaboration-lab\/read-my-mind\/pending$/);
  assert.match(tasks[3]!.href, /reveal\/2$/);
});

test("only actionable incoming invitations become tasks", () => {
  const base = {
    requiredModules: ["base"] as Array<"base" | "values">,
    inviteeBaseStarted: false,
    inviteeBaseSubmitted: false,
    inviteeValuesSubmitted: false,
    isReportReady: false,
    inviterLabel: "Anna",
    createdAt: NOW,
    expiresAt: "2026-09-01T00:00:00.000Z",
  };
  const tasks = buildFounderDashboardTasks(signals({
    invitations: [
      { ...base, id: "incoming", direction: "incoming", status: "sent" },
      { ...base, id: "sent", direction: "sent", status: "sent" },
      {
        ...base,
        id: "done",
        direction: "incoming",
        status: "accepted",
        inviteeBaseSubmitted: true,
      },
      {
        ...base,
        id: "expired",
        direction: "incoming",
        status: "sent",
        expiresAt: "2026-08-01T00:00:00.000Z",
      },
      { ...base, id: "revoked", direction: "incoming", status: "revoked" },
    ],
  }));
  assert.deepEqual(tasks.map((task) => task.id), ["invitation:incoming"]);
  assert.equal(tasks[0]?.href, "/invite/incoming/resume");
});

test("Discovery intros are recipient-only and expose no search preferences", () => {
  const tasks = buildFounderDashboardTasks(signals({
    discoveryIntros: [
      { id: "own", recipientUserId: "founder-a", status: "pending", updatedAt: NOW },
      { id: "answered", recipientUserId: "founder-a", status: "accepted", updatedAt: NOW },
      { id: "foreign", recipientUserId: "founder-b", status: "pending", updatedAt: NOW },
    ],
  }));
  assert.deepEqual(tasks.map((task) => task.id), ["discovery-intro:own"]);
  assert.equal(tasks[0]?.href, "/discovery/intros");
  assert.equal("searchPreferences" in tasks[0]!, false);
});

test("relationship advisor consent is shown only to the founder whose approval is missing", () => {
  const common = {
    id: "advisor",
    relationshipId: "relationship-ab",
    status: "pending",
    founderAApproved: true,
    founderBApproved: false,
    updatedAt: NOW,
  };
  const founderATasks = buildFounderDashboardTasks(signals({
    relationships: [relationship()],
    relationshipAdvisors: [common],
  }));
  assert.equal(founderATasks.some((task) => task.type === "relationship_advisor_consent"), false);

  const founderBTasks = buildFounderDashboardTasks(signals({
    currentUserId: "founder-b",
    relationships: [relationship()],
    relationshipAdvisors: [common],
  }));
  assert.equal(founderBTasks[0]?.type, "relationship_advisor_consent");
});

test("Founder Setup advisor consent is own-consent-only for two and three founders", () => {
  const pending = {
    grantId: "grant",
    teamId: "team-abc",
    teamLabel: "Team Atlas",
    status: "pending",
    accessActive: false,
    consentedFounderUserIds: ["founder-a"],
    updatedAt: NOW,
  };
  assert.equal(
    buildFounderDashboardTasks(signals({ setupAdvisorAccess: [pending] })).length,
    0
  );
  assert.equal(
    buildFounderDashboardTasks(signals({
      currentUserId: "founder-b",
      setupAdvisorAccess: [pending],
    }))[0]?.type,
    "setup_advisor_consent"
  );
  assert.equal(
    buildFounderDashboardTasks(signals({
      currentUserId: "founder-c",
      setupAdvisorAccess: [{ ...pending, consentedFounderUserIds: ["founder-a", "founder-b"] }],
    }))[0]?.type,
    "setup_advisor_consent"
  );
  assert.equal(
    buildFounderDashboardTasks(signals({
      currentUserId: "founder-c",
      setupAdvisorAccess: [{ ...pending, status: "active", accessActive: true }],
    })).length,
    0
  );
});

test("pending Setup revision disappears after the current founder confirms", () => {
  const item = {
    id: "item",
    teamId: "team-abc",
    teamLabel: "Team Atlas",
    itemKey: "decision_rights" as const,
    workStatus: "discussing",
    pendingRevisionId: "revision",
    updatedAt: NOW,
  };
  const pending = buildFounderDashboardTasks(signals({ setupItems: [item] }));
  assert.equal(pending[0]?.type, "setup_confirmation");
  assert.equal(pending[0]?.itemKey, "decision_rights");

  const confirmed = buildFounderDashboardTasks(signals({
    setupItems: [item],
    setupConfirmations: [{ revisionId: "revision", userId: "founder-a" }],
  }));
  assert.equal(confirmed.some((task) => task.type === "setup_confirmation"), false);
  assert.equal(confirmed.some((task) => task.type === "founder_setup_continue"), false);
});

test("personal tasks require a started but incomplete assessment", () => {
  const neverStarted = buildFounderDashboardTasks(signals());
  assert.equal(neverStarted.length, 0);
  const started = buildFounderDashboardTasks(signals({
    personal: {
      founderAlignmentStarted: true,
      founderAlignmentSubmitted: false,
      valuesStarted: true,
      valuesSubmitted: false,
    },
  }));
  assert.deepEqual(started.map((task) => task.type), [
    "founder_alignment_continue",
    "values_continue",
  ]);
  const complete = buildFounderDashboardTasks(signals({
    personal: {
      founderAlignmentStarted: true,
      founderAlignmentSubmitted: true,
      valuesStarted: true,
      valuesSubmitted: true,
    },
  }));
  assert.equal(complete.length, 0);
});

test("an available report is not modeled as a task without a viewed-state contract", () => {
  const tasks = buildFounderDashboardTasks(signals());
  const modelSource = readFileSync(
    "src/features/dashboard/founderDashboardTasks.ts",
    "utf8"
  );
  const dataSource = readFileSync(
    "src/features/dashboard/founderDashboardTaskData.ts",
    "utf8"
  );
  const dashboardSource = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  assert.deepEqual(tasks, []);
  assert.doesNotMatch(modelSource, /NEW_RESULT|alignment_report/);
  assert.doesNotMatch(dataSource, /reports:/);
  assert.doesNotMatch(dashboardSource, /tasks\.items\.alignmentReport/);
  assert.match(dashboardSource, /href=\{`\/report\/\$\{run\.invitation_id\}`\}/);
  assert.match(dashboardSource, /dashboard-block-connections/);
  assert.doesNotMatch(JSON.stringify(tasks), /workbook|deep.dive/i);
});

test("Commitment Lab tasks are limited to the current founder's pairwise relationships", () => {
  const tasks = buildFounderDashboardTasks(signals({
    relationships: [
      relationship(),
      relationship({ id: "relationship-ac", userBId: "founder-c", otherFounderLabel: "Cara" }),
      relationship({ id: "relationship-bc", userAId: "founder-b", userBId: "founder-c" }),
    ],
    commitmentLabs: [
      { relationshipId: "relationship-ab", updatedAt: NOW },
      { relationshipId: "relationship-ac", updatedAt: NOW },
      { relationshipId: "relationship-bc", updatedAt: NOW },
    ],
  }));
  assert.deepEqual(tasks.map((task) => task.id).sort(), [
    "commitment-lab:relationship-ab",
    "commitment-lab:relationship-ac",
  ]);
});

test("generic Founder Setup continuation is factual and suppressed by a concrete task", () => {
  const item = {
    id: "item",
    teamId: "team-abc",
    teamLabel: "Team Atlas",
    itemKey: "roles_responsibilities" as const,
    workStatus: "discussing",
    pendingRevisionId: null,
    updatedAt: NOW,
  };
  assert.equal(
    buildFounderDashboardTasks(signals({ setupItems: [item] }))[0]?.type,
    "founder_setup_continue"
  );
  const withConsent = buildFounderDashboardTasks(signals({
    setupItems: [item],
    setupAdvisorAccess: [{
      grantId: "grant",
      teamId: "team-abc",
      teamLabel: "Team Atlas",
      status: "pending",
      accessActive: false,
      consentedFounderUserIds: [],
      updatedAt: NOW,
    }],
  }));
  assert.equal(withConsent.some((task) => task.type === "founder_setup_continue"), false);
});

test("dashboard task loader remains narrow, read-only, and content-free", () => {
  const dataSource = readFileSync(
    "src/features/dashboard/founderDashboardTaskData.ts",
    "utf8"
  );
  assert.doesNotMatch(dataSource, /workbook|assessment_answers|working_note|shared_reflection|scenario_answers/);
  assert.doesNotMatch(dataSource, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\([^)]*(save|confirm|finalize)/);
  assert.match(dataSource, /commitment_labs[\s\S]*relationship_id, updated_at/);
  assert.match(dataSource, /founder_team_setup_items[\s\S]*pending_revision_id/);
  assert.match(dataSource, /collaboration_experience_rounds[\s\S]*\.eq\("experience_key", "read_my_mind"\)/);
});

test("task UI and DE/EN messages preserve the three-item limit and empty state", () => {
  const component = readFileSync("src/features/dashboard/DashboardTaskList.tsx", "utf8");
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  type TaskMessages = {
    tasks: { empty: { title: string }; kinds: Record<string, string> };
  };
  const de = JSON.parse(
    readFileSync("messages/de/dashboard.json", "utf8")
  ) as TaskMessages;
  const en = JSON.parse(
    readFileSync("messages/en/dashboard.json", "utf8")
  ) as TaskMessages;
  assert.match(component, /tasks\.slice\(0, 3\)/);
  assert.doesNotMatch(component, /aria-expanded|showAll|useState/);
  assert.match(dashboard, /dashboard-block-tasks/);
  assert.match(dashboard, /sectionNavigation\.tasks/);
  assert.doesNotMatch(dashboard, /prioritizedTask|resolvedHeroPanel/);
  assert.equal(de.tasks.empty.title, "Aktuell wartet nichts auf dich.");
  assert.equal(en.tasks.empty.title, "Nothing is waiting for you right now.");
  assert.deepEqual(Object.keys(de.tasks.kinds), Object.keys(en.tasks.kinds));
});
