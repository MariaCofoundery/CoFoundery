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
  status: "pending" | "activating" | "activated" | "revoked";
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
  status: "pending" | "activating";
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

function buildPendingProgressLabel(row: AdvisorTeamInviteRow) {
  const startedCount = Number(Boolean(row.founder_a_claimed_at)) + Number(Boolean(row.founder_b_claimed_at));
  if (startedCount === 0) {
    return "Noch nicht gestartet";
  }
  if (startedCount === 1) {
    return "1 von 2 Founder hat gestartet";
  }
  return row.status === "activating" ? "Team wird verknüpft" : "Beide Founder haben gestartet";
}

function buildPendingNextStepLabel(row: AdvisorTeamInviteRow) {
  if (!row.founder_a_claimed_at && !row.founder_b_claimed_at) {
    return "Wartet auf den ersten Start";
  }
  if (!row.founder_a_claimed_at || !row.founder_b_claimed_at) {
    return "Wartet auf den zweiten Founder";
  }
  return row.status === "activating"
    ? "Dashboard verknüpft das Team gerade"
    : "Das Team wechselt gleich in die begleiteten Teams";
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
    .in("status", ["pending", "activating"])
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
      status: row.status === "activating" ? "activating" : "pending",
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

async function createAcceptedInvitationForAdvisorTeam(params: {
  row: AdvisorTeamInviteRow;
  relationshipId: string;
  client: SupabaseLikeClient;
}) {
  const founderAUserId = params.row.founder_a_user_id;
  const founderBUserId = params.row.founder_b_user_id;
  if (!founderAUserId || !founderBUserId) {
    throw new Error("missing_founders");
  }

  const [{ data: founderAProfile }, { data: existingInvitation }] = await Promise.all([
    params.client
      .from("profiles")
      .select("display_name")
      .eq("user_id", founderAUserId)
      .maybeSingle(),
    params.client
      .from("invitations")
      .select("id")
      .eq("relationship_id", params.relationshipId)
      .eq("inviter_user_id", founderAUserId)
      .eq("invitee_user_id", founderBUserId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (existingInvitation) {
    return (existingInvitation as InsertedInvitationRow).id;
  }

  const token = createOpaqueToken();
  const tokenHash = hashOpaqueToken(token);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const inviterDisplayName =
    (founderAProfile as { display_name?: string | null } | null)?.display_name?.trim() ||
    fallbackLabelFromEmail(params.row.founder_a_email);

  const { data: insertedInvitation, error: insertedInvitationError } = await params.client
    .from("invitations")
    .insert({
      inviter_user_id: founderAUserId,
      invitee_user_id: founderBUserId,
      invitee_email: params.row.founder_b_email,
      label: normalizeTeamName(params.row.team_name) ?? params.row.founder_b_email,
      inviter_display_name: inviterDisplayName,
      inviter_email: params.row.founder_a_email,
      team_context: "pre_founder",
      token_hash: tokenHash,
      expires_at: expiresAt,
      accepted_at: new Date().toISOString(),
      status: "accepted",
      relationship_id: params.relationshipId,
    })
    .select("id")
    .single();

  if (insertedInvitationError || !insertedInvitation) {
    throw new Error(insertedInvitationError?.message ?? "invitation_create_failed");
  }

  const invitationId = (insertedInvitation as InsertedInvitationRow).id;
  const { error: moduleError } = await params.client.from("invitation_modules").insert({
    invitation_id: invitationId,
    module: "base",
  });

  if (moduleError) {
    throw new Error(moduleError.message);
  }

  await Promise.all([
    bindLatestSubmittedInvitationMatchingInputs(invitationId, founderAUserId, ["base"], {
      client: params.client,
      replaceExisting: false,
    }).catch(() => null),
    bindLatestSubmittedInvitationMatchingInputs(invitationId, founderBUserId, ["base"], {
      client: params.client,
      replaceExisting: false,
    }).catch(() => null),
  ]);

  return invitationId;
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

async function activateBootstrapInvitationForAdvisorTeam(params: {
  row: AdvisorTeamInviteRow;
  invitationId: string;
  client: SupabaseLikeClient;
}) {
  const founderAUserId = params.row.founder_a_user_id;
  const founderBUserId = params.row.founder_b_user_id;
  if (!founderAUserId || !founderBUserId) {
    throw new Error("missing_founders");
  }

  const invitation = await loadInvitationBootstrapRow(params.invitationId, params.client);
  if (!invitation) {
    throw new Error("bootstrap_invitation_not_found");
  }

  const relationshipId =
    invitation.relationship_id ??
    params.row.relationship_id ??
    (await resolveRelationshipIdForFounders(founderAUserId, founderBUserId, params.client));
  const inviteeUserId =
    normalizeEmail(invitation.invitee_email) === normalizeEmail(params.row.founder_a_email)
      ? founderAUserId
      : founderBUserId;

  const { error: invitationUpdateError } = await params.client
    .from("invitations")
    .update({
      invitee_user_id: inviteeUserId,
      accepted_at: invitation.accepted_at ?? new Date().toISOString(),
      status: "accepted",
      relationship_id: relationshipId,
    })
    .eq("id", params.invitationId);

  if (invitationUpdateError) {
    throw new Error(invitationUpdateError.message);
  }

  await upsertRelationshipAdvisorLink({
    row: params.row,
    relationshipId,
    invitationId: params.invitationId,
    client: params.client,
  });

  const { error: finalizeError } = await params.client
    .from("advisor_team_invites")
    .update({
      relationship_id: relationshipId,
      invitation_id: params.invitationId,
      status: "activated",
    })
    .eq("id", params.row.id);

  if (finalizeError) {
    throw new Error(finalizeError.message);
  }

  return {
    invitationId: params.invitationId,
    relationshipId,
  };
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

  const payload = {
    relationship_id: params.relationshipId,
    advisor_user_id: params.row.advisor_user_id,
    advisor_name: params.row.advisor_name,
    advisor_email: params.row.advisor_email,
    status: "linked",
    founder_a_approved: true,
    founder_b_approved: true,
    approved_at: new Date().toISOString(),
    invited_at: params.row.created_at,
    linked_at: new Date().toISOString(),
    revoked_at: null,
    requested_by_user_id: null,
    source_invitation_id: params.invitationId,
    invite_token_hash: null,
  };

  const writeQuery = existingRelationshipAdvisor
    ? params.client
        .from("relationship_advisors")
        .update(payload)
        .eq("id", (existingRelationshipAdvisor as ExistingRelationshipAdvisorRow).id)
    : params.client.from("relationship_advisors").insert(payload);

  const { error } = await writeQuery.select("id").maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
}

async function activateAdvisorTeamInviteRow(
  row: AdvisorTeamInviteRow,
  client: SupabaseLikeClient
) {
  if (row.invitation_id) {
    return {
      invitationId: row.invitation_id,
      relationshipId: row.relationship_id,
    };
  }

  const founderAUserId = row.founder_a_user_id;
  const founderBUserId = row.founder_b_user_id;
  if (!founderAUserId || !founderBUserId) {
    throw new Error("missing_founders");
  }

  const relationshipId =
    row.relationship_id ?? (await resolveRelationshipIdForFounders(founderAUserId, founderBUserId, client));
  const invitationId = await createAcceptedInvitationForAdvisorTeam({
    row,
    relationshipId,
    client,
  });

  await upsertRelationshipAdvisorLink({
    row,
    relationshipId,
    invitationId,
    client,
  });

  const { error: finalizeError } = await client
    .from("advisor_team_invites")
    .update({
      relationship_id: relationshipId,
      invitation_id: invitationId,
      status: "activated",
    })
    .eq("id", row.id);

  if (finalizeError) {
    throw new Error(finalizeError.message);
  }

  return {
    invitationId,
    relationshipId,
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
  let invitationId = refreshedRow.invitation_id;
  if (!invitationId) {
    const inviteeEmail =
      founderSlot === "founderA" ? refreshedRow.founder_b_email : refreshedRow.founder_a_email;
    try {
      invitationId = await createBootstrapInvitationForAdvisorTeam({
        row: refreshedRow,
        inviterUserId: normalizedUserId,
        inviterEmail: normalizedUserEmail,
        inviteeEmail,
        client: privileged,
      });
    } catch {
      return { ok: false, reason: "activation_failed" };
    }
  }

  const bothFoundersClaimed = Boolean(refreshedRow.founder_a_user_id && refreshedRow.founder_b_user_id);
  const invitationBeforeFinalize = await loadInvitationBootstrapRow(invitationId, privileged);
  if (!invitationBeforeFinalize) {
    return { ok: false, reason: "activation_failed" };
  }

  if (bothFoundersClaimed && refreshedRow.status !== "activated") {
    try {
      await activateBootstrapInvitationForAdvisorTeam({
        row: refreshedRow,
        invitationId,
        client: privileged,
      });
    } catch {
      return { ok: false, reason: "activation_failed" };
    }
  }

  const invitationAfterFinalize = await loadInvitationBootstrapRow(invitationId, privileged);
  if (!invitationAfterFinalize) {
    return { ok: false, reason: "activation_failed" };
  }

  const isInviteeForInvitation =
    invitationAfterFinalize.invitee_user_id === normalizedUserId ||
    normalizeEmail(invitationAfterFinalize.invitee_email) === normalizedUserEmail;

  return {
    ok: true,
    state: isInviteeForInvitation ? "invitee_continue" : "inviter_continue",
    invitationId,
  };
}
