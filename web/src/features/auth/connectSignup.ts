import "server-only";

import { createHash } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const CONNECT_SIGNUP_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

type AuthenticatedClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string | null } | null };
      error: { message?: string | null } | null;
    }>;
  };
};

function createPrivilegedClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeConnectSignupToken(value: string | null | undefined) {
  const token = (value ?? "").trim();
  return CONNECT_SIGNUP_TOKEN_PATTERN.test(token) ? token : null;
}

export async function revokeConnectSignupIntent(token: string) {
  const normalized = normalizeConnectSignupToken(token);
  const privileged = createPrivilegedClient();
  if (!normalized || !privileged) return;
  await privileged
    .from("network_signup_intents")
    .delete()
    .eq("token_hash", sha256(normalized));
}

export async function claimConnectSignupIntent(
  authenticated: AuthenticatedClient,
  token: string | null | undefined
) {
  const normalized = normalizeConnectSignupToken(token);
  if (!normalized) return false;

  const {
    data: { user },
    error: authError,
  } = await authenticated.auth.getUser();
  const privileged = createPrivilegedClient();
  if (authError || !user?.id || !privileged) return false;

  const { data, error } = await privileged.rpc("claim_network_signup_intent", {
    p_user_id: user.id,
    p_token_hash: sha256(normalized),
  });

  return !error && data === true;
}
