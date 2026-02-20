"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { selectParticipantA, selectParticipantB } from "@/features/participants/selection";
import { createReportRunOnCompletion } from "@/features/reporting/actions";

const MISSING_SERVICE_ROLE_HINT =
  "Session konnte nicht erstellt werden. Bitte Datenbankkonfiguration prüfen.";
const isRlsError = (message?: string | null, code?: string | null) =>
  code === "42501" || (message ?? "").toLowerCase().includes("row-level security policy");
const isMissingColumnError = (message?: string | null, code?: string | null) =>
  code === "42703" || (message ?? "").toLowerCase().includes("column");
const FOCUS_SKILLS = ["Tech", "Sales", "Marketing", "Product", "Operations", "Finance"] as const;
const INTENTIONS = ["Suche", "Partner-Match", "Selbsttest"] as const;
type InviteEmailStatus = "sent" | "skipped" | "failed";
type InviteActionResult =
  | {
      ok: true;
      sessionId: string;
      inviteUrl: string;
      emailStatus: InviteEmailStatus;
    }
  | {
      ok: false;
      error: string;
    };

type ReportScope = "basis" | "basis_plus_values";
type SupabaseLikeClient = SupabaseClient;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function resolveAppBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return null;
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function sendInviteEmail(params: {
  to: string;
  inviteUrl: string;
  requestedScope: ReportScope;
  inviterEmail: string;
}): Promise<InviteEmailStatus> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVITE_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return "skipped";
  }

  const scopeLabel =
    params.requestedScope === "basis_plus_values"
      ? "Basis + Werte-Add-on"
      : "Nur Basis";
  const safeInviteUrl = escapeHtml(params.inviteUrl);
  const safeInviterEmail = escapeHtml(params.inviterEmail);
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
      <h2 style="margin:0 0 12px 0">Einladung zum Co-Foundery Matching</h2>
      <p>Du wurdest von <strong>${safeInviterEmail}</strong> zur gemeinsamen Analyse eingeladen.</p>
      <p>Report-Umfang: <strong>${scopeLabel}</strong></p>
      <p>
        <a href="${safeInviteUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;padding:10px 14px;border-radius:8px;text-decoration:none">
          Einladung öffnen
        </a>
      </p>
      <p>Falls der Button nicht funktioniert, nutze diesen Link:<br /><a href="${safeInviteUrl}">${safeInviteUrl}</a></p>
    </div>
  `.trim();

  const text = [
    "Einladung zum Co-Foundery Matching",
    "",
    `Du wurdest von ${params.inviterEmail} zur gemeinsamen Analyse eingeladen.`,
    `Report-Umfang: ${scopeLabel}`,
    "",
    `Einladung: ${params.inviteUrl}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        subject: "Einladung zur Co-Foundery Analyse",
        html,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Invite email failed:", response.status, body);
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Invite email request failed:", error);
    return "failed";
  }
}

