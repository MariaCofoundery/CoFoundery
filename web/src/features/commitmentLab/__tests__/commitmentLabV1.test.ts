import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCommitmentLabSnapshot,
  COMMITMENT_LAB_CONCEPTS,
  COMMITMENT_LAB_DISCUSSION_MARKERS,
  COMMITMENT_LAB_SCENARIOS,
  emptyScenarioAnswers,
  groupCommitmentLabDiscussion,
  getCommitmentLabMarkerAnswer,
  isCommitmentLabFounderReady,
  normalizeCommitmentLabDiscussionMarkers,
  normalizeScenarioAnswers,
  type CommitmentLabFounderEntry,
} from "@/features/commitmentLab/commitmentLabModel";

const completeEntry = (): CommitmentLabFounderEntry => ({
  relationshipId: "relationship-1",
  userId: "founder-a",
  currentHours: 24,
  difficultWeekHours: 8,
  obligationCategories: ["employment"],
  changeNote: "A project milestone may change my availability.",
  realityFit: "partly",
  commitmentMeaning: "I communicate changes early and renegotiate openly.",
  priorityReflection: "The venture is one of my two current priorities.",
  reliabilityReflection: "I keep ownership visible during slower phases.",
  transparencyReflection: "I raise likely changes as soon as I notice them.",
  responsibilityReflection: "I hand over accepted tasks deliberately.",
  renegotiationReflection: "Changes are legitimate when discussed together.",
  scenarioAnswers: Object.fromEntries(
    COMMITMENT_LAB_SCENARIOS.map((key) => [
      key,
      { action: `Action for ${key}`, expectation: `Expectation for ${key}` },
    ])
  ) as CommitmentLabFounderEntry["scenarioAnswers"],
  difficultSituation: "A prolonged silent reduction in contribution.",
  desiredAlternative: "An early and open renegotiation.",
  discussionMarkers: ["commitment_meaning", "difficulty_wish"],
  updatedAt: "2026-08-25T09:00:00.000Z",
});

test("V1 represents six product concepts without a score", () => {
  assert.deepEqual(COMMITMENT_LAB_CONCEPTS, [
    "capacity",
    "priority",
    "reliability",
    "transparency",
    "responsibility",
    "renegotiation",
  ]);
  assert.equal(isCommitmentLabFounderReady(completeEntry()), true);
  assert.equal(isCommitmentLabFounderReady({ ...completeEntry(), currentHours: null }), false);
  assert.equal(isCommitmentLabFounderReady({
    ...completeEntry(),
    scenarioAnswers: emptyScenarioAnswers(),
  }), false);
});

test("scenario input is limited to the four V1 situations", () => {
  const normalized = normalizeScenarioAnswers({
    motivation_progress: { action: "Pause", expectation: "Talk" },
    fabricated_score: { action: "High risk", expectation: "Exclude" },
  });
  assert.equal(Object.keys(normalized).length, 4);
  assert.equal(normalized.motivation_progress.action, "Pause");
  assert.equal("fabricated_score" in normalized, false);
});

test("discussion grouping keeps a single accessible reply level", () => {
  const grouped = groupCommitmentLabDiscussion([
    { id: "root", authorUserId: "founder-a", parentEntryId: null, body: "Root", createdAt: "1" },
    { id: "reply", authorUserId: "founder-b", parentEntryId: "root", body: "Reply", createdAt: "2" },
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].replies[0].id, "reply");
});

test("V1.1 markers are stable, founder-owned keys capped at three in the read model", () => {
  assert.equal(COMMITMENT_LAB_DISCUSSION_MARKERS.length, 11);
  assert.deepEqual(normalizeCommitmentLabDiscussionMarkers([
    "commitment_meaning",
    "scenario:attractive_alternative",
    "difficulty_wish",
    "aspect:priority",
    "fabricated:risk",
  ]), ["commitment_meaning", "scenario:attractive_alternative", "difficulty_wish"]);
  assert.equal(
    getCommitmentLabMarkerAnswer(completeEntry(), "difficulty_wish"),
    "A prolonged silent reduction in contribution.\n\nAn early and open renegotiation."
  );
});

test("the snapshot is a deterministic projection of original founder input", () => {
  const entry = completeEntry();
  const snapshot = buildCommitmentLabSnapshot(entry);
  assert.deepEqual(snapshot, {
    currentHours: 24,
    difficultWeekHours: 8,
    obligationCategories: ["employment"],
    changeNote: "A project milestone may change my availability.",
    commitmentMeaning: entry.commitmentMeaning,
    difficultSituation: entry.difficultSituation,
    desiredAlternative: entry.desiredAlternative,
    discussionMarkers: entry.discussionMarkers,
  });
  const updated = buildCommitmentLabSnapshot({ ...entry, currentHours: 18 });
  assert.equal(updated.currentHours, 18);
  assert.doesNotMatch(JSON.stringify(snapshot), /score|risk level|strong commitment/i);
});

