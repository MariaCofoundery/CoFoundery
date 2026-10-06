"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { logInviteFlowDebug } from "@/features/onboarding/inviteFlowDebug";
import { createClient } from "@/lib/supabase/client";

type JoinUiState =
  | { type: "loading"; title: string; description: string }
  // Phase 11.7B: Beitritt mit ausdruecklicher Wahl - keine Vorauswahl.
  // Phase 12C.0: token=null, wenn die Einladung aus dem Konto heraus geoeffnet
  // wird (Dashboard, Verbindungen) - dann identifiziert sie die invitationId.
  | { type: "choice"; token: string | null; invitationId: string; busy: boolean }
  | { type: "redirecting"; title: string; description: string }
  | {
      type: "error";
      title: string;
      description: string;
      technicalError: string;
    };

function resolveInviteError(message: string, t: ReturnType<typeof useTranslations>) {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("founder_team_member_limit_reached") || normalized.includes("invitation_target_conflict")) {
    return { title: t("acceptFailedTitle"), description: t(normalized.includes("founder_team_member_limit_reached") ? "teamFull" : "teamChanged") };
  }

  // Phase 12C.0b: Annahme nur mit bestaetigter E-Mail-Adresse.
  if (normalized.includes("email_not_verified") || normalized === "unverified") {
    return { title: t("unverifiedTitle"), description: t("unverifiedDescription") };
  }

  if (normalized.includes("invalid_token")) {
    return {
      title: t("invalidTitle"),
      description: t("invalidDescription"),
    };
  }

  if (normalized.includes("expired")) {
    return {
      title: t("expiredTitle"),
      description: t("expiredDescription"),
    };
  }

  if (normalized.includes("revoked")) {
    return {
      title: t("revokedTitle"),
      description: t("revokedDescription"),
    };
  }

  if (
    normalized.includes("invitation_email_mismatch") ||
    normalized.includes("invitation_already_accepted")
  ) {
    return {
      title: t("emailMismatchTitle"),
      description: t("emailMismatchDescription"),
    };
  }

  return {
    title: t("acceptFailedTitle"),
    description: t("acceptFailedDescription"),
  };
}

function readInviteTokenFromParams(searchParams: URLSearchParams) {
  return (searchParams.get("inviteToken") ?? searchParams.get("token") ?? "").trim();
}

