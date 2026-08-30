import "server-only";

import { createHash } from "crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getFounderCompatibilityBaseItem,
  isValidFounderCompatibilityBaseChoiceValue,
} from "@/features/questionnaire/founderCompatibilityBaseQuestionnaire";

type ResearchModule = "base" | "values";
type ResearchTeamContext = "pre_founder" | "existing_team";
type ResearchQuestionType = "likert" | "scenario" | "forced_choice" | "unknown";

export type ServerResearchTrackPayload = {
  eventName: unknown;
  userId: string;
  instrumentVersion?: unknown;
  invitationId?: unknown;
  assessmentId?: unknown;
  flowId?: unknown;
  module?: unknown;
  questionId?: unknown;
  questionIndex?: unknown;
  durationMs?: unknown;
  elapsedMs?: unknown;
  pauseMs?: unknown;
  answerChanged?: unknown;
  completionRatio?: unknown;
  pagePath?: unknown;
  teamContext?: unknown;
  questionType?: unknown;
  dimension?: unknown;
  choiceValue?: unknown;
  properties?: unknown;
  clientOccurredAt?: unknown;
  eventVersion?: unknown;
};

export type ResearchTrackingResult = {
  productAnalyticsStored: boolean;
  researchStored: boolean;
  reason?: "invalid_event" | "missing_server_client" | "product_insert_failed" | "research_insert_failed";
};

type PrivilegedClient = SupabaseClient;

function asTrimmedString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function asSafeIdentifier(value: unknown, maxLength: number) {
  const normalized = asTrimmedString(value, maxLength);
  return normalized && /^[a-z0-9_.:-]+$/i.test(normalized) ? normalized : null;
}

function asInteger(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const integer = Math.trunc(parsed);
  return integer >= min && integer <= max ? integer : null;
}

function asNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function asBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function asIsoTimestampOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function asPagePath(value: unknown) {
  const path = asTrimmedString(value, 300);
  return path?.startsWith("/") ? path : null;
}

function asDeviceClass(value: unknown) {
  return value === "mobile" || value === "desktop" || value === "tablet" || value === "unknown"
    ? value
    : null;
}