function createInviteToken() {
  return randomBytes(24).toString("hex");
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function modulesForScope(scope: ReportScope) {
  return scope === "basis_plus_values"
    ? (["base", "values"] as const)
    : (["base"] as const);
}

const isMissingRelationError = (message?: string | null, code?: string | null) =>
  code === "42P01" || (message ?? "").toLowerCase().includes("relation");

async function dualWriteInvitation(params: {
  client: SupabaseLikeClient;
  inviterUserId: string;
  invitedEmail: string;
  reportScope: ReportScope;
  sessionId: string;
}) {
  const inviteToken = createInviteToken();
  const tokenHash = hashInviteToken(inviteToken);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invitation, error: invitationError } = await params.client
    .from("invitations")
    .insert({
      inviter_user_id: params.inviterUserId,
      invitee_email: params.invitedEmail,
      token_hash: tokenHash,
      session_id: params.sessionId,
      expires_at: expiresAt,
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (invitationError) {
    if (
      isMissingRelationError(invitationError.message, invitationError.code) ||
      isMissingColumnError(invitationError.message, invitationError.code)
    ) {
      console.warn("Dual-write invitations skipped (schema not ready):", invitationError.message);
      return { inviteToken: null };
    }

    console.error("Dual-write invitation insert failed:", invitationError.message);
    return { inviteToken: null };
  }

  const moduleRows = modulesForScope(params.reportScope).map((moduleKey) => ({
    invitation_id: invitation.id,
    module_key: moduleKey,
  }));
  const { error: moduleInsertError } = await params.client
    .from("invitation_modules")
    .insert(moduleRows);

  if (moduleInsertError) {
    if (
      isMissingRelationError(moduleInsertError.message, moduleInsertError.code) ||
      isMissingColumnError(moduleInsertError.message, moduleInsertError.code)
    ) {
      console.warn("Dual-write invitation modules skipped (schema not ready):", moduleInsertError.message);
      return { inviteToken: null };
    }

    console.error("Dual-write invitation_modules insert failed:", moduleInsertError.message);
    return { inviteToken: null };
  }

  return { inviteToken };
}

function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function deleteSessionByIdWithClient(
  client: SupabaseLikeClient,
  sessionId: string
) {
  const responseDeleteError = (await client.from("responses").delete().eq("session_id", sessionId)).error;
  const freeTextDeleteError = (await client.from("free_text").delete().eq("session_id", sessionId)).error;
  const participantDeleteError = (await client.from("participants").delete().eq("session_id", sessionId)).error;
  const sessionDeleteError = (await client.from("sessions").delete().eq("id", sessionId)).error;
  return responseDeleteError ?? freeTextDeleteError ?? participantDeleteError ?? sessionDeleteError;
}

export async function createSessionAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();

  if (!authSession?.access_token) {
    redirect("/login?error=session_missing");
  }

  const dbClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      accessToken: async () => authSession.access_token,
    }
  );

  let { data: session, error: sessionError } = await dbClient
    .from("sessions")
    .insert({ status: "in_progress" })
    .select("id")
    .single();

  if (isRlsError(sessionError?.message, sessionError?.code) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const retry = await adminClient
      .from("sessions")
      .insert({ status: "in_progress" })
      .select("id")
      .single();
    session = retry.data;
    sessionError = retry.error;
  }

  if (isRlsError(sessionError?.message, sessionError?.code) && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect(`/dashboard?error=${encodeURIComponent(MISSING_SERVICE_ROLE_HINT)}`);
  }

  if (sessionError || !session) {
    const message = sessionError?.message
      ? encodeURIComponent(sessionError.message)
      : "session_fehlgeschlagen";
    redirect(`/dashboard?error=${message}`);
  }

  let { error: participantAError } = await dbClient.from("participants").insert({
    session_id: session.id,
    role: "A",
    user_id: user.id,
  });

  if (participantAError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const retry = await adminClient.from("participants").insert({
      session_id: session.id,
      role: "A",
      user_id: user.id,
    });
    participantAError = retry.error;
  }

  if (participantAError) {
    const message = participantAError.message
      ? encodeURIComponent(participantAError.message)
      : "teilnehmer_a_fehlgeschlagen";
    redirect(`/dashboard?error=${message}`);
  }

  const { data: participantA } = await dbClient
    .from("participants")
    .select("id")
    .eq("session_id", session.id)
    .eq("role", "A")
    .maybeSingle();

  if (participantA?.id) {
    await dbClient
      .from("sessions")
      .update({ participant_id: participantA.id })
      .eq("id", session.id);
  }

  revalidatePath("/dashboard");
  redirect(`/session/${session.id}/a`);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateDisplayNameAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rawValue = formData.get("displayName");
  const displayName = typeof rawValue === "string" ? rawValue.trim().slice(0, 64) : "";

  if (!displayName) {
    redirect("/dashboard?error=name_fehlt");
  }

  const { error } = await supabase
    .from("participants")
    .update({ display_name: displayName })
    .eq("user_id", user.id);

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveProfileOnboardingAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rawFocusSkill = formData.get("focusSkill");
  const rawIntention = formData.get("intention");
  const focusSkill = typeof rawFocusSkill === "string" ? rawFocusSkill.trim() : "";
  const intention = typeof rawIntention === "string" ? rawIntention.trim() : "";

  if (!FOCUS_SKILLS.includes(focusSkill as (typeof FOCUS_SKILLS)[number])) {
    redirect("/dashboard?error=ungueltiger_fokus_skill");
  }
  if (!INTENTIONS.includes(intention as (typeof INTENTIONS)[number])) {
    redirect("/dashboard?error=ungueltige_intention");
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      focus_skill: focusSkill,
      intention,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function inviteParticipantBAction(formData: FormData): Promise<InviteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();

  if (!authSession?.access_token) {
    redirect("/login?error=session_missing");
  }

  const dbClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      accessToken: async () => authSession.access_token,
    }
  );

  const sourceSessionIdRaw = formData.get("sessionId");
  const invitedEmailRaw = formData.get("invitedEmail");
  const reportScopeRaw = formData.get("reportScope");
  const inviteConsentRaw = formData.get("inviteConsent");
  const sourceSessionId = typeof sourceSessionIdRaw === "string" ? sourceSessionIdRaw.trim() : "";
  const invitedEmail =
    typeof invitedEmailRaw === "string" ? invitedEmailRaw.trim().toLowerCase() : "";
  const reportScope: ReportScope =
    reportScopeRaw === "basis_plus_values" ? "basis_plus_values" : "basis";
  const inviteConsent = inviteConsentRaw === "on" || inviteConsentRaw === "true";

  if (!sourceSessionId) {
    return { ok: false, error: "Session fehlt." };
  }

  if (!invitedEmail || !invitedEmail.includes("@")) {
    return { ok: false, error: "Bitte eine gueltige E-Mail eingeben." };
  }
  const ownEmail = user.email?.trim().toLowerCase() ?? null;
  if (ownEmail && invitedEmail === ownEmail) {
    return { ok: false, error: "Bitte lade eine andere E-Mail-Adresse ein (nicht deine eigene)." };
  }
  if (!inviteConsent) {
    return { ok: false, error: "Bitte bestaetige die Einwilligung zur Nutzung der E-Mail-Adresse." };
  }

  const { data: sourceMembership, error: sourceMembershipError } = await dbClient
    .from("participants")
    .select("id, completed_at")
    .eq("session_id", sourceSessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sourceMembershipError || !sourceMembership?.id) {
    return { ok: false, error: "Quelle nicht gefunden oder kein Zugriff." };
  }

  if (!sourceMembership.completed_at) {
    return { ok: false, error: "Bitte schliesse zuerst deine eigene Analyse ab." };
  }

  const [{ data: sourceResponses, error: sourceResponsesError }, { data: sourceFreeText, error: sourceFreeTextError }] =
    await Promise.all([
      dbClient
        .from("responses")
        .select("question_id, choice_value")
        .eq("session_id", sourceSessionId)
        .eq("participant_id", sourceMembership.id),
      dbClient
        .from("free_text")
        .select("text")
        .eq("session_id", sourceSessionId)
        .eq("participant_id", sourceMembership.id)
        .maybeSingle(),
    ]);

  if (sourceResponsesError) {
    return { ok: false, error: sourceResponsesError.message };
  }
  if (!sourceResponses || sourceResponses.length === 0) {
    return { ok: false, error: "Die Quelle hat keine Antworten." };
  }

  const now = new Date().toISOString();
  let { data: newSession, error: newSessionError } = await dbClient
    .from("sessions")
    .insert({ status: "waiting", source_session_id: sourceSessionId })
    .select("id")
    .single();

  if (isRlsError(newSessionError?.message, newSessionError?.code) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const retry = await adminClient
      .from("sessions")
      .insert({ status: "waiting", source_session_id: sourceSessionId })
      .select("id")
      .single();
    newSession = retry.data;
    newSessionError = retry.error;
  }

  if (newSessionError || !newSession?.id) {
    return { ok: false, error: newSessionError?.message ?? "Session konnte nicht erstellt werden." };
  }

  let { data: newParticipantA, error: newParticipantAError } = await dbClient
    .from("participants")
    .insert({
      session_id: newSession.id,
      role: "A",
      user_id: user.id,
      completed_at: now,
    })
    .select("id")
    .single();

  if (isRlsError(newParticipantAError?.message, newParticipantAError?.code) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const retry = await adminClient
      .from("participants")
      .insert({
        session_id: newSession.id,
        role: "A",
        user_id: user.id,
        completed_at: now,
      })
      .select("id")
      .single();
    newParticipantA = retry.data;
    newParticipantAError = retry.error;
  }

  if (newParticipantAError || !newParticipantA?.id) {
    return { ok: false, error: newParticipantAError?.message ?? "Teilnehmer A konnte nicht angelegt werden." };
  }

  await dbClient
    .from("sessions")
    .update({ participant_id: newParticipantA.id })
    .eq("id", newSession.id);

  const responseRows = sourceResponses.map((row) => ({
    session_id: newSession.id,
    participant_id: newParticipantA.id,
    question_id: row.question_id,
    choice_value: row.choice_value,
    updated_at: now,
  }));

  const { error: copyResponsesError } = await dbClient
    .from("responses")
    .upsert(responseRows, { onConflict: "participant_id,question_id" });

  if (copyResponsesError) {
    return { ok: false, error: copyResponsesError.message };
  }

  if (!sourceFreeTextError && sourceFreeText?.text) {
    const { error: copyFreeTextError } = await dbClient.from("free_text").upsert(
      {
        session_id: newSession.id,
        participant_id: newParticipantA.id,
        text: sourceFreeText.text,
        updated_at: now,
      },
      { onConflict: "participant_id" }
    );
    if (copyFreeTextError) {
      return { ok: false, error: copyFreeTextError.message };
    }
  }

  const invitePayload = {
    session_id: newSession.id,
    role: "B",
    invited_email: invitedEmail,
    requested_scope: reportScope,
    invite_consent_at: now,
    invite_consent_by_user_id: user.id,
  };

  const { error: inviteInsertError } = await dbClient.from("participants").insert(invitePayload);
  if (inviteInsertError && isMissingColumnError(inviteInsertError.message, inviteInsertError.code)) {
    const { error: fallbackInviteError } = await dbClient.from("participants").insert({
      session_id: newSession.id,
      role: "B",
      invited_email: invitedEmail,
    });
    if (fallbackInviteError) {
      return { ok: false, error: fallbackInviteError.message };
    }
  } else if (inviteInsertError) {
    return { ok: false, error: inviteInsertError.message };
  }

  const { inviteToken } = await dualWriteInvitation({
    client: dbClient,
    inviterUserId: user.id,
    invitedEmail,
    reportScope,
    sessionId: newSession.id,
  });

  const invitePath = inviteToken
    ? `/join?sessionId=${newSession.id}&inviteToken=${inviteToken}`
    : `/join?sessionId=${newSession.id}`;
  const inviteUrlFallback = invitePath;
  let inviteUrl = inviteUrlFallback;
  let emailStatus: InviteEmailStatus = "skipped";
  const appBaseUrl = await resolveAppBaseUrl();
  if (appBaseUrl) {
    inviteUrl = `${appBaseUrl}${invitePath}`;
    emailStatus = await sendInviteEmail({
      to: invitedEmail,
      inviteUrl,
      requestedScope: reportScope,
      inviterEmail: user.email ?? "noreply@cofoundery.app",
    });
  }

  revalidatePath("/dashboard");
  return {
    ok: true,
    sessionId: newSession.id,
    inviteUrl,
    emailStatus,
  };
}