function readInvitationIdFromParams(searchParams: URLSearchParams) {
  return (searchParams.get("invitationId") ?? "").trim();
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

function buildJoinStartHref(invitationId: string) {
  return `/join/start?invitationId=${encodeURIComponent(invitationId)}`;
}

export default function JoinClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("invite.join");
  const supabase = useMemo(() => createClient(), []);
  const hasRunRef = useRef(false);
  const [uiState, setUiState] = useState<JoinUiState>({
    type: "loading",
    title: t("loadingTitle"),
    description: t("loadingDescription"),
  });

  // Die EINZIGE Stelle, an der eine Einladung angenommen wird - und nur nach
  // einem Klick auf eine der beiden Optionen.
  async function acceptWithChoice(token: string | null, invitationIdFromUrl: string, share: boolean) {
    setUiState({ type: "choice", token, invitationId: invitationIdFromUrl, busy: true });
    logInviteFlowDebug("JoinClient:accept_invitation_attempt", { invitationIdFromUrl, tokenPresent: Boolean(token), share });
    const { data, error } = token
      ? await supabase.rpc("accept_invitation_with_team_share", { p_token: token, p_share: share })
      : await supabase.rpc("accept_invitation_by_id_with_team_share", {
          p_invitation_id: invitationIdFromUrl,
          p_share: share,
        });

    if (error) {
      logInviteFlowDebug("JoinClient:accept_invitation_error", { invitationIdFromUrl, error: error.message });
      const normalizedError = error.message.trim().toLowerCase();
      if (normalizedError.includes("auth session missing") || normalizedError.includes("not_authenticated")) {
        if (typeof window !== "undefined") {
          window.location.replace(
            token
              ? `/join/prepare?token=${encodeURIComponent(token)}`
              : `/login?next=${encodeURIComponent(buildJoinStartHref(invitationIdFromUrl))}`
          );
        }
        return;
      }
      const mapped = resolveInviteError(error.message, t);
      setUiState({ type: "error", title: mapped.title, description: mapped.description, technicalError: error.message });
      return;
    }

    const resolvedInvitationId = extractInvitationIdFromAcceptPayload(data) ?? invitationIdFromUrl;
    logInviteFlowDebug("JoinClient:accept_invitation_success", { invitationIdFromUrl, resolvedInvitationId, share });
    if (!resolvedInvitationId) {
      setUiState({ type: "error", title: t("invalidTitle"), description: t("missingInvitationDescription"), technicalError: "missing_invitation_context" });
      return;
    }
    setUiState({ type: "redirecting", title: t("loadingTitle"), description: t("loadingDescription") });
    router.replace(buildJoinStartHref(resolvedInvitationId));
  }

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const run = async () => {
      const tokenFromUrl = readInviteTokenFromParams(searchParams);
      const invitationIdFromUrl = readInvitationIdFromParams(searchParams);
      logInviteFlowDebug("JoinClient:start", {
        href: typeof window !== "undefined" ? window.location.href : null,
        tokenPresent: Boolean(tokenFromUrl),
        invitationIdFromUrl,
      });

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      logInviteFlowDebug("JoinClient:session", {
        invitationIdFromUrl,
        tokenPresent: Boolean(tokenFromUrl),
        sessionUserId: session?.user?.id ?? null,
        sessionError: sessionError?.message ?? null,
      });

      if (sessionError) {
        setUiState({
          type: "error",
          title: t("sessionCheckFailedTitle"),
          description: t("sessionCheckFailedDescription"),
          technicalError: sessionError.message,
        });
        return;
      }

      if (!session?.user?.id) {
        const nextPath = invitationIdFromUrl ? buildJoinStartHref(invitationIdFromUrl) : "/join";
        logInviteFlowDebug("JoinClient:redirect_login", {
          invitationIdFromUrl,
          tokenPresent: Boolean(tokenFromUrl),
          nextPath,
          route: tokenFromUrl ? "/join/prepare" : "/login",
        });
        setUiState({
          type: "redirecting",
          title: t("loginRedirectTitle"),
          description: t("loginRedirectDescription"),
        });
        if (tokenFromUrl && typeof window !== "undefined") {
          window.location.replace(`/join/prepare?token=${encodeURIComponent(tokenFromUrl)}`);
          return;
        }
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const resolvedInvitationId = invitationIdFromUrl;
      const token = tokenFromUrl;

      if (token) {
        // Beitritt erst nach einer ausdruecklichen Entscheidung: "Team beitreten
        // und teilen" oder "Erst beitreten, spaeter entscheiden".
        setUiState({ type: "choice", token, invitationId: invitationIdFromUrl, busy: false });
        return;
      }

      if (resolvedInvitationId) {
        // Phase 12C.0: Aus dem Konto heraus geoeffnet (ohne Token). Offene
        // Einladung -> derselbe Beitrittsdialog. Nur lesen, nichts annehmen.
        const { data: state } = await supabase.rpc("get_invitation_decision_state", {
          p_invitation_id: resolvedInvitationId,
        });
        if (state === "pending") {
          setUiState({ type: "choice", token: null, invitationId: resolvedInvitationId, busy: false });
          return;
        }
        if (state === "expired" || state === "revoked" || state === "unavailable" || state === "unverified") {
          const mapped = resolveInviteError(state === "unavailable" ? "invalid_token" : state, t);
          setUiState({ type: "error", title: mapped.title, description: mapped.description, technicalError: String(state) });
          return;
        }
      }

      if (!resolvedInvitationId) {
        logInviteFlowDebug("JoinClient:missing_invitation_context", {
          sessionUserId: session.user.id,
          invitationIdFromUrl,
          tokenPresent: Boolean(token),
        });
        setUiState({
          type: "error",
          title: t("invalidTitle"),
          description: t("missingInvitationDescription"),
          technicalError: "missing_invitation_context",
        });
        return;
      }

      logInviteFlowDebug("JoinClient:redirect_join_start", {
        sessionUserId: session.user.id,
        resolvedInvitationId,
        redirectTo: buildJoinStartHref(resolvedInvitationId),
      });
      router.replace(buildJoinStartHref(resolvedInvitationId));
    };

    void run();
  }, [router, searchParams, supabase, t]);

  /*
   * Testplan:
   * 1) Inkognito-Fenster öffnen.
   * 2) Einladung über /join?token=... öffnen.
   * 3) Magic Link Login auslösen und über /join/continue zurückkehren.
   * 4) Weiterleitung auf /join/start?invitationId=... prüfen.
   * 5) Von dort entweder direkt in den nächsten Einladungsschritt oder bei fehlenden Profil-Basics nach /join/welcome.
   */

  if (uiState.type === "choice") {
    const option =
      "flex w-full flex-col items-start rounded-2xl border border-slate-300 bg-white p-5 text-left transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60";
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
        <section aria-labelledby="join-choice-title" className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 id="join-choice-title" className="text-xl font-semibold text-slate-900">{t("choice.title")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("choice.body")}</p>
          {/* Zwei gleichwertige Optionen, keine Vorauswahl, kein verstecktes Teilen. */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" className={option} disabled={uiState.busy} onClick={() => void acceptWithChoice(uiState.token, uiState.invitationId, true)}>
              <span className="text-base font-semibold text-slate-950">{t("choice.share.title")}</span>
              <span className="mt-2 text-sm leading-6 text-slate-600">{t("choice.share.body")}</span>
            </button>
            <button type="button" className={option} disabled={uiState.busy} onClick={() => void acceptWithChoice(uiState.token, uiState.invitationId, false)}>
              <span className="text-base font-semibold text-slate-950">{t("choice.later.title")}</span>
              <span className="mt-2 text-sm leading-6 text-slate-600">{t("choice.later.body")}</span>
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">{t("choice.note")}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 md:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold text-slate-900">{uiState.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{uiState.description}</p>

        {uiState.type === "error" ? (
          <>
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("expiredHint")}
            </p>
            <a
              href="/dashboard"
              className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {t("toDashboard")}
            </a>
          </>
        ) : null}
      </div>
    </main>
  );
}