function asRandomFlowId(value: unknown) {
  const flowId = asTrimmedString(value, 64);
  return flowId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(flowId)
    ? flowId
    : null;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashKnownIdentifier(value: string) {
  const salt = process.env.RESEARCH_HASH_SALT?.trim();
  return salt ? sha256(`${salt}:${value.trim().toLowerCase()}`) : null;
}

function createPrivilegedClient(): PrivilegedClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function normalizeProductAnalyticsPayload(payload: ServerResearchTrackPayload) {
  const eventName = asTrimmedString(payload.eventName, 120)?.toLowerCase() ?? null;
  if (!eventName || !/^[a-z0-9_:. -]+$/.test(eventName)) return null;
  const properties = payload.properties && typeof payload.properties === "object" && !Array.isArray(payload.properties)
    ? payload.properties as Record<string, unknown>
    : {};
  const moduleValue: ResearchModule | null = payload.module === "base" || payload.module === "values"
    ? payload.module
    : null;

  return {
    event_name: eventName,
    event_version: asInteger(payload.eventVersion, 1, 1000) ?? 1,
    module: moduleValue,
    instrument_version: asSafeIdentifier(payload.instrumentVersion, 64),
    question_id: asSafeIdentifier(payload.questionId, 128),
    question_index: asInteger(payload.questionIndex, 1, 5000),
    duration_ms: asInteger(payload.durationMs, 0, 3_600_000),
    elapsed_ms: asInteger(payload.elapsedMs, 0, 14_400_000),
    pause_ms: asInteger(payload.pauseMs, 0, 14_400_000),
    answer_changed: asBooleanOrNull(payload.answerChanged),
    completion_ratio: asNumber(payload.completionRatio, 0, 1),
    client_occurred_at: asIsoTimestampOrNull(payload.clientOccurredAt),
    page_path: asPagePath(payload.pagePath),
    device_class: asDeviceClass(properties.deviceClass),
    app_version: asSafeIdentifier(properties.appVersion, 80),
  };
}

async function resolveOwnedAssessment(
  client: PrivilegedClient,
  assessmentId: string | null,
  userId: string,
  moduleValue: ResearchModule | null
) {
  if (!assessmentId) return null;
  const { data } = await client.from("assessments").select("id, user_id, module").eq("id", assessmentId).maybeSingle();
  if (!data || data.user_id !== userId || data.module !== moduleValue) return null;
  return data as { id: string; module: ResearchModule; user_id: string };
}

async function resolveInvitationHash(client: PrivilegedClient, invitationId: string | null, userId: string) {
  if (!invitationId) return null;
  const { data } = await client
    .from("invitations")
    .select("id, inviter_user_id, invitee_user_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!data || ![data.inviter_user_id, data.invitee_user_id].includes(userId)) return null;
  return hashKnownIdentifier(data.id);
}

async function resolveResearchItem(
  client: PrivilegedClient,
  moduleValue: ResearchModule | null,
  instrumentVersion: string | null,
  questionId: string | null,
  choiceValue: string | null
) {
  if (!moduleValue || !instrumentVersion || !questionId) return null;
  if (moduleValue === "base") {
    const item = getFounderCompatibilityBaseItem(questionId);
    if (!item || instrumentVersion !== "founder_base_v2") return null;
    if (choiceValue != null && !isValidFounderCompatibilityBaseChoiceValue(questionId, choiceValue)) return null;
    return { dimension: item.dimensionId, questionType: item.type as ResearchQuestionType };
  }

  if (instrumentVersion !== "values_v2" || !/^wv2_\d+$/.test(questionId)) return null;
  const { data: question } = await client
    .from("questions")
    .select("id, dimension, type, category")
    .eq("id", questionId)
    .eq("category", "values")
    .maybeSingle();
  if (!question) return null;
  if (choiceValue != null) {
    const { data: choice } = await client
      .from("choices")
      .select("value")
      .eq("question_id", questionId)
      .eq("value", choiceValue)
      .maybeSingle();
    if (!choice) return null;
  }
  const questionType: ResearchQuestionType =
    question.type === "likert" || question.type === "scenario" || question.type === "forced_choice"
      ? question.type
      : "unknown";
  return { dimension: asSafeIdentifier(question.dimension, 160), questionType };
}

export async function trackServerResearchEvent(payload: ServerResearchTrackPayload): Promise<ResearchTrackingResult> {
  const productPayload = normalizeProductAnalyticsPayload(payload);
  const userId = asTrimmedString(payload.userId, 128);
  if (!productPayload || !userId) {
    return { productAnalyticsStored: false, researchStored: false, reason: "invalid_event" };
  }

  const client = createPrivilegedClient();
  if (!client) {
    return { productAnalyticsStored: false, researchStored: false, reason: "missing_server_client" };
  }

  const { error: productError } = await client.from("product_analytics_events").insert(productPayload);
  if (productError) {
    return { productAnalyticsStored: false, researchStored: false, reason: "product_insert_failed" };
  }

  const { data: preference } = await client
    .from("research_consent_preferences")
    .select("state, research_subject_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (preference?.state !== "accepted" || !preference.research_subject_id) {
    return { productAnalyticsStored: true, researchStored: false };
  }

  const moduleValue = productPayload.module as ResearchModule | null;
  const instrumentVersion = productPayload.instrument_version;
  const questionId = productPayload.question_id;
  const rawChoice = typeof payload.choiceValue === "string" || typeof payload.choiceValue === "number"
    ? String(payload.choiceValue).trim()
    : null;
  const choiceValue = rawChoice && rawChoice.length <= 16 ? rawChoice : null;
  if (payload.choiceValue != null && !choiceValue) {
    return { productAnalyticsStored: true, researchStored: false };
  }

  const item = questionId
    ? await resolveResearchItem(client, moduleValue, instrumentVersion, questionId, choiceValue)
    : null;
  if (choiceValue != null && (!item || productPayload.event_name !== "answer_saved")) {
    return { productAnalyticsStored: true, researchStored: false };
  }

  const assessmentId = asSafeIdentifier(payload.assessmentId, 128);
  const ownedAssessment = await resolveOwnedAssessment(client, assessmentId, userId, moduleValue);
  if (choiceValue != null && !ownedAssessment) {
    return { productAnalyticsStored: true, researchStored: false };
  }

  const invitationId = asSafeIdentifier(payload.invitationId, 128);
  const invitationHash = await resolveInvitationHash(client, invitationId, userId);
  const researchFlowId = asRandomFlowId(payload.flowId);
  const teamContext: ResearchTeamContext | null =
    payload.teamContext === "pre_founder" || payload.teamContext === "existing_team" ? payload.teamContext : null;

  const { error: researchError } = await client.from("research_events").insert({
    event_name: productPayload.event_name,
    event_version: productPayload.event_version,
    subject_hash: sha256(String(preference.research_subject_id)),
    invitation_hash: invitationHash,
    assessment_hash: ownedAssessment ? hashKnownIdentifier(ownedAssessment.id) : null,
    flow_hash: researchFlowId ? sha256(researchFlowId) : null,
    module: moduleValue,
    instrument_version: instrumentVersion,
    question_id: questionId,
    question_index: productPayload.question_index,
    duration_ms: productPayload.duration_ms,
    elapsed_ms: productPayload.elapsed_ms,
    pause_ms: productPayload.pause_ms,
    answer_changed: productPayload.answer_changed,
    completion_ratio: productPayload.completion_ratio,
    client_occurred_at: productPayload.client_occurred_at,
    page_path: productPayload.page_path,
    team_context: invitationHash ? teamContext : null,
    question_type: item?.questionType ?? null,
    dimension: item?.dimension ?? null,
    device_class: productPayload.device_class,
    app_version: productPayload.app_version,
    properties: choiceValue != null ? { choiceValue } : {},
    research_consent_version: "research_consent_v1",
  });

  return researchError
    ? { productAnalyticsStored: true, researchStored: false, reason: "research_insert_failed" }
    : { productAnalyticsStored: true, researchStored: true };
}
