"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PENDING_INVITE_TOKEN_KEY = "pending_invite_token";

type JoinUiState =
  | { type: "loading"; title: string; description: string }
  | { type: "redirecting"; title: string; description: string }
  | {
      type: "error";
      title: string;
      description: string;
      technicalError: string;
    };

function resolveInviteError(message: string) {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("invalid_token")) {
    return {
      title: "Link ungültig",
      description: "Der Einladungslink ist nicht mehr gültig.",
    };
  }

  if (normalized.includes("expired")) {
    return {
      title: "Link abgelaufen",
      description: "Diese Einladung ist abgelaufen.",
    };
  }

  if (normalized.includes("revoked")) {
    return {
      title: "Einladung widerrufen",
      description: "Diese Einladung wurde widerrufen.",
    };
  }

  return {
    title: "Einladung konnte nicht angenommen werden",
    description: "Die Einladung konnte nicht verarbeitet werden.",
  };
}

function readInviteTokenFromParams(searchParams: URLSearchParams) {
  return (searchParams.get("inviteToken") ?? searchParams.get("token") ?? "").trim();
}

function readInvitationIdFromParams(searchParams: URLSearchParams) {
  return (searchParams.get("invitationId") ?? "").trim();
}

function readPendingInviteToken() {
  try {
    return sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function writePendingInviteToken(token: string) {
  try {
    sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
  } catch {
    // Ignore storage issues in restrictive browser contexts.
  }
}

function clearPendingInviteToken() {
  try {
    sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY);
  } catch {
    // Ignore storage issues in restrictive browser contexts.
  }
}

function extractInvitationIdFromAcceptPayload(payload: unknown): string | null {
  if (Array.isArray(payload)) {
    const first = payload[0];
    if (
      first &&
      typeof first === "object" &&
      typeof (first as { invitation_id?: unknown }).invitation_id === "string"
    ) {
      return (first as { invitation_id: string }).invitation_id;
    }
    return null;
  }

  if (
    payload &&
    typeof payload === "object" &&
    typeof (payload as { invitation_id?: unknown }).invitation_id === "string"
  ) {
    return (payload as { invitation_id: string }).invitation_id;
  }

  return null;
}

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const hasRunRef = useRef(false);
  const [uiState, setUiState] = useState<JoinUiState>({
    type: "loading",
    title: "Einladung wird geprüft",
    description: "Wir verarbeiten deinen Einladungslink.",
  });

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const run = async () => {
      const tokenFromUrl = readInviteTokenFromParams(searchParams);
      const invitationIdFromUrl = readInvitationIdFromParams(searchParams);

      if (tokenFromUrl) {
        writePendingInviteToken(tokenFromUrl);
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setUiState({
          type: "error",
          title: "Anmeldung konnte nicht geprüft werden",
          description: "Bitte versuche es erneut.",
          technicalError: sessionError.message,
        });
        return;
      }

      if (!session?.user?.id) {
        const pendingToken = tokenFromUrl || readPendingInviteToken();
        if (pendingToken) {
          writePendingInviteToken(pendingToken);
        }

        const nextPath = pendingToken
          ? `/join?token=${encodeURIComponent(pendingToken)}`
          : invitationIdFromUrl
            ? `/join?invitationId=${encodeURIComponent(invitationIdFromUrl)}`
            : "/join";
        setUiState({
          type: "redirecting",
          title: "Weiter zum Login",
          description: "Bitte melde dich per Magic Link an, danach wird die Einladung automatisch fortgesetzt.",
        });
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      let resolvedInvitationId = invitationIdFromUrl;
      const token = tokenFromUrl || readPendingInviteToken();

      if (token) {
        const { data, error } = await supabase.rpc("accept_invitation", {
          p_token: token,
        });

        if (error) {
          const normalizedError = error.message.trim().toLowerCase();
          if (
            normalizedError.includes("auth session missing") ||
            normalizedError.includes("not_authenticated")
          ) {
            writePendingInviteToken(token);
            const nextPath = `/join?token=${encodeURIComponent(token)}`;
            router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
            return;
          }

          const mapped = resolveInviteError(error.message);
          if (
            normalizedError.includes("invalid_token") ||
            normalizedError.includes("expired") ||
            normalizedError.includes("revoked")
          ) {
            clearPendingInviteToken();
          }
          setUiState({
            type: "error",
            title: mapped.title,
            description: mapped.description,
            technicalError: error.message,
          });
          return;
        }

        clearPendingInviteToken();
        resolvedInvitationId = extractInvitationIdFromAcceptPayload(data) ?? resolvedInvitationId;
      }

      if (!resolvedInvitationId) {
        setUiState({
          type: "error",
          title: "Link ungültig",
          description: "Es wurde keine Einladung gefunden.",
          technicalError: "missing_invitation_context",
        });
        return;
      }

      router.replace(`/join/welcome?invitationId=${encodeURIComponent(resolvedInvitationId)}`);
    };

    void run();
  }, [router, searchParams, supabase]);

  /*
   * Testplan:
   * 1) Inkognito-Fenster öffnen.
   * 2) Einladung über /join?token=... öffnen.
   * 3) Magic Link Login auslösen und zurückkehren.
   * 4) Weiterleitung auf /join/welcome?invitationId=... prüfen.
   */

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">{uiState.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{uiState.description}</p>

        {uiState.type === "error" ? (
          <>
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Falls der Link wirklich abgelaufen ist, bitte die einladende Person um eine neue Einladung.
            </p>
            <p className="mt-3 text-xs text-slate-500">Technischer Hinweis: {uiState.technicalError}</p>
            <a
              href="/dashboard"
              className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              Zum Dashboard
            </a>
          </>
        ) : null}
      </div>
    </main>
  );
}
