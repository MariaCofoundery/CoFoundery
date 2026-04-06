import { createClient } from "@/lib/supabase/server";

export type AssessmentModule = "base" | "values";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type SupabaseLikeClient = Pick<SupabaseServerClient, "from">;

export type InvitationParticipantRow = {
  id: string;
  inviter_user_id: string;
  invitee_user_id: string | null;
  team_context?: string | null;
  status: string;
  expires_at: string;
  revoked_at: string | null;
  accepted_at?: string | null;
};

type InvitationModuleRow = {
  module: string;
};

type InvitationMatchingInputRow = {
  id: string;
  invitation_id: string;
  user_id: string;
  module: string;
  assessment_id: string;
  created_at: string;
  updated_at: string;
};

export type AssessmentRow = {
  id: string;
  user_id: string;
  module: string;
  submitted_at: string | null;
  created_at: string;
};

export type InvitationMatchingBinding = {
  id: string;
  invitationId: string;
  userId: string;
  module: AssessmentModule;
  assessmentId: string;
  createdAt: string;
  updatedAt: string;
  assessmentSubmittedAt: string | null;
  assessmentCreatedAt: string;
};

export type InvitationMatchingState = {
  invitation: InvitationParticipantRow | null;
  requiredModules: AssessmentModule[];
  bindings: InvitationMatchingBinding[];
  bindingsByUser: Map<string, Map<AssessmentModule, InvitationMatchingBinding>>;
  latestSubmittedByUser: Map<string, Map<AssessmentModule, AssessmentRow>>;
};

type EnsureInvitationMatchingBindingOptions = {
  client?: SupabaseLikeClient;
  assessmentId?: string | null;
  allowLatestSubmitted?: boolean;
  createDraftIfMissing?: boolean;
  replaceExisting?: boolean;
};

type BindLatestSubmittedOptions = {
  client?: SupabaseLikeClient;
  replaceExisting?: boolean;
};

function coerceAssessmentModule(value: string | null | undefined): AssessmentModule | null {
  if (value === "base" || value === "values") return value;
  return null;
}

function ensureBaseModule(modules: AssessmentModule[]): AssessmentModule[] {
  if (modules.includes("base")) {
    return modules;
  }
  return ["base", ...modules];
}

function isInvitationExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const timestamp = Date.parse(expiresAt);
  if (Number.isNaN(timestamp)) return false;
  return timestamp < Date.now();
}

async function resolveClient(client?: SupabaseLikeClient) {
  if (client) {
    return client;
  }
  return createClient();
}

async function getInvitationParticipantRow(
  invitationId: string,
  client?: SupabaseLikeClient
): Promise<InvitationParticipantRow | null> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("invitations")
    .select(
      "id, inviter_user_id, invitee_user_id, team_context, status, expires_at, revoked_at, accepted_at"
    )
    .eq("id", invitationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as InvitationParticipantRow;
}

export async function getRequiredModulesForInvitation(
  invitationId: string,
  client?: SupabaseLikeClient
): Promise<AssessmentModule[]> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("invitation_modules")
    .select("module")
    .eq("invitation_id", invitationId);

  if (error || !data) {
    return ["base"];
  }

  const modules = [...new Set((data as InvitationModuleRow[]).map((row) => coerceAssessmentModule(row.module)).filter(Boolean))] as AssessmentModule[];
  return ensureBaseModule(modules);
}

async function getAssessmentsByIds(
  assessmentIds: string[],
  client?: SupabaseLikeClient
): Promise<Map<string, AssessmentRow>> {
  const normalizedIds = [...new Set(assessmentIds.filter(Boolean))];
  if (normalizedIds.length === 0) {
    return new Map<string, AssessmentRow>();
  }

  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("assessments")
    .select("id, user_id, module, submitted_at, created_at")
    .in("id", normalizedIds);

  if (error || !data) {
    return new Map<string, AssessmentRow>();
  }

  return new Map((data as AssessmentRow[]).map((row) => [row.id, row]));
}

export async function getLatestSubmittedAssessmentForUserModule(
  userId: string,
  module: AssessmentModule,
  client?: SupabaseLikeClient
): Promise<AssessmentRow | null> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) {
    return null;
  }

  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("assessments")
    .select("id, user_id, module, submitted_at, created_at")
    .eq("user_id", normalizedUserId)
    .eq("module", module)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AssessmentRow;
}

