import { createHash } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type ResearchModule = "base" | "values";
type ResearchTeamContext = "pre_founder" | "existing_team";
type ResearchQuestionType = "likert" | "scenario" | "forced_choice" | "unknown";

type ServerResearchTrackPayload = {
  eventName: string;
  userId: string;
  instrumentVersion?: string | null;
  invitationId?: string | null;
  assessmentId?: string | null;
  flowId?: string | null;
  module?: ResearchModule | null;
  questionId?: string | null;
  questionIndex?: number | null;
  durationMs?: number | null;
  elapsedMs?: number | null;
  pauseMs?: number | null;
  answerChanged?: boolean | null;
  completionRatio?: number | null;
  pagePath?: string | null;
  teamContext?: ResearchTeamContext | null;
  questionType?: ResearchQuestionType | null;
  dimension?: string | null;
  properties?: Record<string, unknown>;
  clientOccurredAt?: string | null;
  eventVersion?: number;
};

function asTrimmedString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function asInteger(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const integer = Math.trunc(parsed);
  if (integer < min || integer > max) return null;
  return integer;
}

function asNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

function asBooleanOrNull(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function asIsoTimestampOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function normalizeProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const next = { ...(value as Record<string, unknown>) };
  delete next.deviceClass;
  delete next.appVersion;
  delete next.assessmentId;
  delete next.teamContext;
  delete next.questionType;
  delete next.dimension;
  delete next.instrumentVersion;
  return next;
}

function hashForResearch(raw: string) {
  const normalized = raw.trim().toLowerCase();
  const salt = process.env.RESEARCH_HASH_SALT?.trim() ?? "";
  const source = salt ? `${salt}:${normalized}` : normalized;
  return createHash("sha256").update(source).digest("hex");
}

function createPrivilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function trackServerResearchEvent(payload: ServerResearchTrackPayload) {
  const eventName = asTrimmedString(payload.eventName, 120);
  const userId = asTrimmedString(payload.userId, 128);
  if (!eventName || !userId || !/^[a-z0-9_:. -]+$/i.test(eventName)) {
    return;
  }

  const supabase = createPrivilegedClient();
  if (!supabase) {
    return;
  }

  const invitationId = asTrimmedString(payload.invitationId, 128);
  const assessmentId = asTrimmedString(payload.assessmentId, 128);
  const flowId = asTrimmedString(payload.flowId, 128);
  const instrumentVersion =
    asTrimmedString(payload.instrumentVersion, 64) ??
    asTrimmedString((payload.properties as Record<string, unknown> | undefined)?.instrumentVersion, 64);
  const questionId = asTrimmedString(payload.questionId, 128);
  const pagePath = asTrimmedString(payload.pagePath, 500);
  const dimension = asTrimmedString(payload.dimension, 160);
  const teamContext =
    payload.teamContext === "existing_team" || payload.teamContext === "pre_founder"
      ? payload.teamContext
      : null;
  const questionType =
    payload.questionType === "likert" ||
    payload.questionType === "scenario" ||
    payload.questionType === "forced_choice" ||
    payload.questionType === "unknown"
      ? payload.questionType
      : null;
  const properties = normalizeProperties(payload.properties);

  await supabase.from("research_events").insert({
    event_name: eventName,
    event_version: asInteger(payload.eventVersion, 1, 1000) ?? 1,
    subject_hash: hashForResearch(userId),
    invitation_hash: invitationId ? hashForResearch(invitationId) : null,
    assessment_hash: assessmentId ? hashForResearch(assessmentId) : null,
    flow_hash: flowId ? hashForResearch(flowId) : null,
    module: payload.module === "base" || payload.module === "values" ? payload.module : null,
    instrument_version: instrumentVersion,
    question_id: questionId,
    question_index: asInteger(payload.questionIndex, 1, 5000),
    duration_ms: asInteger(payload.durationMs, 0, 3_600_000),
    elapsed_ms: asInteger(payload.elapsedMs, 0, 14_400_000),
    pause_ms: asInteger(payload.pauseMs, 0, 14_400_000),
    answer_changed: asBooleanOrNull(payload.answerChanged),
    completion_ratio: asNumber(payload.completionRatio, 0, 1),
    client_occurred_at: asIsoTimestampOrNull(payload.clientOccurredAt),
    page_path: pagePath,
    team_context: teamContext,
    question_type: questionType,
    dimension,
    properties,
  });
}
