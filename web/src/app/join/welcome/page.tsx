import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  buildInvitationDashboardHref,
  resolveInvitationContinueTarget,
} from "@/features/onboarding/invitationFlow";
import {
  inviteFlowDebugQueryEnabled,
  logInviteFlowDebug,
} from "@/features/onboarding/inviteFlowDebug";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { getPrimaryProfileRoleLabel, isCoreProfileComplete } from "@/features/profile/profileCompletion";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { createClient } from "@/lib/supabase/server";

type WelcomeSearchParams = {
  invitationId?: string;
  token?: string;
  inviteToken?: string;
  debug?: string;
};

type InvitationRow = {
  id: string;
  status: string;
  invitee_user_id: string | null;
  invitee_email: string;
  team_context: string | null;
  inviter_display_name: string | null;
  inviter_email: string | null;
  expires_at: string;
  revoked_at: string | null;
  accepted_at: string | null;
};

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function readToken(params: WelcomeSearchParams) {
  return (params.token ?? params.inviteToken ?? "").trim();
}

function readInvitationId(params: WelcomeSearchParams) {
  return (params.invitationId ?? "").trim();
}

function extractInvitationIdFromAcceptPayload(payload: unknown): string | null {
  if (Array.isArray(payload)) {
    const first = payload[0] as { invitation_id?: unknown } | undefined;
    return typeof first?.invitation_id === "string" ? first.invitation_id : null;
  }
  const direct = payload as { invitation_id?: unknown } | null;
  return typeof direct?.invitation_id === "string" ? direct.invitation_id : null;
}

type InviteT = Awaited<ReturnType<typeof getTranslations>>;

function resolveInviteError(message: string, t: InviteT) {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("invalid_token")) return t("errors.invalidToken");
  if (normalized.includes("expired")) return t("errors.expired");
  if (normalized.includes("revoked")) return t("errors.revoked");
  if (normalized.includes("not_authenticated")) return t("errors.notAuthenticated");
  return t("errors.processingFailed");
}

function isInvitationExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return false;
  return parsed < Date.now();
}

function invitationContextMeta(teamContext: string | null | undefined, t: InviteT) {
  if (teamContext === "existing_team") {
    return {
      badge: t("context.existing.badge"),
      title: t("context.existing.title"),
      text: t("context.existing.text"),
    };
  }

  return {
    badge: t("context.preFounder.badge"),
    title: t("context.preFounder.title"),
    text: t("context.preFounder.text"),
  };
}

function renderErrorState(title: string, detail: string, t: InviteT) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 md:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-700">{t("errors.loadFailed")}</p>
        <p className="mt-2 text-xs text-slate-500">{t("technicalHint", { detail })}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {t("toDashboard")}
        </Link>
      </section>
    </main>
  );
}

function localizeNextStepLabel(label: string, t: InviteT) {
  if (label === "Zum Report") return t("nextLabels.report");
  if (label === "Zum Abschluss") return t("nextLabels.completion");
  if (label === "Zum Basis-Fragebogen") return t("nextLabels.base");
  if (label === "Zum Werte-Modul") return t("nextLabels.values");
  return label;
}

