export const INVITE_FLOW_DEBUG_ENABLED = process.env.NODE_ENV !== "production";

type InviteFlowDebugPayload = Record<string, unknown>;

function serializePayload(payload: InviteFlowDebugPayload) {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function logInviteFlowDebug(scope: string, payload: InviteFlowDebugPayload) {
  if (!INVITE_FLOW_DEBUG_ENABLED) return;
  console.log(`[invite-flow] ${scope}\n${serializePayload(payload)}`);
}

export function inviteFlowDebugQueryEnabled(value: string | null | undefined) {
  if (!INVITE_FLOW_DEBUG_ENABLED) return false;
  return value === "1" || value === "true";
}
