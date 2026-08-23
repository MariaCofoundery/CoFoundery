export const INVITE_FLOW_DEBUG_ENABLED = process.env.NODE_ENV !== "production";

type InviteFlowDebugPayload = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN = /(?:token|secret|authorization|cookie)/i;

function redactUrl(value: string) {
  try {
    const url = new URL(value, "https://cofoundery.local");
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        url.searchParams.set(key, "[REDACTED]");
      } else {
        const nestedValue = url.searchParams.get(key);
        if (nestedValue && nestedValue.startsWith("/")) {
          url.searchParams.set(key, redactUrl(nestedValue));
        }
      }
    }
    url.pathname = url.pathname.replace(
      /(\/(?:advisor\/invite|team-invite)\/)[^/]+/i,
      "$1[REDACTED]"
    );
    return value.startsWith("http")
      ? url.toString()
      : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "[REDACTED_URL]";
  }
}

function redactPayload(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactPayload(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([nestedKey, nestedValue]) => [
        nestedKey,
        redactPayload(nestedValue, nestedKey),
      ])
    );
  }
  if (typeof value === "string" && /^(?:https?:\/\/|\/)/.test(value)) {
    return redactUrl(value);
  }
  return value;
}

function serializePayload(payload: InviteFlowDebugPayload) {
  try {
    return JSON.stringify(redactPayload(payload), null, 2);
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
