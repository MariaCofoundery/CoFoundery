import "server-only";

import { createHash, randomBytes } from "crypto";
import { needsAdvisorTeamInviteRecovery } from "@/features/dashboard/advisorTeamInviteRecovery";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { bindLatestSubmittedInvitationMatchingInputs } from "@/features/assessments/matchingBindings";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from" | "rpc">;

type AdvisorTeamInviteRow = {
  id: string;
  advisor_user_id: string;
  advisor_email: string | null;
  advisor_name: string | null;
  team_name: string | null;
  founder_a_email: string;
  founder_b_email: string;
  founder_a_user_id: string | null;
  founder_b_user_id: string | null;
  founder_a_claimed_at: string | null;
  founder_b_claimed_at: string | null;
  founder_a_token_hash: string | null;
  founder_b_token_hash: string | null;
  invitation_id: string | null;
  relationship_id: string | null;
  status: "pending" | "activating" | "activated" | "revoked" | "expired";
  expires_at: string;
  founder_a_send_status: "not_sent" | "sent" | "failed";
  founder_b_send_status: "not_sent" | "sent" | "failed";
  founder_a_last_sent_at: string | null;
  founder_b_last_sent_at: string | null;
  founder_a_send_error_code: string | null;
  founder_b_send_error_code: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  user_id: string;
  display_name: string | null;
};

type ExistingRelationshipRow = {
  id: string;
};

type InsertedInvitationRow = {
  id: string;
};

type ExistingRelationshipAdvisorRow = {
  id: string;
  status: string;
  revoked_at: string | null;
};

type InvitationBootstrapRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string;
  status: string;
  accepted_at: string | null;
};

export type AdvisorPendingTeamInvite = {
  id: string;
  teamName: string | null;
  founderAEmail: string;
  founderBEmail: string;
  founderALabel: string;
  founderBLabel: string;
  founderAStarted: boolean;
  founderBStarted: boolean;
  founderAStartedAt: string | null;
  founderBStartedAt: string | null;
  founderASendStatus: "not_sent" | "sent" | "failed";
  founderBSendStatus: "not_sent" | "sent" | "failed";
  founderALastSentAt: string | null;
  founderBLastSentAt: string | null;
  expiresAt: string;
  status: "pending" | "expired";
  progressLabel: string;
  nextStepLabel: string;
  lastActivityAt: string;
};

export type AdvisorTeamInviteTokenLookup =
  | {
      status: "not_found";
    }
  | {
      status: "ready";
      row: AdvisorTeamInviteRow;
      founderSlot: "founderA" | "founderB";
      slotEmail: string;
    };

export type ClaimAdvisorTeamInviteResult =
  | {
      ok: true;
      state: "inviter_continue" | "invitee_continue";
      invitationId: string;
    }
  | {
      ok: false;
      reason:
        | "not_authenticated"
        | "service_unavailable"
        | "invalid_token"
        | "email_mismatch"
        | "already_claimed"
        | "claim_failed"
        | "email_not_verified"
        | "activation_failed";
    };

