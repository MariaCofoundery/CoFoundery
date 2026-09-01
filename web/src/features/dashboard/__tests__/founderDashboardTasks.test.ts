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
    founderInTheWildRounds: [],
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

function discoveryJourney(
  overrides: Partial<
    NonNullable<FounderDashboardTaskSignals["discoveryJourneys"]>[number]
  > = {}
) {
  return {
    introRequestId: "intro-ab",
    counterpartLabel: "Ben",
    matchingStartStatus: "awaiting_other_confirmation",
    requestedByUserId: "founder-b",
    matchingSessionStatus: null,
    ownBaseInputPresent: false,
    partnerBaseInputPresent: false,
    reportReady: false,
    updatedAt: NOW,
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
    commitmentLabs: [{ relationshipId: "relationship-ab", updatedAt: NOW, completed: false }],
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

test("Founder in the Wild projects handoff and founder-specific reveal-ready tasks", () => {
  const base = { teamId: "team", teamLabel: "Team Atlas", partnerLabel: "Ben", status: "active", ownStarted: false, ownAnswerComplete: false, partnerAnswerComplete: false, wholeAnswerComplete: false, ownRevealComplete: false, supportedTwoFounderTeam: true, createdAt: NOW };
  const tasks = buildFounderDashboardTasks(signals({ founderInTheWildRounds: [
    { id: "both-incomplete", ...base },
    { id: "recipient", ...base, partnerAnswerComplete: true },
    { id: "recipient-started", ...base, ownStarted: true, partnerAnswerComplete: true },
    { id: "sender-waiting", ...base, ownAnswerComplete: true },
    { id: "reveal-ready", ...base, ownAnswerComplete: true, partnerAnswerComplete: true, wholeAnswerComplete: true },
    { id: "own-reveal-complete", ...base, ownAnswerComplete: true, partnerAnswerComplete: true, wholeAnswerComplete: true, ownRevealComplete: true },
    { id: "completed-round", ...base, status: "completed", ownAnswerComplete: true, partnerAnswerComplete: true, wholeAnswerComplete: true },
    { id: "abandoned-round", ...base, status: "abandoned", ownAnswerComplete: true, partnerAnswerComplete: true, wholeAnswerComplete: true },
    { id: "unsupported", ...base, partnerAnswerComplete: true, supportedTwoFounderTeam: false },
  ] }));
  assert.deepEqual(tasks.map((task) => [task.id, task.type, task.kind, task.started]), [
    ["founder-in-the-wild-reveal:reveal-ready", "founder_in_the_wild_reveal", "NEEDS_YOU", undefined],
    ["founder-in-the-wild:recipient", "founder_in_the_wild_handoff", "NEEDS_YOU", false],
    ["founder-in-the-wild:recipient-started", "founder_in_the_wild_handoff", "NEEDS_YOU", true],
  ]);
  assert.match(tasks[0]!.href, /founder-in-the-wild\/reveal-ready\/reveal$/);
  assert.match(tasks[1]!.href, /founder-in-the-wild\/recipient$/);
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

test("Discovery joint-check consent is recipient-only and disappears after consent", () => {
  const recipientTasks = buildFounderDashboardTasks(signals({
    discoveryJourneys: [discoveryJourney()],
  }));
  assert.deepEqual(recipientTasks.map((task) => [task.kind, task.discoveryStage]), [
    ["NEEDS_YOU", "joint_check_consent"],
  ]);
  assert.equal(recipientTasks[0]?.personLabel, "Ben");
  assert.equal(recipientTasks[0]?.href, "/discovery/intros/intro-ab/matching");

  const requesterTasks = buildFounderDashboardTasks(signals({
    discoveryJourneys: [
      discoveryJourney({ requestedByUserId: "founder-a", counterpartLabel: "Ben" }),
    ],
  }));
  assert.equal(requesterTasks.length, 0);

  const consentedTasks = buildFounderDashboardTasks(signals({
    discoveryJourneys: [
      discoveryJourney({
        matchingStartStatus: "ready_for_matching",
        matchingSessionStatus: "awaiting_inputs",
        ownBaseInputPresent: true,
        partnerBaseInputPresent: false,
      }),
    ],
  }));
  assert.equal(consentedTasks.length, 0);
});

test("Discovery missing-input tasks are personal, deduplicated and owner-only", () => {
  const ownMissing = buildFounderDashboardTasks(signals({
    personal: {
      founderAlignmentStarted: true,
      founderAlignmentSubmitted: false,
      valuesStarted: false,
      valuesSubmitted: false,
    },
    discoveryJourneys: [
      discoveryJourney({
        introRequestId: "older",
        matchingStartStatus: "ready_for_matching",
        matchingSessionStatus: "awaiting_inputs",
        requestedByUserId: "founder-a",
        updatedAt: "2026-08-27T12:00:00.000Z",
      }),
      discoveryJourney({
        introRequestId: "newer",
        matchingStartStatus: "ready_for_matching",
        matchingSessionStatus: "awaiting_inputs",
        requestedByUserId: "founder-a",
      }),
    ],
  }));
  assert.deepEqual(ownMissing.map((task) => [task.id, task.kind, task.discoveryStage]), [
    ["discovery-journey:own-inputs", "CONTINUE_PERSONAL", "own_inputs_missing"],
  ]);
  assert.equal(ownMissing[0]?.href, "/me/base");

  const onlyPartnerMissing = buildFounderDashboardTasks(signals({
    discoveryJourneys: [
      discoveryJourney({
        matchingStartStatus: "ready_for_matching",
        matchingSessionStatus: "awaiting_inputs",
        ownBaseInputPresent: true,
        partnerBaseInputPresent: false,
      }),
    ],
  }));
  assert.equal(onlyPartnerMissing.length, 0);
});

test("Discovery Alignment-ready tasks end when the report exists", () => {
  const ready = buildFounderDashboardTasks(signals({
    discoveryJourneys: [
      discoveryJourney({
        matchingStartStatus: "ready_for_matching",
        matchingSessionStatus: "ready_for_report",
        ownBaseInputPresent: true,
        partnerBaseInputPresent: true,
      }),
    ],
  }));
  assert.deepEqual(ready.map((task) => [task.kind, task.discoveryStage]), [
    ["CONTINUE_SHARED", "alignment_ready"],
  ]);
  assert.equal(ready[0]?.href, "/discovery/intros/intro-ab/matching");

  const reportReady = buildFounderDashboardTasks(signals({
    discoveryJourneys: [
      discoveryJourney({
        matchingStartStatus: "ready_for_matching",
        matchingSessionStatus: "report_ready",
        ownBaseInputPresent: true,
        partnerBaseInputPresent: true,
        reportReady: true,
      }),
    ],
  }));
  assert.equal(reportReady.length, 0);
});

test("Discovery tasks omit waiting, processing, canceled and duplicate states", () => {
  const tasks = buildFounderDashboardTasks(signals({
    discoveryIntros: [
      { id: "same", recipientUserId: "founder-a", status: "pending", updatedAt: NOW },
      { id: "outgoing", recipientUserId: "founder-b", status: "pending", updatedAt: NOW },
      { id: "declined", recipientUserId: "founder-a", status: "declined", updatedAt: NOW },
      { id: "canceled", recipientUserId: "founder-a", status: "canceled", updatedAt: NOW },
    ],
    discoveryJourneys: [
      discoveryJourney({ introRequestId: "same" }),
      discoveryJourney({
        introRequestId: "requester-waits",
        requestedByUserId: "founder-a",
      }),
      discoveryJourney({
        introRequestId: "processing",
        matchingStartStatus: "ready_for_matching",
        matchingSessionStatus: null,
      }),
    ],
  }));
  assert.deepEqual(tasks.map((task) => task.id), ["discovery-journey:same"]);
});

test("Discovery task payloads contain no answers, scores, preferences or partner progress", () => {
  const tasks = buildFounderDashboardTasks(signals({
    discoveryJourneys: [discoveryJourney()],
  }));
  const serialized = JSON.stringify(tasks);
  assert.doesNotMatch(serialized, /answer|score|dimension|preference|progress|assessment/i);
  assert.deepEqual(Object.keys(tasks[0]!).sort(), [
    "contextLabel",
    "createdAt",
    "discoveryStage",
    "href",
    "id",
    "itemKey",
    "kind",
    "personLabel",
    "type",
  ]);
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
      { relationshipId: "relationship-ab", updatedAt: NOW, completed: false },
      { relationshipId: "relationship-ac", updatedAt: NOW, completed: false },
      { relationshipId: "relationship-bc", updatedAt: NOW, completed: false },
    ],
  }));
  assert.deepEqual(tasks.map((task) => task.id).sort(), [
    "commitment-lab:relationship-ab",
    "commitment-lab:relationship-ac",
  ]);
});

