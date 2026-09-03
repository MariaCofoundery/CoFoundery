import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const NETWORK_SIGNUP_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;
const NETWORK_SIGNUP_TTL_MS = 60 * 60 * 1000;

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeNetworkSignupToken(value: string | null | undefined) {
  const token = (value ?? "").trim();
  return NETWORK_SIGNUP_TOKEN_PATTERN.test(token) ? token : null;
}

export async function issueNetworkSignupIntent(email: string) {
  const privileged = createPrivilegedClient();
  if (!privileged) return null;

  const token = randomBytes(32).toString("base64url");
  const emailHash = sha256(normalizeEmail(email));
  const now = new Date();

  await privileged
    .from("network_signup_intents")
    .delete()
    .lt("expires_at", now.toISOString());
  await privileged
    .from("network_signup_intents")
    .delete()
    .eq("email_hash", emailHash);

  const { error } = await privileged.from("network_signup_intents").insert({
    email_hash: emailHash,
    token_hash: sha256(token),
    expires_at: new Date(now.getTime() + NETWORK_SIGNUP_TTL_MS).toISOString(),
  });

  return error ? null : token;
}

export async function revokeNetworkSignupIntent(token: string) {
  const normalized = normalizeNetworkSignupToken(token);
  const privileged = createPrivilegedClient();
  if (!normalized || !privileged) return;
  await privileged
    .from("network_signup_intents")
    .delete()
    .eq("token_hash", sha256(normalized));
}

export async function claimNetworkSignupIntent(
  authenticated: AuthenticatedClient,
  token: string | null | undefined
) {
  const normalized = normalizeNetworkSignupToken(token);
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