function createPrivilegedClient(): SupabaseLikeClient | null {
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

export function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function normalizeTeamName(value: string | null | undefined) {
  const normalized = (value ?? "").trim().slice(0, 120);
  return normalized.length > 0 ? normalized : null;
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOpaqueToken() {
  return randomBytes(24).toString("hex");
}

export function fallbackLabelFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : "Founder";
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function logAdvisorTeamInviteActivation(params: {
  stage: string;
  level?: "info" | "error";
  pendingInviteId: string;
  invitationId?: string | null;
  founderSlot?: "founderA" | "founderB";
  currentUserId?: string | null;
  status?: string | null;
  founderAUserId?: string | null;
  founderBUserId?: string | null;
  relationshipId?: string | null;
  detail?: string | null;
}) {
  const logger = params.level === "error" ? console.error : console.info;
  logger("[advisor-activation]", {
    step: params.stage,
    success: params.level === "error" ? false : true,
    pendingInviteId: params.pendingInviteId,
    invitationId: params.invitationId ?? null,
    founderSlot: params.founderSlot ?? null,
    currentUserId: params.currentUserId ?? null,
    status: params.status ?? null,
    founderAUserId: params.founderAUserId ?? null,
    founderBUserId: params.founderBUserId ?? null,
    relationshipId: params.relationshipId ?? null,
    detail: params.detail ?? null,
  });
}

type FinalizeAdvisorTeamInviteResult = {
  pendingInviteId: string;
  invitationId: string | null;
  relationshipId: string | null;
  activated: boolean;
  invitationReady: boolean;
  advisorLinkReady: boolean;
  repaired: boolean;
  failures: string[];
};

function buildPendingProgressLabel(row: AdvisorTeamInviteRow) {
  const startedCount = Number(Boolean(row.founder_a_claimed_at)) + Number(Boolean(row.founder_b_claimed_at));
  if (startedCount === 0) {
    return "Noch nicht gestartet";
  }
  if (startedCount === 1) {
    return "1 von 2 Founder hat gestartet";
  }
  return "Beide Founder haben gestartet";
}

function buildPendingNextStepLabel(row: AdvisorTeamInviteRow) {
  if (!row.founder_a_claimed_at && !row.founder_b_claimed_at) {
    return "Wartet auf den ersten Start";
  }
  if (!row.founder_a_claimed_at || !row.founder_b_claimed_at) {
    return "Wartet auf den zweiten Founder";
  }
  return "Das Team wechselt gleich in die begleiteten Teams";
}

export async function getAdvisorPendingTeamInvites(userId: string): Promise<AdvisorPendingTeamInvite[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("advisor_team_invites")
    .select(
      "id, advisor_user_id, advisor_email, advisor_name, team_name, founder_a_email, founder_b_email, founder_a_user_id, founder_b_user_id, founder_a_claimed_at, founder_b_claimed_at, founder_a_token_hash, founder_b_token_hash, invitation_id, relationship_id, status, expires_at, founder_a_send_status, founder_b_send_status, founder_a_last_sent_at, founder_b_last_sent_at, founder_a_send_error_code, founder_b_send_error_code, created_at, updated_at"
    )
    .eq("advisor_user_id", normalizedUserId)
    .in("status", ["pending", "expired"])
    .order("updated_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const rows = data as AdvisorTeamInviteRow[];
  const userIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.founder_a_user_id, row.founder_b_user_id])
        .filter((value): value is string => Boolean(value))
    ),
  ];

  const profileRows =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds)
      : { data: [] as ProfileRow[], error: null };

  const profileByUserId = new Map(
    ((profileRows.data ?? []) as ProfileRow[]).map((row) => [
      row.user_id,
      row.display_name?.trim() ?? "",
    ])
  );

  return rows.map((row) => {
    const founderALabel =
      (row.founder_a_user_id ? profileByUserId.get(row.founder_a_user_id) : null) ||
      fallbackLabelFromEmail(row.founder_a_email);
    const founderBLabel =
      (row.founder_b_user_id ? profileByUserId.get(row.founder_b_user_id) : null) ||
      fallbackLabelFromEmail(row.founder_b_email);
    const lastActivityAt =
      [row.founder_a_claimed_at, row.founder_b_claimed_at, row.updated_at, row.created_at]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? row.created_at;

    return {
      id: row.id,
      teamName: normalizeTeamName(row.team_name),
      founderAEmail: row.founder_a_email,
      founderBEmail: row.founder_b_email,
      founderALabel,
      founderBLabel,
      founderAStarted: Boolean(row.founder_a_claimed_at),
      founderBStarted: Boolean(row.founder_b_claimed_at),
      founderAStartedAt: row.founder_a_claimed_at,
      founderBStartedAt: row.founder_b_claimed_at,
      founderASendStatus: row.founder_a_send_status,
      founderBSendStatus: row.founder_b_send_status,
      founderALastSentAt: row.founder_a_last_sent_at,
      founderBLastSentAt: row.founder_b_last_sent_at,
      expiresAt: row.expires_at,
      status: row.status === "expired" || Date.parse(row.expires_at) <= Date.now() ? "expired" : "pending",
      progressLabel: buildPendingProgressLabel(row),
      nextStepLabel: buildPendingNextStepLabel(row),
      lastActivityAt,
    } satisfies AdvisorPendingTeamInvite;
  });
}

async function loadAdvisorTeamInviteByTokenHash(
  tokenHash: string,
  client: SupabaseLikeClient
): Promise<AdvisorTeamInviteTokenLookup> {
  const { data, error } = await client
    .from("advisor_team_invites")
    .select(
      "id, advisor_user_id, advisor_email, advisor_name, team_name, founder_a_email, founder_b_email, founder_a_user_id, founder_b_user_id, founder_a_claimed_at, founder_b_claimed_at, founder_a_token_hash, founder_b_token_hash, invitation_id, relationship_id, status, expires_at, founder_a_send_status, founder_b_send_status, founder_a_last_sent_at, founder_b_last_sent_at, founder_a_send_error_code, founder_b_send_error_code, created_at, updated_at"
    )
    .or(`founder_a_token_hash.eq.${tokenHash},founder_b_token_hash.eq.${tokenHash}`)
    .in("status", ["pending", "activating"])
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return { status: "not_found" };
  }

  const row = data as AdvisorTeamInviteRow;
  const founderSlot = row.founder_a_token_hash === tokenHash ? "founderA" : "founderB";
  const slotEmail = founderSlot === "founderA" ? row.founder_a_email : row.founder_b_email;

  return {
    status: "ready",
    row,
    founderSlot,
    slotEmail,
  };
}

