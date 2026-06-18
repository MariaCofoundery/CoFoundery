import assert from "node:assert/strict";
import test from "node:test";
import {
  appendDiscoveryAssessmentConversationPromptsToCandidates,
  mergeDiscoveryAssessmentConversationTopics,
  selectDiscoveryAssessmentConversationPrompts,
} from "@/features/discovery/discoveryAssessmentConversationPrompts";
import type { DiscoveryCandidate } from "@/features/discovery/discoveryTypes";
import type { DiscoveryAssessmentSignalAvailability } from "@/features/discovery/discoveryAssessmentSignalsCore";
import type { SelfRadarSeries } from "@/features/reporting/selfReportTypes";

const READY: DiscoveryAssessmentSignalAvailability = {
  ownerReady: true,
  candidateReady: true,
  bothReady: true,
};

const NOT_READY: DiscoveryAssessmentSignalAvailability = {
  ownerReady: true,
  candidateReady: false,
  bothReady: false,
};

const OWNER_SCORES: SelfRadarSeries = {
  Unternehmenslogik: 20,
  Entscheidungslogik: 35,
  "Arbeitsstruktur & Zusammenarbeit": 75,
  Commitment: 80,
  Risikoorientierung: 25,
  Konfliktstil: 70,
};

const CANDIDATE_SCORES: SelfRadarSeries = {
  Unternehmenslogik: 85,
  Entscheidungslogik: 70,
  "Arbeitsstruktur & Zusammenarbeit": 35,
  Commitment: 30,
  Risikoorientierung: 75,
  Konfliktstil: 25,
};

function createCandidate(id: string): DiscoveryCandidate {
  return {
    profile: {
      id,
      displayName: `Founder ${id}`,
      headline: "Baut ein klares Produkt",
      bio: "Kurzer Profiltext.",
      ownRoles: ["tech"],
      seekingRoles: ["product"],
      industries: ["SaaS"],
      locationLabel: "Berlin",
      remoteMode: "remote",
      availabilityHoursPerWeek: 25,
      commitmentLevel: "part_time",
      ventureStage: "idea_validating",
      ventureGoal: "venture_scale",
      publishedAt: "2026-06-18T10:00:00.000Z",
    },
    reasons: ["Ihr ergänzt euch bei den Rollen."],
    conversationTopics: [
      "Kläre früh, wie verbindlich ihr Zeit investieren wollt.",
      "Besprecht, wie ihr Rollen und Verantwortlichkeiten verteilen würdet.",
    ],
    score: id === "candidate-a" ? 20 : 10,
  };
}

test("does not create assessment conversation prompts when bilateral readiness is missing", () => {
  assert.deepEqual(
    selectDiscoveryAssessmentConversationPrompts({
      availability: NOT_READY,
      ownerScores: OWNER_SCORES,
      candidateScores: CANDIDATE_SCORES,
    }),
    []
  );
});

test("does not create assessment conversation prompts when scores are missing", () => {
  assert.deepEqual(
    selectDiscoveryAssessmentConversationPrompts({
      availability: READY,
      ownerScores: OWNER_SCORES,
      candidateScores: null,
    }),
    []
  );
});

test("keeps assessment conversation prompts bounded to two texts", () => {
  const prompts = selectDiscoveryAssessmentConversationPrompts({
    availability: READY,
    ownerScores: OWNER_SCORES,
    candidateScores: CANDIDATE_SCORES,
  });

  assert.ok(prompts.length > 0);
  assert.ok(prompts.length <= 2);
});

test("keeps assessment conversation prompts free of numbers, percentages and dimension keys", () => {
  const prompts = selectDiscoveryAssessmentConversationPrompts({
    availability: READY,
    ownerScores: OWNER_SCORES,
    candidateScores: CANDIDATE_SCORES,
  });
  const visibleText = prompts.join(" ");

  assert.equal(/\d|%/.test(visibleText), false);
  assert.equal(
    /Unternehmenslogik|Entscheidungslogik|Arbeitsstruktur|Commitment|Risikoorientierung|Konfliktstil/.test(
      visibleText
    ),
    false
  );
});

test("keeps assessment conversation prompts free of red-flag and diagnosis language", () => {
  const prompts = selectDiscoveryAssessmentConversationPrompts({
    availability: READY,
    ownerScores: OWNER_SCORES,
    candidateScores: CANDIDATE_SCORES,
  });
  const visibleText = prompts.join(" ");

  assert.equal(
    /inkompatibel|diagnose|persönlichkeitsprofil|red.?flag|risiko|risk|score|rohscore|bewertung/i.test(
      visibleText
    ),
    false
  );
});

test("merges assessment prompts without exposing more than two conversation topics", () => {
  assert.deepEqual(
    mergeDiscoveryAssessmentConversationTopics({
      existingTopics: [
        "Besprecht, wie ihr Rollen und Verantwortlichkeiten verteilen würdet.",
        "Kläre früh, wie viel Zeit ihr realistisch investieren wollt.",
      ],
      assessmentPrompts: [
        "Sprecht früh darüber, wie ihr Entscheidungen trefft.",
        "Kläre, wie viel Struktur ihr im Alltag braucht.",
      ],
    }),
    [
      "Besprecht, wie ihr Rollen und Verantwortlichkeiten verteilen würdet.",
      "Sprecht früh darüber, wie ihr Entscheidungen trefft.",
    ]
  );
});

test("adds assessment prompts after ranking without changing candidate order or scores", () => {
  const candidates = [createCandidate("candidate-a"), createCandidate("candidate-b")];
  const enriched = appendDiscoveryAssessmentConversationPromptsToCandidates({
    candidates,
    promptsByProfileId: new Map([
      ["candidate-b", ["Sprecht früh darüber, wie ihr Entscheidungen trefft."]],
    ]),
  });

  assert.deepEqual(
    enriched.map((candidate) => candidate.profile.id),
    ["candidate-a", "candidate-b"]
  );
  assert.deepEqual(
    enriched.map((candidate) => candidate.score),
    [20, 10]
  );
  assert.ok(
    enriched[1]?.conversationTopics.includes(
      "Sprecht früh darüber, wie ihr Entscheidungen trefft."
    )
  );
});
