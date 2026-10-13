/**
 * Matching Engine v0.1 – Versionen und eingefrorene Konstanten.
 *
 * QUELLE: docs/research/matching-engine-v0.1-spec.md (+ .json, Hash in .sha256).
 * Jede Zahl hier steht so in der Spec. Wer eine davon ändert, erzeugt eine neue
 * matching_version – der Test `version.test.ts` hält die Werte gegen die Spec-JSON fest.
 *
 * NICHT-PRODUKTIVER PROTOTYP: Kein Produktpfad ruft diese Engine auf.
 */

export const MATCHING_VERSION = "matching-v0.1";
export const NORMALIZATION_VERSION = "matching-normalization-v0.1";

/** FIND (Spec §7–§9, §14): Gate v03, PH1-Richtungsrelevanz, Gegenseitigkeit 0,6/0,4. */
export const FIND_CONSTANTS = Object.freeze({
  coverage: Object.freeze({
    ownLevelGe3: 1.0,
    contributeLevelGe3: 0.6,
    ownLevelLt3OrUnknown: 0.4,
    contributeUnclearOrEmptyLevelGe3: 0.3,
    otherwise: 0.0,
    sameFamilyFactor: 0.5,
    depthLevel: 3,
  }),
  familyExcluded: Object.freeze(["working_style", "other"] as const),
  handoverWishes: Object.freeze(["prefer_other", "prefer_external"] as const),
  searchIntentDistance: Object.freeze([1.0, 0.6, 0.1]),
  startHorizonDistance: Object.freeze([1.0, 1.0, 0.6, 0.2]),
  goalGroupDistance: Object.freeze([1.0, 0.6, 0.1]),
  stage: Object.freeze({ bothSame: 0.5, oneWithIdea: 1.0, otherwise: 0.8 }),
  modulatorUnknown: 0.5,
  directionalBase: 0.5,
  directionalModWeight: 0.5,
  mutualityMinWeight: 0.6,
  mutualityMeanWeight: 0.4,
});

export const SEARCH_INTENT_ORDER = Object.freeze(["ready_now", "actively_exploring", "open_later"] as const);
export const START_HORIZON_ORDER = Object.freeze(["now", "next_3_months", "next_6_months", "later_or_flexible"] as const);
export const GOAL_GROUP: Readonly<Record<string, number>> = Object.freeze({
  explore: 0,
  side_project: 0,
  profitable_business: 1,
  venture_scale: 2,
  exit_oriented: 2,
});
export const STAGES_WITH_IDEA = Object.freeze(["idea_validating", "already_building"] as const);

/** CONNECT (Spec §10–§11): C1 topic-required. */
export const CONNECT_CONSTANTS = Object.freeze({
  weights: Object.freeze({ topic: 0.55, text: 0.2, industry: 0.15, category: 0.1 }),
  expertiseOnlyTopicValue: 0.7,
  noTopicCap: 0.1,
  noTopicTextMin: 0.1,
  textOverlapReasonMin: 0.1,
});

/** Text-Schicht (Spec §11): Mindestlänge 3, gemeinsamer Wortstamm ≥ 6. */
export const TEXT_MIN_LEN = 3;
export const STEM_MIN = 6;
