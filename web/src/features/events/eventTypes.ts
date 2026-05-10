import type { DimensionId } from "@/features/scoring/founderCompatibilityRegistry";

export type EventStatus = "draft" | "live" | "closed";
export type EventQuestionKind = "core" | "forced";
export type EventAnswerValue = 0 | 25 | 50 | 75 | 100;

export type EventTensionKey =
  | "exit_horizon"
  | "sync_vs_autonomy"
  | "speed_vs_assurance"
  | "risk_vs_stability"
  | "roles_vs_shared";

type EventQuestionBase = {
  key: string;
  kind: EventQuestionKind;
  prompt: string;
  leftLabel: string;
  rightLabel: string;
  helperText?: string;
  compareWeight?: number;
  tensionWeight?: number;
};

export type EventQuestion =
  | (EventQuestionBase & {
      kind: "core";
      dimensionId: DimensionId;
    })
  | (EventQuestionBase & {
      kind: "forced";
      tensionKey: EventTensionKey;
    });

export type EventParticipant = {
  id: string;
  eventId: string;
  displayName: string;
  email: string;
  participantToken: string;
  consentCompare: boolean;
  consentVisibility: boolean;
  assessmentCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventRecord = {
  id: string;
  slug: string;
  name: string;
  status: EventStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

export type EventAnswer = {
  questionKey: string;
  answerType: EventQuestionKind;
  answerValue: EventAnswerValue;
  createdAt: string;
  updatedAt: string;
};

export type EventProfileScaleKey =
  | "vision_ambition"
  | "tempo"
  | "risk"
  | "structure_roles"
  | "sync"
  | "conflict_decision";

export type EventProfileScale = {
  key: EventProfileScaleKey;
  label: string;
  score: number;
  band: "low" | "balanced" | "high";
  bandLabel: string;
};

export type EventProfile = {
  participantId: string;
  displayName: string;
  completedAt: string | null;
  dimensionScores: Partial<Record<DimensionId, number | null>>;
  scales: EventProfileScale[];
};

export type EventTensionSignal = {
  tensionKey: EventTensionKey;
  label: string;
  level: "low" | "medium" | "high";
  scoreA: EventAnswerValue;
  scoreB: EventAnswerValue;
  distance: number;
  conversationPrompt: string;
};

export type EventComparedScale = {
  key: EventProfileScaleKey;
  label: string;
  scoreA: number;
  scoreB: number;
  distance: number;
  relationLabel: string;
};

export type EventCompareResult = {
  participantAName: string;
  participantBName: string;
  commonGround: EventComparedScale[];
  differences: EventComparedScale[];
  tensionSignals: EventTensionSignal[];
  conversationPrompts: string[];
};

export type EventParticipantProfileResult =
  | {
      ok: true;
      event: EventRecord;
      participant: EventParticipant;
      answers: EventAnswer[];
      profile: EventProfile;
      completed: boolean;
      missingQuestionKeys: string[];
    }
  | {
      ok: false;
      reason: "event_not_found" | "participant_not_found" | "participant_event_mismatch";
    };