test("completed Commitment Labs remain outside current work", () => {
  const tasks = buildFounderDashboardTasks(signals({
    relationships: [relationship()],
    commitmentLabs: [
      { relationshipId: "relationship-ab", updatedAt: NOW, completed: true },
    ],
  }));
  assert.equal(tasks.some((task) => task.type === "commitment_lab_continue"), false);
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
  assert.match(dataSource, /is_commitment_lab_complete/);
  assert.match(dataSource, /founder_team_setup_items[\s\S]*pending_revision_id/);
  assert.match(dataSource, /collaboration_experience_rounds[\s\S]*\.eq\("experience_key", "read_my_mind"\)/);
  assert.match(
    dataSource,
    /discovery_matching_starts[\s\S]*requested_by_user_id[\s\S]*updated_at/
  );
  assert.match(
    dataSource,
    /matching_session_inputs[\s\S]*matching_session_id, user_id, module/
  );
  assert.match(dataSource, /matching_report_runs[\s\S]*matching_session_id/);
  assert.doesNotMatch(
    dataSource,
    /matching_report_runs[\s\S]*\.select\([^)]*(payload|report_content)/
  );
  assert.doesNotMatch(dataSource, /resend|sendEmail|notification_claim/i);
});

test("Discovery journey task copy is parallel, actionable and non-evaluative", () => {
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  type DiscoveryTaskMessages = {
    tasks: {
      items: Record<
        string,
        { title: string; text: string; textWithName?: string; action: string }
      >;
    };
  };
  const de = JSON.parse(
    readFileSync("messages/de/dashboard.json", "utf8")
  ) as DiscoveryTaskMessages;
  const en = JSON.parse(
    readFileSync("messages/en/dashboard.json", "utf8")
  ) as DiscoveryTaskMessages;
  const keys = [
    "discoveryIntro",
    "discoveryJointCheck",
    "discoveryOwnInputs",
    "discoveryAlignmentReady",
  ];
  for (const key of keys) {
    assert.ok(de.tasks.items[key]?.title);
    assert.ok(de.tasks.items[key]?.text);
    assert.ok(de.tasks.items[key]?.action);
    assert.ok(en.tasks.items[key]?.title);
    assert.ok(en.tasks.items[key]?.text);
    assert.ok(en.tasks.items[key]?.action);
  }
  assert.match(dashboard, /discoveryStage === "joint_check_consent"/);
  assert.match(dashboard, /discoveryStage === "own_inputs_missing"/);
  assert.match(dashboard, /discoveryStage === "alignment_ready"/);
  assert.doesNotMatch(
    JSON.stringify({
      de: keys.map((key) => de.tasks.items[key]),
      en: keys.map((key) => en.tasks.items[key]),
    }),
    /compatib|kompatib|match score|perfect match|success probability|score|%/i
  );
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