export default async function JoinWelcomePage({
  searchParams,
}: {
  searchParams: Promise<WelcomeSearchParams>;
}) {
  const t = await getTranslations("invite.welcome");
  const params = await searchParams;
  const token = readToken(params);
  let invitationId = readInvitationId(params);
  const showDebug = inviteFlowDebugQueryEnabled(params.debug);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  logInviteFlowDebug("join/welcome:request", {
    invitationId,
    tokenPresent: Boolean(token),
    userId: user?.id ?? null,
    href: invitationId ? `/join/welcome?invitationId=${invitationId}` : "/join/welcome",
  });

  if (!user) {
    if (token) {
      logInviteFlowDebug("join/welcome:redirect_prepare", {
        invitationId,
        tokenPresent: true,
      });
      redirect(`/join/prepare?token=${encodeURIComponent(token)}`);
    }
    const next = invitationId
      ? `/join/welcome?invitationId=${encodeURIComponent(invitationId)}`
      : "/join/welcome";
    logInviteFlowDebug("join/welcome:redirect_login", {
      invitationId,
      next,
    });
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (token) {
    logInviteFlowDebug("join/welcome:accept_invitation_attempt", {
      invitationId,
      tokenPresent: true,
      userId: user.id,
    });
    const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
    if (error) {
      logInviteFlowDebug("join/welcome:accept_invitation_error", {
        invitationId,
        userId: user.id,
        error: error.message,
      });
      return renderErrorState(resolveInviteError(error.message, t), error.message, t);
    }
    const acceptedInvitationId = extractInvitationIdFromAcceptPayload(data);
    invitationId = acceptedInvitationId ?? invitationId;
    logInviteFlowDebug("join/welcome:accept_invitation_success", {
      invitationId,
      acceptedInvitationId,
      userId: user.id,
      payload: data,
    });
  }

  if (!invitationId) {
    return renderErrorState(t("errors.notFound"), "missing_invitation_id", t);
  }

  const { data: invitationData, error: invitationError } = await supabase
    .from("invitations")
    .select(
      "id, status, invitee_user_id, invitee_email, team_context, inviter_display_name, inviter_email, expires_at, revoked_at, accepted_at"
    )
    .eq("id", invitationId)
    .maybeSingle();

  if (invitationError || !invitationData) {
    return renderErrorState(t("errors.notFound"), invitationError?.message ?? "invitation_not_found", t);
  }

  const invitation = invitationData as InvitationRow;
  logInviteFlowDebug("join/welcome:invitation_snapshot", {
    invitationId,
    userId: user.id,
    invitation,
  });
  const userEmail = normalizeEmail(user.email);
  const isInvitee =
    invitation.invitee_user_id === user.id ||
    (userEmail.length > 0 && normalizeEmail(invitation.invitee_email) === userEmail);

  if (!isInvitee) {
    return renderErrorState(t("errors.unavailable"), "not_invitee", t);
  }

  if (invitation.revoked_at || invitation.status === "revoked") {
    return renderErrorState(t("errors.revoked"), "revoked", t);
  }

  if (isInvitationExpired(invitation.expires_at)) {
    return renderErrorState(t("errors.expired"), "expired", t);
  }

  const profile = await getProfileBasicsRow(supabase, user.id).catch(() => null);
  const hasProfileBasics = isCoreProfileComplete(profile);

  const inviterName =
    invitation.inviter_display_name?.trim() || invitation.inviter_email?.trim() || "Co-Founder";
  const contextMeta = invitationContextMeta(invitation.team_context, t);

  const nextStep = await resolveInvitationContinueTarget(invitationId);
  logInviteFlowDebug("join/welcome:next_step", {
    invitationId,
    userId: user.id,
    nextStep,
  });
  if (!nextStep.ok) {
    return renderErrorState(t("errors.unavailable"), nextStep.detail ?? nextStep.reason, t);
  }
  const primaryHref = nextStep.resolvedHref;
  const primaryLabel = localizeNextStepLabel(nextStep.label, t);
  const dashboardHref = buildInvitationDashboardHref(invitationId);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-cyan-200 pb-3">
          <h1 className="text-3xl font-semibold text-slate-900">{t("title")}</h1>
          <p className="mt-2 text-base text-slate-700">{t("invitedBy", { name: inviterName })}</p>
          <div className="mt-4 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
            {contextMeta.badge}
          </div>
          <p className="mt-3 text-sm font-medium text-slate-900">{contextMeta.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{contextMeta.text}</p>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-700">
          {t("profileIntro")}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {t("profileOptional")}
        </p>

        <div className="mt-6">
          {showDebug ? (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
              <p className="font-semibold uppercase tracking-[0.08em]">Invite Flow Debug</p>
              <dl className="mt-2 grid gap-1">
                <div className="flex gap-2">
                  <dt className="font-medium">Invitation</dt>
                  <dd>{invitationId}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Status</dt>
                  <dd>{invitation.status}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Invitee</dt>
                  <dd>{invitation.invitee_user_id ?? "null"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Accepted</dt>
                  <dd>{invitation.accepted_at ?? "null"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Relationship</dt>
                  <dd>n/a</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">User</dt>
                  <dd>{user.id}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Next</dt>
                  <dd>{primaryHref}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Mode</dt>
                  <dd>{nextStep.mode}</dd>
                </div>
              </dl>
            </div>
          ) : null}
          {hasProfileBasics ? (
            <section className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/80 via-white to-violet-50/70 p-6">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">{t("profileBasicsTitle")}</h2>
              <dl className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{t("profile.name")}</dt>
                  <dd className="font-medium text-slate-900">{profile?.display_name}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{t("profile.role")}</dt>
                  <dd className="font-medium text-slate-900">{getPrimaryProfileRoleLabel(profile)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{t("profile.focus")}</dt>
                  <dd className="font-medium text-slate-900">{profile?.focus_skill}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">{t("profile.intention")}</dt>
                  <dd className="font-medium text-slate-900">{profile?.intention}</dd>
                </div>
              </dl>
            </section>
          ) : (
            <ProfileBasicsForm
              mode="onboarding"
              initialValues={{
                display_name: profile?.display_name ?? null,
                focus_skill: profile?.focus_skill ?? null,
                intention: profile?.intention ?? null,
                roles: profile?.roles ?? null,
                avatar_id: profile?.avatar_id ?? null,
              }}
              submitLabel={primaryLabel}
              onSuccessRedirectTo={primaryHref}
              variant="accent"
            />
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {hasProfileBasics ? (
            <Link
              href={primaryHref}
              className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            >
              {primaryLabel}
            </Link>
          ) : null}
          <Link
            href={dashboardHref}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            {t("later")}
          </Link>
        </div>
      </section>
    </main>
  );
}