export async function deleteArchivedSessionAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sessionIdRaw = formData.get("sessionId");
  const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : "";

  if (!sessionId) {
    redirect("/dashboard?error=session_fehlt");
  }

  const { data: membership } = await supabase
    .from("participants")
    .select("id, role")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "A") {
    redirect("/dashboard?error=keine_berechtigung_zum_loeschen");
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    redirect("/dashboard?error=Loeschen_nicht_moeglich:_SUPABASE_SERVICE_ROLE_KEY_fehlt");
  }

  const firstError = await deleteSessionByIdWithClient(adminClient, sessionId);
  if (firstError) {
    redirect(`/dashboard?error=${encodeURIComponent(firstError.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteSessionAction(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nicht eingeloggt." };
  }

  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return { ok: false, error: "Session-ID fehlt." };
  }

  const { data: membership } = await supabase
    .from("participants")
    .select("id, role")
    .eq("session_id", normalizedSessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "A") {
    return { ok: false, error: "Keine Berechtigung zum Löschen." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return { ok: false, error: "Löschen nicht möglich: SUPABASE_SERVICE_ROLE_KEY fehlt." };
  }

  const firstError = await deleteSessionByIdWithClient(adminClient, normalizedSessionId);
  if (firstError) {
    return { ok: false, error: firstError.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

type MySessionResponseRow = {
  questionId: string;
  prompt: string;
  dimension: string | null;
  category: string | null;
  type: string | null;
  choiceValue: string;
  choiceLabel: string | null;
  sortOrder: number | null;
  answeredAt: string | null;
};

export async function getMySessionResponsesAction(
  sessionId: string
): Promise<{ ok: true; rows: MySessionResponseRow[]; role: string | null } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nicht eingeloggt." };
  }

  const normalizedSessionId = sessionId.trim();
  if (!normalizedSessionId) {
    return { ok: false, error: "Session-ID fehlt." };
  }

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, role")
    .eq("session_id", normalizedSessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (participantError || !participant?.id) {
    return { ok: false, error: "Kein Zugriff auf diese Session." };
  }

  const { data: responsesRaw, error: responsesError } = await supabase
    .from("responses")
    .select("question_id, choice_value, created_at")
    .eq("session_id", normalizedSessionId)
    .eq("participant_id", participant.id);

  if (responsesError) {
    return { ok: false, error: responsesError.message };
  }

  const responses = responsesRaw ?? [];
  if (responses.length === 0) {
    return { ok: true, rows: [], role: participant.role };
  }

  const questionIds = [...new Set(responses.map((row) => row.question_id))];
  const [{ data: questionsRaw, error: questionsError }, { data: choicesRaw, error: choicesError }] =
    await Promise.all([
      supabase
        .from("questions")
        .select("id, prompt, dimension, category, type, sort_order")
        .in("id", questionIds),
      supabase.from("choices").select("question_id, value, label").in("question_id", questionIds),
    ]);

  if (questionsError) {
    return { ok: false, error: questionsError.message };
  }
  if (choicesError) {
    return { ok: false, error: choicesError.message };
  }

  const questionsById = new Map(
    (questionsRaw ?? []).map((row) => [row.id, row] as const)
  );
  const choiceLabelByKey = new Map<string, string>();
  for (const choice of choicesRaw ?? []) {
    const key = `${choice.question_id}::${String(choice.value)}`;
    if (!choiceLabelByKey.has(key)) {
      choiceLabelByKey.set(key, choice.label ?? "");
    }
  }

  const rows: MySessionResponseRow[] = responses
    .map((response) => {
      const question = questionsById.get(response.question_id);
      return {
        questionId: response.question_id,
        prompt: question?.prompt ?? response.question_id,
        dimension: question?.dimension ?? null,
        category: question?.category ?? null,
        type: question?.type ?? null,
        choiceValue: response.choice_value,
        choiceLabel:
          choiceLabelByKey.get(`${response.question_id}::${String(response.choice_value)}`) ?? null,
        sortOrder: question?.sort_order ?? null,
        answeredAt: response.created_at ?? null,
      };
    })
    .sort((a, b) => {
      const sortA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const sortB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (sortA !== sortB) return sortA - sortB;
      return a.questionId.localeCompare(b.questionId, "de");
    });

  return { ok: true, rows, role: participant.role };
}

export async function restoreResponsesToSessionAction(
  sourceSessionId: string,
  targetSessionId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nicht eingeloggt." };
  }

  const sourceId = sourceSessionId.trim();
  const targetId = targetSessionId.trim();
  if (!sourceId || !targetId) {
    return { ok: false, error: "Session-ID fehlt." };
  }
  if (sourceId === targetId) {
    return { ok: false, error: "Quelle und Ziel sind identisch." };
  }

  const [{ data: sourceMembership, error: sourceMembershipError }, { data: targetMembership, error: targetMembershipError }] =
    await Promise.all([
      supabase
        .from("participants")
        .select("id, completed_at")
        .eq("session_id", sourceId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("participants")
        .select("id, completed_at")
        .eq("session_id", targetId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (sourceMembershipError || !sourceMembership?.id) {
    return { ok: false, error: "Kein Zugriff auf die Quell-Session." };
  }
  if (targetMembershipError || !targetMembership?.id) {
    return { ok: false, error: "Kein Zugriff auf die Ziel-Session." };
  }

  const [{ data: sourceResponses, error: sourceResponsesError }, { data: sourceFreeText, error: sourceFreeTextError }] =
    await Promise.all([
      supabase
        .from("responses")
        .select("question_id, choice_value")
        .eq("session_id", sourceId)
        .eq("participant_id", sourceMembership.id),
      supabase
        .from("free_text")
        .select("text")
        .eq("session_id", sourceId)
        .eq("participant_id", sourceMembership.id)
        .maybeSingle(),
    ]);

  if (sourceResponsesError) {
    return { ok: false, error: sourceResponsesError.message };
  }

  if (!sourceResponses || sourceResponses.length === 0) {
    return { ok: false, error: "Quell-Session hat keine Antworten." };
  }

  const now = new Date().toISOString();
  const rowsToUpsert = sourceResponses.map((row) => ({
    session_id: targetId,
    participant_id: targetMembership.id,
    question_id: row.question_id,
    choice_value: row.choice_value,
    updated_at: now,
  }));

  const { error: upsertResponsesError } = await supabase
    .from("responses")
    .upsert(rowsToUpsert, { onConflict: "participant_id,question_id" });

  if (upsertResponsesError) {
    return { ok: false, error: upsertResponsesError.message };
  }

  if (!sourceFreeTextError && sourceFreeText?.text) {
    const { error: upsertFreeTextError } = await supabase.from("free_text").upsert(
      {
        session_id: targetId,
        participant_id: targetMembership.id,
        text: sourceFreeText.text,
        updated_at: now,
      },
      { onConflict: "participant_id" }
    );
    if (upsertFreeTextError) {
      return { ok: false, error: upsertFreeTextError.message };
    }
  }

  if (sourceMembership.completed_at && !targetMembership.completed_at) {
    const { error: completeTargetError } = await supabase
      .from("participants")
      .update({ completed_at: now })
      .eq("id", targetMembership.id);
    if (completeTargetError) {
      return { ok: false, error: completeTargetError.message };
    }
  }

  const { data: targetParticipants, error: targetParticipantsError } = await supabase
    .from("participants")
    .select("id, role, user_id, invited_email, completed_at, created_at")
    .eq("session_id", targetId);

  if (targetParticipantsError) {
    return { ok: false, error: targetParticipantsError.message };
  }

  const participantA = selectParticipantA(targetParticipants ?? []);
  const participantB = selectParticipantB(targetParticipants ?? [], { primary: participantA });
  const newStatus =
    participantA?.completed_at && participantB?.completed_at
      ? "match_ready"
      : participantA?.completed_at
      ? "waiting"
      : "in_progress";

  const { error: updateSessionError } = await supabase
    .from("sessions")
    .update({ status: newStatus })
    .eq("id", targetId);

  if (updateSessionError) {
    return { ok: false, error: updateSessionError.message };
  }

  if (newStatus === "match_ready") {
    await createReportRunOnCompletion(targetId);
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createComparisonFromExistingAction(formData: FormData): Promise<InviteActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const sourceSessionId = String(formData.get("sourceSessionId") ?? "").trim();
  const invitedEmail = String(formData.get("invitedEmail") ?? "").trim().toLowerCase();
  const reportScopeRaw = String(formData.get("reportScope") ?? "").trim();
  const inviteConsentRaw = String(formData.get("inviteConsent") ?? "").trim();
  const reportScope: ReportScope = reportScopeRaw === "basis_plus_values" ? "basis_plus_values" : "basis";
  const inviteConsent = inviteConsentRaw === "true" || inviteConsentRaw === "on";

  if (!sourceSessionId) {
    return { ok: false, error: "Quelle fehlt." };
  }
  if (!invitedEmail || !invitedEmail.includes("@")) {
    return { ok: false, error: "Bitte eine gueltige E-Mail eingeben." };
  }
  const ownEmail = user.email?.trim().toLowerCase() ?? null;
  if (ownEmail && invitedEmail === ownEmail) {
    return { ok: false, error: "Bitte lade eine andere E-Mail-Adresse ein (nicht deine eigene)." };
  }
  if (!inviteConsent) {
    return { ok: false, error: "Bitte bestaetige die Einwilligung zur Nutzung der E-Mail-Adresse." };
  }

  const { data: sourceMembership, error: sourceMembershipError } = await supabase
    .from("participants")
    .select("id, completed_at")
    .eq("session_id", sourceSessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sourceMembershipError || !sourceMembership?.id) {
    return { ok: false, error: "Quelle nicht gefunden oder kein Zugriff." };
  }
  if (!sourceMembership.completed_at) {
    return { ok: false, error: "Bitte schliesse zuerst deine eigene Analyse ab." };
  }

  const [{ data: sourceResponses, error: sourceResponsesError }, { data: sourceFreeText, error: sourceFreeTextError }] =
    await Promise.all([
      supabase
        .from("responses")
        .select("question_id, choice_value")
        .eq("session_id", sourceSessionId)
        .eq("participant_id", sourceMembership.id),
      supabase
        .from("free_text")
        .select("text")
        .eq("session_id", sourceSessionId)
        .eq("participant_id", sourceMembership.id)
        .maybeSingle(),
    ]);

  if (sourceResponsesError) {
    return { ok: false, error: sourceResponsesError.message };
  }
  if (!sourceResponses || sourceResponses.length === 0) {
    return { ok: false, error: "Die Quelle hat keine Antworten." };
  }

  const now = new Date().toISOString();
  const { data: newSession, error: sessionError } = await supabase
    .from("sessions")
    .insert({ status: "waiting", source_session_id: sourceSessionId })
    .select("id")
    .single();

  if (sessionError || !newSession?.id) {
    return { ok: false, error: sessionError?.message ?? "Session konnte nicht erstellt werden." };
  }

  const { data: participantA, error: participantAError } = await supabase
    .from("participants")
    .insert({
      session_id: newSession.id,
      role: "A",
      user_id: user.id,
      completed_at: now,
    })
    .select("id")
    .single();

  if (participantAError || !participantA?.id) {
    return { ok: false, error: participantAError?.message ?? "Teilnehmer A konnte nicht angelegt werden." };
  }

  await supabase
    .from("sessions")
    .update({ participant_id: participantA.id })
    .eq("id", newSession.id);

  const responseRows = sourceResponses.map((row) => ({
    session_id: newSession.id,
    participant_id: participantA.id,
    question_id: row.question_id,
    choice_value: row.choice_value,
    updated_at: now,
  }));

  const { error: copyResponsesError } = await supabase
    .from("responses")
    .upsert(responseRows, { onConflict: "participant_id,question_id" });

  if (copyResponsesError) {
    return { ok: false, error: copyResponsesError.message };
  }

  if (!sourceFreeTextError && sourceFreeText?.text) {
    const { error: copyFreeTextError } = await supabase.from("free_text").upsert(
      {
        session_id: newSession.id,
        participant_id: participantA.id,
        text: sourceFreeText.text,
        updated_at: now,
      },
      { onConflict: "participant_id" }
    );
    if (copyFreeTextError) {
      return { ok: false, error: copyFreeTextError.message };
    }
  }

  const invitePayload = {
    session_id: newSession.id,
    role: "B",
    invited_email: invitedEmail,
    requested_scope: reportScope,
    invite_consent_at: now,
    invite_consent_by_user_id: user.id,
  };

  const { error: inviteInsertError } = await supabase.from("participants").insert(invitePayload);
  if (inviteInsertError && isMissingColumnError(inviteInsertError.message, inviteInsertError.code)) {
    const { error: fallbackInviteError } = await supabase.from("participants").insert({
      session_id: newSession.id,
      role: "B",
      invited_email: invitedEmail,
    });
    if (fallbackInviteError) {
      return { ok: false, error: fallbackInviteError.message };
    }
  } else if (inviteInsertError) {
    return { ok: false, error: inviteInsertError.message };
  }

  const { inviteToken } = await dualWriteInvitation({
    client: supabase,
    inviterUserId: user.id,
    invitedEmail,
    reportScope,
    sessionId: newSession.id,
  });

  const invitePath = inviteToken
    ? `/join?sessionId=${newSession.id}&inviteToken=${inviteToken}`
    : `/join?sessionId=${newSession.id}`;
  const inviteUrlFallback = invitePath;
  let inviteUrl = inviteUrlFallback;
  let emailStatus: InviteEmailStatus = "skipped";
  const appBaseUrl = await resolveAppBaseUrl();
  if (appBaseUrl) {
    inviteUrl = `${appBaseUrl}${invitePath}`;
    emailStatus = await sendInviteEmail({
      to: invitedEmail,
      inviteUrl,
      requestedScope: reportScope,
      inviterEmail: user.email ?? "noreply@cofoundery.app",
    });
  }

  revalidatePath("/dashboard");
  return {
    ok: true,
    sessionId: newSession.id,
    inviteUrl,
    emailStatus,
  };
}