async function getAssessmentForUserModule(
  userId: string,
  module: AssessmentModule,
  assessmentId: string,
  client?: SupabaseLikeClient
): Promise<AssessmentRow | null> {
  const normalizedAssessmentId = assessmentId.trim();
  if (!normalizedAssessmentId) {
    return null;
  }

  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("assessments")
    .select("id, user_id, module, submitted_at, created_at")
    .eq("id", normalizedAssessmentId)
    .eq("user_id", userId)
    .eq("module", module)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AssessmentRow;
}

async function createDraftAssessmentForUserModule(
  userId: string,
  module: AssessmentModule,
  client?: SupabaseLikeClient
): Promise<AssessmentRow> {
  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("assessments")
    .insert({ user_id: userId, module })
    .select("id, user_id, module, submitted_at, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "matching_draft_create_failed");
  }

  return data as AssessmentRow;
}

function buildBindingsByUser(
  bindings: InvitationMatchingBinding[]
): Map<string, Map<AssessmentModule, InvitationMatchingBinding>> {
  const byUser = new Map<string, Map<AssessmentModule, InvitationMatchingBinding>>();

  for (const binding of bindings) {
    const byModule = byUser.get(binding.userId) ?? new Map<AssessmentModule, InvitationMatchingBinding>();
    byModule.set(binding.module, binding);
    byUser.set(binding.userId, byModule);
  }

  return byUser;
}

async function getLatestSubmittedAssessmentsByUsers(
  userIds: string[],
  client?: SupabaseLikeClient
): Promise<Map<string, Map<AssessmentModule, AssessmentRow>>> {
  const normalizedUserIds = [...new Set(userIds.filter(Boolean))];
  if (normalizedUserIds.length === 0) {
    return new Map<string, Map<AssessmentModule, AssessmentRow>>();
  }

  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("assessments")
    .select("id, user_id, module, submitted_at, created_at")
    .in("user_id", normalizedUserIds)
    .in("module", ["base", "values"])
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error || !data) {
    return new Map<string, Map<AssessmentModule, AssessmentRow>>();
  }

  const byUser = new Map<string, Map<AssessmentModule, AssessmentRow>>();
  for (const row of data as AssessmentRow[]) {
    const moduleKey = coerceAssessmentModule(row.module);
    if (!row.user_id || !moduleKey) continue;

    const byModule = byUser.get(row.user_id) ?? new Map<AssessmentModule, AssessmentRow>();
    if (!byModule.has(moduleKey)) {
      byModule.set(moduleKey, {
        ...row,
        module: moduleKey,
      });
      byUser.set(row.user_id, byModule);
    }
  }

  return byUser;
}