test("DE and EN copy describe reflection, four scenarios, and no evaluation", () => {
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8")).commitmentLab;
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8")).commitmentLab;
  for (const messages of [de, en]) {
    assert.equal(Object.keys(messages.scenarios).filter((key) => !["title", "help", "action", "expectation"].includes(key)).length, 4);
    assert.equal(Object.keys(messages.discussion.prompts).length, 5);
    assert.equal(Object.keys(messages.markers.labels).length, 11);
    assert.match(messages.reflection.help, /keine bestätigte Vereinbarung|not yet a confirmed agreement/i);
    assert.match(messages.snapshot.ownHelp, /keine Bewertung|not an assessment/i);
    const serialized = JSON.stringify(messages);
    assert.doesNotMatch(serialized, /Grit Score|Exit Prediction|Commitment-Risiko|compatibility percentage|\d+\s*%/i);
  }
});

test("Commitment Lab uses approachable voice-input copy without changing other speech flows", () => {
  const deTeams = JSON.parse(readFileSync("messages/de/teams.json", "utf8"));
  const enTeams = JSON.parse(readFileSync("messages/en/teams.json", "utf8"));

  assert.deepEqual(deTeams.commitmentLab.speech, {
    start: "Einsprechen",
    stop: "Aufnahme stoppen",
    listening: "Aufnahme läuft …",
    unavailable: "Einsprechen ist in diesem Browser gerade nicht verfügbar.",
  });
  assert.deepEqual(enTeams.commitmentLab.speech, {
    start: "Speak",
    stop: "Stop recording",
    listening: "Recording…",
    unavailable: "Voice input is not available in this browser right now.",
  });
  assert.doesNotMatch(JSON.stringify(deTeams.commitmentLab.speech), /Diktat/i);
  assert.doesNotMatch(JSON.stringify(enTeams.commitmentLab.speech), /dictation/i);
});

test("the route is standalone, pairwise, and does not expose advisor access", () => {
  const page = readFileSync(
    "src/app/(product)/teams/[teamId]/commitment-lab/[relationshipId]/page.tsx",
    "utf8"
  );
  const data = readFileSync("src/features/commitmentLab/commitmentLabData.ts", "utf8");
  assert.match(page, /commitment-lab/);
  assert.match(page, /FounderTeamNavigation/);
  assert.doesNotMatch(page, /FounderAlignmentWorkbookClient|workbookPayload/);
  assert.match(data, /alignment\.find\(\(entry\) => entry\.relationshipId === relationshipId\)/);
  assert.doesNotMatch(data, /relationship_advisors|advisor_user_id|service_role/);
  assert.match(data, /sharedDiscussionMarkers: bothFoundersReady/);
  assert.match(page, /lab\.sharedDiscussionMarkers\.length/);
  assert.match(page, /CommitmentLabSnapshotCard/);
});

test("V1.1 save is atomic and the marker UI blocks a fourth active selection", () => {
  const action = readFileSync("src/features/commitmentLab/commitmentLabActions.ts", "utf8");
  const inputs = readFileSync("src/features/commitmentLab/CommitmentLabInputs.tsx", "utf8");
  assert.match(action, /save_commitment_lab_founder_entry_v11/);
  assert.match(action, /p_difficult_situation/);
  assert.match(action, /p_desired_alternative/);
  assert.match(action, /p_discussion_markers/);
  assert.match(inputs, /current\.length < 3/);
  assert.match(inputs, /context\.markers\.size >= 3/);
  assert.match(inputs, /name="discussionMarkers"/);
});

test("handoff offers only explicit Setup targets and never confirms an agreement", () => {
  const action = readFileSync("src/features/commitmentLab/commitmentLabActions.ts", "utf8");
  assert.match(action, /time_commitment/);
  assert.match(action, /changing_commitment/);
  assert.match(action, /memberRows\.length !== 2/);
  assert.match(action, /working_note/);
  assert.match(action, /handoff_commitment_lab_reflection_if_empty/);
  assert.doesNotMatch(action, /propose_founder_team_setup_revision/);
  assert.doesNotMatch(action, /confirm_founder_team_setup_revision/);
  assert.doesNotMatch(action, /founder_team_setup_confirmations/);
});

test("homebase places Commitment Lab between Alignment and Founder Setup", () => {
  const page = readFileSync("src/app/(product)/teams/[teamId]/page.tsx", "utf8");
  const alignment = page.indexOf('id="team-alignment"');
  const lab = page.indexOf('id="commitment-lab-title"');
  const setup = page.indexOf('id="team-setup-title"');
  assert.ok(alignment >= 0 && lab > alignment && setup > lab);
  assert.match(page, /startedLabRelationships\.has\(entry\.relationshipId\)/);
  assert.match(page, /commitmentT\(started \? "continue" : "start"\)/);
});