async function loadAdvisorTeamInviteById(
  id: string,
  client: SupabaseLikeClient
): Promise<AdvisorTeamInviteRow | null> {
  const normalizedId = id.trim();
  if (!normalizedId) {
    return null;
  }

  const { data, error } = await client
    .from("advisor_team_invites")
    .select(
      "id, advisor_user_id, advisor_email, advisor_name, team_name, founder_a_email, founder_b_email, founder_a_user_id, founder_b_user_id, founder_a_claimed_at, founder_b_claimed_at, founder_a_token_hash, founder_b_token_hash, invitation_id, relationship_id, status, expires_at, founder_a_send_status, founder_b_send_status, founder_a_last_sent_at, founder_b_last_sent_at, founder_a_send_error_code, founder_b_send_error_code, created_at, updated_at"
    )
    .eq("id", normalizedId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AdvisorTeamInviteRow;
}

export async function getAdvisorTeamInviteByToken(
  token: string
): Promise<AdvisorTeamInviteTokenLookup> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return { status: "not_found" };
  }

  const privileged = createPrivilegedClient();
  if (!privileged) {
    return { status: "not_found" };
  }

  return loadAdvisorTeamInviteByTokenHash(hashOpaqueToken(normalizedToken), privileged);
}

// Phase 12C.1B: `relationships` hat keine Spalten `status`/`revoked_at` (mehr).
// Sie hier zu lesen und zu schreiben liess jede neue Advisor-Team-Verbindung an
// "relationship_create_failed" scheitern - der Advisor wurde nie verknuepft.
async function resolveRelationshipIdForFounders(
  founderAUserId: string,
  founderBUserId: string,
  client: SupabaseLikeClient
) {
  const { data: existingRelationship, error: existingRelationshipError } = await client
    .from("relationships")
    .select("id")
    .or(
      `and(user_a_id.eq.${founderAUserId},user_b_id.eq.${founderBUserId}),and(user_a_id.eq.${founderBUserId},user_b_id.eq.${founderAUserId})`
    )
    .maybeSingle();

  if (!existingRelationshipError && existingRelationship) {
    return (existingRelationship as ExistingRelationshipRow).id;
  }

  const { data: insertedRelationship, error: insertedRelationshipError } = await client
    .from("relationships")
    .insert({
      user_a_id: founderAUserId,
      user_b_id: founderBUserId,
    })
    .select("id")
    .maybeSingle();

  if (!insertedRelationshipError && insertedRelationship) {
    return (insertedRelationship as ExistingRelationshipRow).id;
  }

  const { data: retriedRelationship, error: retriedRelationshipError } = await client
    .from("relationships")
    .select("id")
    .or(
      `and(user_a_id.eq.${founderAUserId},user_b_id.eq.${founderBUserId}),and(user_a_id.eq.${founderBUserId},user_b_id.eq.${founderAUserId})`
    )
    .maybeSingle();

  if (retriedRelationshipError || !retriedRelationship) {
    throw new Error("relationship_create_failed");
  }

  return (retriedRelationship as ExistingRelationshipRow).id;
}