export async function getInvitationMatchingBindings(
  invitationId: string,
  client?: SupabaseLikeClient
): Promise<InvitationMatchingBinding[]> {
  const normalizedInvitationId = invitationId.trim();
  if (!normalizedInvitationId) {
    return [];
  }

  const supabase = await resolveClient(client);
  const { data, error } = await supabase
    .from("invitation_matching_inputs")
    .select("id, invitation_id, user_id, module, assessment_id, created_at, updated_at")
    .eq("invitation_id", normalizedInvitationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  const bindingRows = (data as InvitationMatchingInputRow[]).filter(
    (row) => coerceAssessmentModule(row.module) !== null
  );
  const assessmentById = await getAssessmentsByIds(
    bindingRows.map((row) => row.assessment_id),
    supabase
  );

  return bindingRows.flatMap((row) => {
    const moduleKey = coerceAssessmentModule(row.module);
    const assessment = assessmentById.get(row.assessment_id);
    if (!moduleKey || !assessment) {
      return [];
    }

    return [
      {
        id: row.id,
        invitationId: row.invitation_id,
        userId: row.user_id,
        module: moduleKey,
        assessmentId: row.assessment_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        assessmentSubmittedAt: assessment.submitted_at,
        assessmentCreatedAt: assessment.created_at,
      },
    ];
  });
}

export async function getInvitationMatchingState(
  invitationId: string,
  options?: { client?: SupabaseLikeClient }
): Promise<InvitationMatchingState> {
  const normalizedInvitationId = invitationId.trim();
  const supabase = await resolveClient(options?.client);
  const invitation = normalizedInvitationId
    ? await getInvitationParticipantRow(normalizedInvitationId, supabase)
    : null;
  const requiredModules = invitation
    ? await getRequiredModulesForInvitation(normalizedInvitationId, supabase)
    : (["base"] as AssessmentModule[]);
  const bindings = invitation
    ? await getInvitationMatchingBindings(normalizedInvitationId, supabase)
    : [];
  const bindingsByUser = buildBindingsByUser(bindings);
  const relevantUsers = invitation
    ? [invitation.inviter_user_id, invitation.invitee_user_id].filter(
        (value): value is string => typeof value === "string" && value.length > 0
      )
    : [];
  const latestSubmittedByUser = await getLatestSubmittedAssessmentsByUsers(relevantUsers, supabase);

  return {
    invitation,
    requiredModules,
    bindings,
    bindingsByUser,
    latestSubmittedByUser,
  };
}

export async function ensureInvitationMatchingBinding(
  invitationId: string,
  userId: string,
  module: AssessmentModule,
  options?: EnsureInvitationMatchingBindingOptions
): Promise<InvitationMatchingBinding> {
  const normalizedInvitationId = invitationId.trim();
  const normalizedUserId = userId.trim();
  if (!normalizedInvitationId || !normalizedUserId) {
    throw new Error("invalid_matching_binding_params");
  }

  const supabase = await resolveClient(options?.client);
  const invitation = await getInvitationParticipantRow(normalizedInvitationId, supabase);
  if (!invitation) {
    throw new Error("invitation_not_found");
  }
  if (!([invitation.inviter_user_id, invitation.invitee_user_id].includes(normalizedUserId))) {
    throw new Error("user_not_invitation_participant");
  }
  if (invitation.revoked_at || invitation.status === "revoked") {
    throw new Error("invitation_revoked");
  }
  if (isInvitationExpired(invitation.expires_at)) {
    throw new Error("invitation_expired");
  }

  const existingBindings = await getInvitationMatchingBindings(normalizedInvitationId, supabase);
  const existing = existingBindings.find(
    (binding) => binding.userId === normalizedUserId && binding.module === module
  );
  if (existing && options?.replaceExisting !== true) {
    return existing;
  }

  let assessment: AssessmentRow | null = null;
  if (options?.assessmentId?.trim()) {
    assessment = await getAssessmentForUserModule(
      normalizedUserId,
      module,
      options.assessmentId,
      supabase
    );
    if (!assessment) {
      throw new Error("assessment_not_found_for_binding");
    }
  } else if (options?.allowLatestSubmitted) {
    assessment = await getLatestSubmittedAssessmentForUserModule(normalizedUserId, module, supabase);
    if (!assessment && options.createDraftIfMissing !== true) {
      throw new Error("submitted_assessment_not_found_for_binding");
    }
  }

  if (!assessment && options?.createDraftIfMissing !== false) {
    assessment = await createDraftAssessmentForUserModule(normalizedUserId, module, supabase);
  }

  if (!assessment) {
    throw new Error("matching_assessment_not_resolved");
  }

  const { data, error } = await supabase
    .from("invitation_matching_inputs")
    .upsert(
      {
        invitation_id: normalizedInvitationId,
        user_id: normalizedUserId,
        module,
        assessment_id: assessment.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "invitation_id,user_id,module" }
    )
    .select("id, invitation_id, user_id, module, assessment_id, created_at, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "matching_binding_upsert_failed");
  }

  const moduleKey = coerceAssessmentModule((data as InvitationMatchingInputRow).module);
  if (!moduleKey) {
    throw new Error("matching_binding_invalid_module");
  }

  return {
    id: (data as InvitationMatchingInputRow).id,
    invitationId: (data as InvitationMatchingInputRow).invitation_id,
    userId: (data as InvitationMatchingInputRow).user_id,
    module: moduleKey,
    assessmentId: (data as InvitationMatchingInputRow).assessment_id,
    createdAt: (data as InvitationMatchingInputRow).created_at,
    updatedAt: (data as InvitationMatchingInputRow).updated_at,
    assessmentSubmittedAt: assessment.submitted_at,
    assessmentCreatedAt: assessment.created_at,
  };
}

export async function bindLatestSubmittedInvitationMatchingInputs(
  invitationId: string,
  userId: string,
  modules: AssessmentModule[],
  options?: BindLatestSubmittedOptions
): Promise<InvitationMatchingBinding[]> {
  const uniqueModules = [...new Set(modules)];
  const bindings: InvitationMatchingBinding[] = [];

  for (const module of uniqueModules) {
    const latestSubmitted = await getLatestSubmittedAssessmentForUserModule(
      userId,
      module,
      options?.client
    );
    if (!latestSubmitted) {
      continue;
    }

    const binding = await ensureInvitationMatchingBinding(invitationId, userId, module, {
      client: options?.client,
      assessmentId: latestSubmitted.id,
      allowLatestSubmitted: false,
      createDraftIfMissing: false,
      replaceExisting: options?.replaceExisting === true,
    });
    bindings.push(binding);
  }

  return bindings;
}
