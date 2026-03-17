import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TrackRequestBody = {
  eventName?: unknown;
  eventVersion?: unknown;
  invitationId?: unknown;
  assessmentId?: unknown;
  flowId?: unknown;
  module?: unknown;
  questionId?: unknown;
  questionIndex?: unknown;
  teamContext?: unknown;
  questionType?: unknown;
  dimension?: unknown;
  durationMs?: unknown;
  elapsedMs?: unknown;
  pauseMs?: unknown;
  answerChanged?: unknown;
  completionRatio?: unknown;
  pagePath?: unknown;
  choiceValue?: unknown;
  properties?: unknown;
  clientOccurredAt?: unknown;
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
  if (typeof value === "boolean") return value;
  return null;
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
  return next;
}

function hashForResearch(raw: string) {
  const normalized = raw.trim().toLowerCase();
  const salt = process.env.RESEARCH_HASH_SALT?.trim() ?? "";
  const source = salt ? `${salt}:${normalized}` : normalized;
  return createHash("sha256").update(source).digest("hex");
}

export async function POST(request: NextRequest) {
  let body: TrackRequestBody;
  try {
    body = (await request.json()) as TrackRequestBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const eventName = asTrimmedString(body.eventName, 120);
  if (!eventName || !/^[a-z0-9_:. -]+$/i.test(eventName)) {
    return NextResponse.json({ ok: false, reason: "invalid_event_name" }, { status: 400 });
  }

  const moduleValueRaw = asTrimmedString(body.module, 16);
  const moduleValue = moduleValueRaw === "base" || moduleValueRaw === "values" ? moduleValueRaw : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  }

  const invitationId = asTrimmedString(body.invitationId, 128);
  const assessmentId = asTrimmedString(body.assessmentId, 128);
  const flowId = asTrimmedString(body.flowId, 128);
  const questionId = asTrimmedString(body.questionId, 128);
  const pagePath = asTrimmedString(body.pagePath, 500);
  const dimension = asTrimmedString(body.dimension, 160);
  const appVersion =
    asTrimmedString((body.properties as Record<string, unknown> | undefined)?.appVersion, 80) ??
    asTrimmedString(process.env.NEXT_PUBLIC_APP_VERSION, 80);
  const questionTypeRaw = asTrimmedString(body.questionType, 32);
  const questionType =
    questionTypeRaw === "likert" ||
    questionTypeRaw === "scenario" ||
    questionTypeRaw === "forced_choice" ||
    questionTypeRaw === "unknown"
      ? questionTypeRaw
      : null;
  const teamContextRaw = asTrimmedString(body.teamContext, 32);
  const teamContext =
    teamContextRaw === "pre_founder" || teamContextRaw === "existing_team"
      ? teamContextRaw
      : null;
  const choiceValue =
    typeof body.choiceValue === "string" || typeof body.choiceValue === "number"
      ? body.choiceValue
      : null;
  const normalizedProperties = normalizeProperties(body.properties);

  const payload = {
    event_name: eventName,
    event_version: asInteger(body.eventVersion, 1, 1000) ?? 1,
    subject_hash: hashForResearch(user.id),
    invitation_hash: invitationId ? hashForResearch(invitationId) : null,
    assessment_hash: assessmentId ? hashForResearch(assessmentId) : null,
    flow_hash: flowId ? hashForResearch(flowId) : null,
    module: moduleValue,
    question_id: questionId,
    question_index: asInteger(body.questionIndex, 1, 5000),
    question_type: questionType,
    dimension,
    team_context: teamContext,
    duration_ms: asInteger(body.durationMs, 0, 3_600_000),
    elapsed_ms: asInteger(body.elapsedMs, 0, 14_400_000),
    pause_ms: asInteger(body.pauseMs, 0, 14_400_000),
    answer_changed: asBooleanOrNull(body.answerChanged),
    completion_ratio: asNumber(body.completionRatio, 0, 1),
    client_occurred_at: asIsoTimestampOrNull(body.clientOccurredAt),
    page_path: pagePath,
    device_class: asTrimmedString((body.properties as Record<string, unknown> | undefined)?.deviceClass, 16),
    app_version: appVersion,
    properties: {
      ...normalizedProperties,
      ...(choiceValue != null ? { choiceValue } : {}),
    },
  };

  const { error } = await supabase.from("research_events").insert(payload);
  if (error) {
    return NextResponse.json({ ok: false, reason: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
