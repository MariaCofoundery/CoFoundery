import "server-only";

import { createHash, randomBytes } from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { bindLatestSubmittedInvitationMatchingInputs } from "@/features/assessments/matchingBindings";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;

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
  founder_a_token_hash: string;
  founder_b_token_hash: string;
  invitation_id: string | null;
  relationship_id: string | null;
  status: "pending" | "activated" | "revoked";
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
};

type InvitationBootstrapRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  invitee_email: string;
  status: string;
  accepted_at: string | null;
  relationship_id: string | null;
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
  status: "pending";
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
      "id, advisor_user_id, advisor_email, advisor_name, team_name, founder_a_email, founder_b_email, founder_a_user_id, founder_b_user_id, founder_a_claimed_at, founder_b_claimed_at, founder_a_token_hash, founder_b_token_hash, invitation_id, relationship_id, status, created_at, updated_at"
    )
    .eq("advisor_user_id", normalizedUserId)
    .eq("status", "pending")
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
      status: "pending",
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
      "id, advisor_user_id, advisor_email, advisor_name, team_name, founder_a_email, founder_b_email, founder_a_user_id, founder_b_user_id, founder_a_claimed_at, founder_b_claimed_at, founder_a_token_hash, founder_b_token_hash, invitation_id, relationship_id, status, created_at, updated_at"
    )
    .or(`founder_a_token_hash.eq.${tokenHash},founder_b_token_hash.eq.${tokenHash}`)
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
      "id, advisor_user_id, advisor_email, advisor_name, team_name, founder_a_email, founder_b_email, founder_a_user_id, founder_b_user_id, founder_a_claimed_at, founder_b_claimed_at, founder_a_token_hash, founder_b_token_hash, invitation_id, relationship_id, status, created_at, updated_at"
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
      status: "active",
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
    .select("id, inviter_user_id, invitee_user_id, invitee_email, status, accepted_at, relationship_id")
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
  const [{ data: inviterProfile }, existingInvitation] = await Promise.all([
    params.client
      .from("profiles")
      .select("display_name")
      .eq("user_id", params.inviterUserId)
      .maybeSingle(),
    params.row.invitation_id
      ? loadInvitationBootstrapRow(params.row.invitation_id, params.client)
      : Promise.resolve(null),
  ]);

  if (existingInvitation?.id) {
    return existingInvitation.id;
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
    .select("id")
    .eq("source_invitation_id", params.invitationId)
    .eq("advisor_user_id", params.row.advisor_user_id)
    .limit(1)
    .maybeSingle();

  const { data: existingByRelationship } = existingByInvitation
    ? { data: null }
    : await params.client
    .from("relationship_advisors")
    .select("id")
    .eq("relationship_id", params.relationshipId)
    .eq("advisor_user_id", params.row.advisor_user_id)
    .limit(1)
    .maybeSingle();

  const existingRelationshipAdvisor = existingByInvitation ?? existingByRelationship;

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
    return;
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

function resolveExpectedInviteeUserId(
  invitation: InvitationBootstrapRow,
  row: AdvisorTeamInviteRow
) {
  const invitationInviteeEmail = normalizeEmail(invitation.invitee_email);
  if (invitationInviteeEmail === normalizeEmail(row.founder_a_email)) {
    return row.founder_a_user_id;
  }
  if (invitationInviteeEmail === normalizeEmail(row.founder_b_email)) {
    return row.founder_b_user_id;
  }
  if (invitation.inviter_user_id === row.founder_a_user_id) {
    return row.founder_b_user_id;
  }
  if (invitation.inviter_user_id === row.founder_b_user_id) {
    return row.founder_a_user_id;
  }
  return null;
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
      invitation &&
        invitation.status === "accepted" &&
        invitation.invitee_user_id &&
        invitation.relationship_id
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

  if (invitation && bothFoundersClaimed && relationshipId) {
    const currentInvitation = invitation;
    const expectedInviteeUserId = resolveExpectedInviteeUserId(invitation, row);
    const invitationNeedsUpdate =
      currentInvitation.status !== "accepted" ||
      currentInvitation.invitee_user_id !== expectedInviteeUserId ||
      currentInvitation.relationship_id !== relationshipId ||
      !currentInvitation.accepted_at;

    if (expectedInviteeUserId && invitationNeedsUpdate) {
      const updatedInvitation = await safeStep("ensure_invitation_accepted", async () => {
        const nextAcceptedAt = currentInvitation.accepted_at ?? new Date().toISOString();
        const { error } = await resolvedClient
          .from("invitations")
          .update({
            invitee_user_id: expectedInviteeUserId,
            accepted_at: nextAcceptedAt,
            status: "accepted",
            relationship_id: relationshipId,
          })
          .eq("id", currentInvitation.id);

        if (error) {
          throw new Error(error.message);
        }

        const refreshedInvitation = await loadInvitationBootstrapRow(currentInvitation.id, resolvedClient);
        if (!refreshedInvitation) {
          throw new Error("invitation_reload_failed");
        }
        return refreshedInvitation;
      });
      if (updatedInvitation) {
        invitation = updatedInvitation;
        repaired = true;
      }
    } else if (expectedInviteeUserId) {
      logAdvisorTeamInviteActivation({
        stage: "ensure_invitation_accepted_skip_existing",
        pendingInviteId: row.id,
        invitationId,
        status: row.status,
        founderAUserId: row.founder_a_user_id,
        founderBUserId: row.founder_b_user_id,
        relationshipId,
      });
    } else {
      failures.push("ensure_invitation_accepted:missing_expected_invitee");
      logAdvisorTeamInviteActivation({
        stage: "ensure_invitation_accepted",
        level: "error",
        pendingInviteId: row.id,
        invitationId,
        status: row.status,
        founderAUserId: row.founder_a_user_id,
        founderBUserId: row.founder_b_user_id,
        relationshipId,
        detail: "missing_expected_invitee",
      });
    }
  }

  const invitationReady = Boolean(
    invitation &&
      invitation.status === "accepted" &&
      invitation.invitee_user_id &&
      invitation.relationship_id
  );

  if (invitationId && relationshipId) {
    const linkedAdvisor = await safeStep("ensure_relationship_advisor", async () => {
      await upsertRelationshipAdvisorLink({
        row,
        relationshipId,
        invitationId,
        client: resolvedClient,
      });
      return true;
    });
    advisorLinkReady = Boolean(linkedAdvisor);
    if (advisorLinkReady) {
      repaired = true;
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

  const inviteLookup = await loadAdvisorTeamInviteByTokenHash(
    hashOpaqueToken(normalizedToken),
    privileged
  );

  if (inviteLookup.status !== "ready") {
    return { ok: false, reason: "invalid_token" };
  }

  const { row, founderSlot, slotEmail } = inviteLookup;
  if (row.status === "revoked") {
    return { ok: false, reason: "invalid_token" };
  }

  if (normalizedUserEmail !== normalizeEmail(slotEmail)) {
    return { ok: false, reason: "email_mismatch" };
  }

  const slotUserIdKey = founderSlot === "founderA" ? "founder_a_user_id" : "founder_b_user_id";
  const slotClaimedAtKey = founderSlot === "founderA" ? "founder_a_claimed_at" : "founder_b_claimed_at";
  const existingSlotUserId =
    founderSlot === "founderA" ? row.founder_a_user_id : row.founder_b_user_id;
  const existingClaimedAt =
    founderSlot === "founderA" ? row.founder_a_claimed_at : row.founder_b_claimed_at;

  if (existingSlotUserId && existingSlotUserId !== normalizedUserId) {
    return { ok: false, reason: "already_claimed" };
  }

  if (!existingSlotUserId) {
    const { error: claimError } = await privileged
      .from("advisor_team_invites")
      .update({
        [slotUserIdKey]: normalizedUserId,
        [slotClaimedAtKey]: existingClaimedAt ?? new Date().toISOString(),
      })
      .eq("id", row.id);

    if (claimError) {
      return { ok: false, reason: "claim_failed" };
    }
  }

  const refreshedLookup = await loadAdvisorTeamInviteByTokenHash(
    hashOpaqueToken(normalizedToken),
    privileged
  );

  if (refreshedLookup.status !== "ready") {
    return { ok: false, reason: "claim_failed" };
  }

  const refreshedRow = refreshedLookup.row;
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
  const finalizeResult = await finalizeAdvisorTeamInviteIfPossible(refreshedRow, privileged);
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
