"use client";

export type ResearchTrackPayload = {
  eventName: string;
  eventVersion?: number;
  instrumentVersion?: string | null;
  invitationId?: string | null;
  assessmentId?: string | null;
  flowId?: string | null;
  module?: "base" | "values" | null;
  questionId?: string | null;
  questionIndex?: number | null;
  teamContext?: "pre_founder" | "existing_team" | null;
  questionType?: "likert" | "scenario" | "forced_choice" | "unknown" | null;
  dimension?: string | null;
  durationMs?: number | null;
  elapsedMs?: number | null;
  pauseMs?: number | null;
  answerChanged?: boolean | null;
  completionRatio?: number | null;
  pagePath?: string | null;
  choiceValue?: string | number | null;
  properties?: Record<string, unknown>;
  clientOccurredAt?: string;
};

const RESEARCH_FLOW_PREFIX = "research_flow_v1:";
const TRACK_ENDPOINT = "/api/research/track";
export type ResearchConsentState = "undecided" | "accepted" | "declined";
let researchConsentState: ResearchConsentState = "undecided";

export function configureResearchConsentState(state: ResearchConsentState) {
  researchConsentState = state;
  if (state !== "accepted" && typeof window !== "undefined") {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(RESEARCH_FLOW_PREFIX)) window.sessionStorage.removeItem(key);
    }
  }
}

function getDeviceClass() {
  if (typeof window === "undefined") return "unknown";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function buildResearchClientProperties(extra?: Record<string, unknown>) {
  const totalQuestions = Number(extra?.totalQuestions);
  return {
    deviceClass: getDeviceClass(),
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
    ...(Number.isInteger(totalQuestions) && totalQuestions > 0 && totalQuestions <= 5000
      ? { totalQuestions }
      : {}),
  };
}

function getOrCreateFlowId(prefix: string, flowScope: string) {
  if (typeof window === "undefined") return null;
  const storageKey = `${prefix}${flowScope}`;
  const existing = window.sessionStorage.getItem(storageKey)?.trim();
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, created);
  return created;
}

export function getOrCreateResearchFlowId(flowScope: string) {
  return researchConsentState === "accepted" ? getOrCreateFlowId(RESEARCH_FLOW_PREFIX, flowScope) : null;
}

function postResearchEvent(body: Record<string, unknown>) {
  const serialized = JSON.stringify(body);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([serialized], { type: "application/json" });
    const sent = navigator.sendBeacon(TRACK_ENDPOINT, blob);
    if (sent) return;
  }

  void fetch(TRACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: serialized,
    keepalive: true,
    cache: "no-store",
  });
}

export function trackResearchEvent(payload: ResearchTrackPayload) {
  if (typeof window === "undefined") return;
  const consentedPayload = { ...payload };
  if (researchConsentState !== "accepted") {
    delete consentedPayload.flowId;
    delete consentedPayload.choiceValue;
    delete consentedPayload.dimension;
    delete consentedPayload.invitationId;
    delete consentedPayload.assessmentId;
    delete consentedPayload.teamContext;
    delete consentedPayload.questionType;
  }
  postResearchEvent({
    ...consentedPayload,
    clientOccurredAt: payload.clientOccurredAt ?? new Date().toISOString(),
    pagePath: payload.pagePath ?? window.location.pathname,
  });
}