async function loadInvitationBootstrapRow(
  invitationId: string,
  client: SupabaseLikeClient
): Promise<InvitationBootstrapRow | null> {
  const { data, error } = await client
    .from("invitations")
    .select("id, inviter_user_id, invitee_user_id, invitee_email, status, accepted_at")
    .eq("id", invitationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as InvitationBootstrapRow;
}

async function createBootstrapInvitationForAdvisorTeam(params: {
  row: AdvisorTeamInviteRow;
  inviterUserId: string;
  inviterEmail: string;
  inviteeEmail: string;
  client: SupabaseLikeClient;
}) {
  const [{ data: inviterProfile }, existingInvitation, { data: reusableInvitation }] = await Promise.all([
    params.client
      .from("profiles")
      .select("display_name")
      .eq("user_id", params.inviterUserId)
      .maybeSingle(),
    params.row.invitation_id
      ? loadInvitationBootstrapRow(params.row.invitation_id, params.client)
      : Promise.resolve(null),
    params.client
      .from("invitations")
      .select("id")
      .eq("inviter_user_id", params.inviterUserId)
      .eq("invitee_email", normalizeEmail(params.inviteeEmail))
      .eq("team_context", "pre_founder")
      .in("status", ["sent", "opened"])
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (existingInvitation?.id) {
    return existingInvitation.id;
  }

  if ((reusableInvitation as InsertedInvitationRow | null)?.id) {
    const invitationId = (reusableInvitation as InsertedInvitationRow).id;
    await params.client.from("invitation_modules").upsert(
      { invitation_id: invitationId, module: "base" },
      { onConflict: "invitation_id,module" }
    );
    const { error: pendingUpdateError } = await params.client
      .from("advisor_team_invites")
      .update({ invitation_id: invitationId })
      .eq("id", params.row.id);
    if (pendingUpdateError) {
      throw new Error(pendingUpdateError.message);
    }
    return invitationId;
  }

  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const inviterDisplayName =
    (inviterProfile as { display_name?: string | null } | null)?.display_name?.trim() ||
    fallbackLabelFromEmail(params.inviterEmail);

  const { data: insertedInvitation, error: insertedInvitationError } = await params.client
    .from("invitations")
    .insert({
      inviter_user_id: params.inviterUserId,
      invitee_email: params.inviteeEmail,
      label: normalizeTeamName(params.row.team_name) ?? params.inviteeEmail,
      inviter_display_name: inviterDisplayName,
      inviter_email: params.inviterEmail,
      team_context: "pre_founder",
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "sent",
    })
    .select("id")
    .single();

  if (insertedInvitationError || !insertedInvitation) {
    throw new Error(insertedInvitationError?.message ?? "bootstrap_invitation_create_failed");
  }

  const invitationId = (insertedInvitation as InsertedInvitationRow).id;
  const { error: moduleError } = await params.client.from("invitation_modules").insert({
    invitation_id: invitationId,
    module: "base",
  });

  if (moduleError) {
    throw new Error(moduleError.message);
  }

  await bindLatestSubmittedInvitationMatchingInputs(invitationId, params.inviterUserId, ["base"], {
    client: params.client,
    replaceExisting: false,
  }).catch(() => null);

  const { error: pendingUpdateError } = await params.client
    .from("advisor_team_invites")
    .update({
      invitation_id: invitationId,
    })
    .eq("id", params.row.id);

  if (pendingUpdateError) {
    throw new Error(pendingUpdateError.message);
  }

  return invitationId;
}

async function upsertRelationshipAdvisorLink(params: {
  row: AdvisorTeamInviteRow;
  relationshipId: string;
  invitationId: string;
  client: SupabaseLikeClient;
}) {
  const { data: existingByInvitation } = await params.client
    .from("relationship_advisors")
    .select("id, status, revoked_at")
    .eq("source_invitation_id", params.invitationId)
    .eq("advisor_user_id", params.row.advisor_user_id)
    .limit(1)
    .maybeSingle();

  const { data: revokedByRelationship } = existingByInvitation
    ? { data: null }
    : await params.client
    .from("relationship_advisors")
    .select("id, status, revoked_at")
    .eq("relationship_id", params.relationshipId)
    .eq("advisor_user_id", params.row.advisor_user_id)
    .or("status.eq.revoked,revoked_at.not.is.null")
    .limit(1)
    .maybeSingle();

  const { data: existingByRelationship } = existingByInvitation || revokedByRelationship
    ? { data: null }
    : await params.client
    .from("relationship_advisors")
    .select("id, status, revoked_at")
    .eq("relationship_id", params.relationshipId)
    .eq("advisor_user_id", params.row.advisor_user_id)
    .limit(1)
    .maybeSingle();

  const existingRelationshipAdvisor =
    existingByInvitation ?? revokedByRelationship ?? existingByRelationship;

  if (
    (existingRelationshipAdvisor as ExistingRelationshipAdvisorRow | null)?.status === "revoked" ||
    (existingRelationshipAdvisor as ExistingRelationshipAdvisorRow | null)?.revoked_at
  ) {
    // Retry/repair of an already activated team invite must never undo a founder revoke.
    return "revoked" as const;
  }

  const basePayload = {
    relationship_id: params.relationshipId,
    advisor_user_id: params.row.advisor_user_id,
    advisor_name: params.row.advisor_name,
    status: "linked",
    founder_a_approved: true,
    founder_b_approved: true,
    approved_at: new Date().toISOString(),
    linked_at: new Date().toISOString(),
    revoked_at: null,
    requested_by_user_id: null,
    source_invitation_id: params.invitationId,
    invite_token_hash: null,
  };
  const extendedPayload = {
    ...basePayload,
    advisor_email: params.row.advisor_email,
    invited_at: params.row.created_at,
  };

  async function persist(payload: typeof basePayload | typeof extendedPayload) {
    const writeQuery = existingRelationshipAdvisor
      ? params.client
          .from("relationship_advisors")
          .update(payload)
          .eq("id", (existingRelationshipAdvisor as ExistingRelationshipAdvisorRow).id)
      : params.client.from("relationship_advisors").insert(payload);

    return writeQuery.select("id").maybeSingle();
  }

  const extendedResult = await persist(extendedPayload);
  if (!extendedResult.error) {
    return "linked" as const;
  }

  if (!/advisor_email|invited_at/i.test(extendedResult.error.message)) {
    throw new Error(extendedResult.error.message);
  }

  logAdvisorTeamInviteActivation({
    stage: "relationship_advisor_extended_payload_retry",
    level: "error",
    pendingInviteId: params.row.id,
    invitationId: params.invitationId,
    status: params.row.status,
    founderAUserId: params.row.founder_a_user_id,
    founderBUserId: params.row.founder_b_user_id,
    relationshipId: params.relationshipId,
    detail: extendedResult.error.message,
  });

  const baseResult = await persist(basePayload);
  if (baseResult.error) {
    throw new Error(baseResult.error.message);
  }
  return "linked" as const;
}

function resolveBootstrapStarter(row: AdvisorTeamInviteRow) {
  const founderAClaimedAt = row.founder_a_claimed_at ? new Date(row.founder_a_claimed_at).getTime() : null;
  const founderBClaimedAt = row.founder_b_claimed_at ? new Date(row.founder_b_claimed_at).getTime() : null;

  const founderAFirst =
    row.founder_a_user_id &&
    (!row.founder_b_user_id ||
      founderBClaimedAt == null ||
      (founderAClaimedAt != null && founderAClaimedAt <= founderBClaimedAt));

  if (founderAFirst) {
    return {
      inviterUserId: row.founder_a_user_id as string,
      inviterEmail: row.founder_a_email,
      inviteeEmail: row.founder_b_email,
    };
  }

  if (row.founder_b_user_id) {
    return {
      inviterUserId: row.founder_b_user_id,
      inviterEmail: row.founder_b_email,
      inviteeEmail: row.founder_a_email,
    };
  }

  return null;
}

/**
 * Phase 12C.1B: Finalisieren bis zum Ende - nur aus ausdruecklichen
 * Schreibwegen (zweiter Slot-Klick, Knopf "Verbindung abschliessen").
 *
 * Ein Durchlauf legt fehlende Teile an (Einladung, Beziehung) und verknuepft
 * den Advisor erst im naechsten, wenn diese Teile gespeichert sind. Bisher hat
 * der naechste Seitenaufruf (GET) diesen zweiten Durchlauf erledigt; jetzt
 * laeuft er hier, solange ein Durchlauf etwas repariert hat (hoechstens drei).
 * Jeder Schritt ist idempotent - parallele Klicks fuehren zum selben Ergebnis.
 */
export async function finalizeAdvisorTeamInviteCompletely(
  pendingInvite: AdvisorTeamInviteRow,
  client?: SupabaseLikeClient
): Promise<FinalizeAdvisorTeamInviteResult> {
  const resolvedClient = client ?? createPrivilegedClient();
  let row = pendingInvite;
  let result = await finalizeAdvisorTeamInviteIfPossible(row, resolvedClient ?? undefined);
  for (let pass = 1; pass < 3 && !result.activated && result.repaired; pass += 1) {
    if (!resolvedClient) break;
    const reloaded = await loadAdvisorTeamInviteById(row.id, resolvedClient);
    if (!reloaded) break;
    row = reloaded;
    result = await finalizeAdvisorTeamInviteIfPossible(row, resolvedClient ?? undefined);
  }
  return result;
}

export async function finalizeAdvisorTeamInviteIfPossible(
  pendingInvite: AdvisorTeamInviteRow,
  client?: SupabaseLikeClient
): Promise<FinalizeAdvisorTeamInviteResult> {
  const resolvedClient = client ?? createPrivilegedClient();
  const failures: string[] = [];
  let repaired = false;
  let row = pendingInvite;
  let invitationId = row.invitation_id;
  let relationshipId = row.relationship_id;
  let invitation: InvitationBootstrapRow | null = null;
  let advisorLinkReady = false;

  const resultBase = (): FinalizeAdvisorTeamInviteResult => ({
    pendingInviteId: row.id,
    invitationId,
    relationshipId,
    activated: row.status === "activated",
    invitationReady: Boolean(
      invitation && ["sent", "opened", "accepted"].includes(String(invitation.status))
    ),
    advisorLinkReady,
    repaired,
    failures,
  });

  if (!resolvedClient) {
    failures.push("service_unavailable");
    logAdvisorTeamInviteActivation({
      stage: "finalize_service_unavailable",
      level: "error",
      pendingInviteId: row.id,
      invitationId,
      status: row.status,
      founderAUserId: row.founder_a_user_id,
      founderBUserId: row.founder_b_user_id,
      relationshipId,
      detail: "missing_service_role",
    });
    return resultBase();
  }

  const inviteExpired = new Date(row.expires_at).getTime() <= Date.now();
  if (row.status === "revoked" || row.status === "expired" || inviteExpired) {
    failures.push(row.status === "revoked" ? "invite_revoked" : "invite_expired");
    return resultBase();
  }

  if (row.status === "activated") {
    return resultBase();
  }

  if (invitationId) {
    invitation = await loadInvitationBootstrapRow(invitationId, resolvedClient);
  }

  async function safeStep<T>(step: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      const value = await fn();
      logAdvisorTeamInviteActivation({
        stage: step,
        pendingInviteId: row.id,
        invitationId,
        status: row.status,
        founderAUserId: row.founder_a_user_id,
        founderBUserId: row.founder_b_user_id,
        relationshipId,
      });
      return value;
    } catch (error) {
      const detail = toErrorMessage(error);
      failures.push(`${step}:${detail}`);
      logAdvisorTeamInviteActivation({
        stage: step,
        level: "error",
        pendingInviteId: row.id,
        invitationId,
        status: row.status,
        founderAUserId: row.founder_a_user_id,
        founderBUserId: row.founder_b_user_id,
        relationshipId,
        detail,
      });
      return null;
    }
  }

  if (!invitationId) {
    const starter = resolveBootstrapStarter(row);
    if (starter) {
      const createdInvitationId = await safeStep("ensure_invitation", () =>
        createBootstrapInvitationForAdvisorTeam({
          row,
          inviterUserId: starter.inviterUserId,
          inviterEmail: starter.inviterEmail,
          inviteeEmail: starter.inviteeEmail,
          client: resolvedClient,
        })
      );
      if (createdInvitationId) {
        invitationId = createdInvitationId;
        repaired = true;
      }
    } else {
      failures.push("ensure_invitation:missing_founder_starter");
      logAdvisorTeamInviteActivation({
        stage: "ensure_invitation",
        level: "error",
        pendingInviteId: row.id,
        invitationId,
        status: row.status,
        founderAUserId: row.founder_a_user_id,
        founderBUserId: row.founder_b_user_id,
        relationshipId,
        detail: "missing_founder_starter",
      });
    }
  } else {
    logAdvisorTeamInviteActivation({
      stage: "ensure_invitation_skip_existing",
      pendingInviteId: row.id,
      invitationId,
      status: row.status,
      founderAUserId: row.founder_a_user_id,
      founderBUserId: row.founder_b_user_id,
      relationshipId,
    });
  }

  if (invitationId) {
    invitation = await loadInvitationBootstrapRow(invitationId, resolvedClient);
  }

  const bothFoundersClaimed = Boolean(row.founder_a_user_id && row.founder_b_user_id);
  if (bothFoundersClaimed && !relationshipId) {
    const resolvedRelationshipId = await safeStep("ensure_relationship", () =>
      resolveRelationshipIdForFounders(
        row.founder_a_user_id as string,
        row.founder_b_user_id as string,
        resolvedClient
      )
    );
    if (resolvedRelationshipId) {
      relationshipId = resolvedRelationshipId;
      repaired = true;
    }
  } else if (!bothFoundersClaimed) {
    logAdvisorTeamInviteActivation({
      stage: "ensure_relationship_skip_missing_founders",
      pendingInviteId: row.id,
      invitationId,
      status: row.status,
      founderAUserId: row.founder_a_user_id,
      founderBUserId: row.founder_b_user_id,
      relationshipId,
    });
  } else {
    logAdvisorTeamInviteActivation({
      stage: "ensure_relationship_skip_existing",
      pendingInviteId: row.id,
      invitationId,
      status: row.status,
      founderAUserId: row.founder_a_user_id,
      founderBUserId: row.founder_b_user_id,
      relationshipId,
    });
  }

  if (row.invitation_id !== invitationId || row.relationship_id !== relationshipId) {
    const persistedReferences = await safeStep("persist_partial_references", async () => {
      const { error } = await resolvedClient
        .from("advisor_team_invites")
        .update({
          invitation_id: invitationId,
          relationship_id: relationshipId,
        })
        .eq("id", row.id);
      if (error) {
        throw new Error(error.message);
      }
      return true;
    });
    if (persistedReferences) {
      const refreshedRow = await loadAdvisorTeamInviteById(row.id, resolvedClient);
      if (refreshedRow) {
        row = refreshedRow;
        repaired = true;
      }
    }
  }

  // Phase 12C.1B: KEINE erzwungene Annahme mehr. Hier setzte der
  // Service-Role-Client die Founder-Einladung auf "angenommen" (und schrieb
  // dabei die laengst entfernte Spalte invitations.relationship_id - der Schritt
  // konnte im aktuellen Schema nie gelingen). Seit 12C.0 entsteht eine
  // Teammitgliedschaft nur ueber die ausdrueckliche Wahl im Beitrittsdialog:
  // Nach dem Slot-Klick fuehrt /join/start die eingeladene Founderin dorthin.

  // Bereit heisst: Die Founder-Einladung existiert und ist offen oder
  // angenommen - die Annahme selbst bleibt der Founderin vorbehalten.
  const invitationReady = Boolean(
    invitation && ["sent", "opened", "accepted"].includes(String(invitation.status))
  );

  if (invitationId && relationshipId) {
    const advisorLinkResult = await safeStep("ensure_relationship_advisor", async () => {
      return upsertRelationshipAdvisorLink({
        row,
        relationshipId,
        invitationId,
        client: resolvedClient,
      });
    });
    advisorLinkReady = advisorLinkResult === "linked";
    if (advisorLinkReady) {
      repaired = true;
    } else if (advisorLinkResult === "revoked") {
      failures.push("ensure_relationship_advisor:revoked");
      const revokedInvite = await safeStep("revoke_invite_after_relationship_revoke", async () => {
        const { error } = await resolvedClient
          .from("advisor_team_invites")
          .update({
            status: "revoked",
            founder_a_token_hash: null,
            founder_b_token_hash: null,
          })
          .eq("id", row.id);
        if (error) {
          throw new Error(error.message);
        }
        return true;
      });
      if (revokedInvite) {
        const refreshedRow = await loadAdvisorTeamInviteById(row.id, resolvedClient);
        if (refreshedRow) {
          row = refreshedRow;
        }
      }
    }
  } else {
    logAdvisorTeamInviteActivation({
      stage: "ensure_relationship_advisor_skip_missing_context",
      pendingInviteId: row.id,
      invitationId,
      status: row.status,
      founderAUserId: row.founder_a_user_id,
      founderBUserId: row.founder_b_user_id,
      relationshipId,
    });
  }

  const canActivate = Boolean(invitationId && relationshipId && invitationReady && advisorLinkReady);
  if (canActivate && row.status !== "activated") {
    const activated = await safeStep("mark_activated", async () => {
      const { error } = await resolvedClient
        .from("advisor_team_invites")
        .update({
          invitation_id: invitationId,
          relationship_id: relationshipId,
          status: "activated",
          founder_a_token_hash: null,
          founder_b_token_hash: null,
        })
        .eq("id", row.id);
      if (error) {
        throw new Error(error.message);
      }
      return true;
    });
    if (activated) {
      const refreshedRow = await loadAdvisorTeamInviteById(row.id, resolvedClient);
      if (refreshedRow) {
        row = refreshedRow;
      }
      repaired = true;
    }
  } else if (row.status === "activated") {
    logAdvisorTeamInviteActivation({
      stage: "mark_activated_skip_existing",
      pendingInviteId: row.id,
      invitationId,
      status: row.status,
      founderAUserId: row.founder_a_user_id,
      founderBUserId: row.founder_b_user_id,
      relationshipId,
    });
  } else {
    logAdvisorTeamInviteActivation({
      stage: "mark_activated_skip_incomplete",
      pendingInviteId: row.id,
      invitationId,
      status: row.status,
      founderAUserId: row.founder_a_user_id,
      founderBUserId: row.founder_b_user_id,
      relationshipId,
      detail: `invitationReady=${String(invitationReady)} advisorLinkReady=${String(advisorLinkReady)}`,
    });
  }

  return {
    pendingInviteId: row.id,
    invitationId,
    relationshipId,
    activated: row.status === "activated",
    invitationReady,
    advisorLinkReady,
    repaired,
    failures,
  };
}

export async function claimAdvisorTeamInviteFounder(params: {
  token: string;
  userId: string;
  userEmail: string | null | undefined;
}): Promise<ClaimAdvisorTeamInviteResult> {
  const normalizedToken = params.token.trim();
  const normalizedUserId = params.userId.trim();
  const normalizedUserEmail = normalizeEmail(params.userEmail);
  if (!normalizedToken || !normalizedUserId || !normalizedUserEmail) {
    return { ok: false, reason: "not_authenticated" };
  }

  const privileged = createPrivilegedClient();
  if (!privileged) {
    return { ok: false, reason: "service_unavailable" };
  }

  const supabase = await createClient();
  const { data: claimedInviteId, error: claimError } = await supabase.rpc(
    "claim_advisor_team_invite_founder",
    { p_token_hash: hashOpaqueToken(normalizedToken) }
  );

  if (claimError) {
    if (/email_mismatch/i.test(claimError.message)) {
      return { ok: false, reason: "email_mismatch" };
    }
    if (/already_claimed/i.test(claimError.message)) {
      return { ok: false, reason: "already_claimed" };
    }
    // Phase 12C.1A/B: Slot nur mit bestaetigter E-Mail-Adresse.
    if (/email_not_verified/i.test(claimError.message)) {
      return { ok: false, reason: "email_not_verified" };
    }
    return { ok: false, reason: "claim_failed" };
  }

  if (typeof claimedInviteId !== "string" || !claimedInviteId) {
    return { ok: false, reason: "invalid_token" };
  }

  const refreshedRow = await loadAdvisorTeamInviteById(claimedInviteId, privileged);
  if (!refreshedRow) {
    return { ok: false, reason: "claim_failed" };
  }
  const founderSlot =
    refreshedRow.founder_a_user_id === normalizedUserId &&
    normalizeEmail(refreshedRow.founder_a_email) === normalizedUserEmail
      ? "founderA"
      : "founderB";
  logAdvisorTeamInviteActivation({
    stage: "claim_loaded",
    pendingInviteId: refreshedRow.id,
    invitationId: refreshedRow.invitation_id,
    founderSlot,
    currentUserId: normalizedUserId,
    status: refreshedRow.status,
    founderAUserId: refreshedRow.founder_a_user_id,
    founderBUserId: refreshedRow.founder_b_user_id,
    relationshipId: refreshedRow.relationship_id,
  });
  const finalizeResult = await finalizeAdvisorTeamInviteCompletely(refreshedRow, privileged);
  const invitationId = finalizeResult.invitationId;
  if (!invitationId) {
    return { ok: false, reason: "activation_failed" };
  }

  const invitationAfterFinalize = await loadInvitationBootstrapRow(invitationId, privileged);
  if (!invitationAfterFinalize) {
    return { ok: false, reason: "activation_failed" };
  }

  const isCurrentFounderParticipant =
    refreshedRow.founder_a_user_id === normalizedUserId ||
    refreshedRow.founder_b_user_id === normalizedUserId;
  const canContinueThroughBootstrap =
    isCurrentFounderParticipant &&
    invitationAfterFinalize.inviter_user_id === normalizedUserId &&
    !invitationAfterFinalize.invitee_user_id;

  const isInviteeForInvitation =
    invitationAfterFinalize.invitee_user_id === normalizedUserId ||
    normalizeEmail(invitationAfterFinalize.invitee_email) === normalizedUserEmail;

  if (!isInviteeForInvitation && !canContinueThroughBootstrap && !finalizeResult.activated) {
    logAdvisorTeamInviteActivation({
      stage: "claim_continue_guard_failed",
      level: "error",
      pendingInviteId: refreshedRow.id,
      invitationId,
      founderSlot,
      currentUserId: normalizedUserId,
      status: refreshedRow.status,
      founderAUserId: refreshedRow.founder_a_user_id,
      founderBUserId: refreshedRow.founder_b_user_id,
      relationshipId: finalizeResult.relationshipId,
      detail: finalizeResult.failures.join(" | ") || "continue_guard_failed",
    });
    return { ok: false, reason: "activation_failed" };
  }

  return {
    ok: true,
    state: isInviteeForInvitation ? "invitee_continue" : "inviter_continue",
    invitationId,
  };
}

export type RecoverAdvisorTeamInviteResult =
  | { ok: true; invitationId: string; activated: boolean }
  | { ok: false; reason: "not_authenticated" | "service_unavailable" | "invalid_token" | "not_slot_owner" | "recovery_failed" };

/**
 * Phase 12C.1C: Den Abschluss nach einem gescheiterten Slot-Klick erneut anstossen.
 *
 * Nur per ausdruecklichem POST (Server Action), nie beim Seitenaufruf. Der
 * Token oeffnet den Weg nur fuer die Person, die den Slot schon beansprucht
 * hat (Kennung UND Adresse, siehe needsAdvisorTeamInviteRecovery) - keine neue
 * Zustimmung, aber auch keine Token-Wiederverwendung durch Dritte. Der
 * Abschluss selbst ist derselbe idempotente Weg wie im Slot-Klick; er nimmt
 * keine Founder-Einladung an und legt keine Mitgliedschaft an.
 */
export async function recoverAdvisorTeamInviteFounder(params: {
  token: string;
  userId: string;
  userEmail: string | null | undefined;
}): Promise<RecoverAdvisorTeamInviteResult> {
  const normalizedToken = params.token.trim();
  if (!normalizedToken || !params.userId) return { ok: false, reason: "not_authenticated" };

  const privileged = createPrivilegedClient();
  if (!privileged) return { ok: false, reason: "service_unavailable" };

  const lookup = await loadAdvisorTeamInviteByTokenHash(hashOpaqueToken(normalizedToken), privileged);
  if (lookup.status !== "ready") return { ok: false, reason: "invalid_token" };
  if (
    !needsAdvisorTeamInviteRecovery(lookup.row, lookup.founderSlot, {
      userId: params.userId,
      email: params.userEmail,
    })
  ) {
    return { ok: false, reason: "not_slot_owner" };
  }

  const result = await finalizeAdvisorTeamInviteCompletely(lookup.row, privileged);
  logAdvisorTeamInviteActivation({
    stage: "recovery_finalize",
    level: result.invitationId ? "info" : "error",
    pendingInviteId: lookup.row.id,
    invitationId: result.invitationId,
    founderSlot: lookup.founderSlot,
    currentUserId: params.userId,
    status: lookup.row.status,
    founderAUserId: lookup.row.founder_a_user_id,
    founderBUserId: lookup.row.founder_b_user_id,
    relationshipId: result.relationshipId,
    detail: result.failures.join(" | ") || null,
  });
  const bothClaimed = Boolean(lookup.row.founder_a_user_id && lookup.row.founder_b_user_id);
  if (!result.invitationId || (bothClaimed && !result.activated)) {
    return { ok: false, reason: "recovery_failed" };
  }
  return { ok: true, invitationId: result.invitationId, activated: result.activated };
}
