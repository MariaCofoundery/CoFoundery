import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { createClient } from "@/lib/supabase/server";

type WelcomeSearchParams = {
  invitationId?: string;
  token?: string;
  inviteToken?: string;
};

type InvitationRow = {
  id: string;
  status: string;
  invitee_user_id: string | null;
  invitee_email: string;
  inviter_display_name: string | null;
  inviter_email: string | null;
  expires_at: string;
  revoked_at: string | null;
};

type ProfileRow = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
};

type SubmittedAssessmentRow = {
  module: string;
};

type InvitationModuleRow = {
  module: string;
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

function resolveInviteError(message: string) {
  const normalized = message.trim().toLowerCase();
  if (normalized.includes("invalid_token")) return "Link ungültig";
  if (normalized.includes("expired")) return "Link abgelaufen";
  if (normalized.includes("revoked")) return "Einladung widerrufen";
  if (normalized.includes("not_authenticated")) return "Bitte erneut anmelden";
  return "Einladung konnte nicht verarbeitet werden";
}

function ensureBaseModule(modules: string[]) {
  const unique = [...new Set(modules)];
  return unique.includes("base") ? unique : ["base", ...unique];
}

function isInvitationExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return false;
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return false;
  return parsed < Date.now();
}

async function resolveNextInviteStepUrl(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  invitationId: string;
  invitationStatus: string;
}) {
  const { supabase, userId, invitationId, invitationStatus } = params;

  if (invitationStatus !== "accepted") {
    return `/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`;
  }

  const { data: moduleRows } = await supabase
    .from("invitation_modules")
    .select("module")
    .eq("invitation_id", invitationId);
  const requiredModules = ensureBaseModule(
    ((moduleRows ?? []) as InvitationModuleRow[])
      .map((row) => row.module)
      .filter((module): module is string => typeof module === "string" && module.length > 0)
  );

  const { data: submittedRows } = await supabase
    .from("assessments")
    .select("module")
    .eq("user_id", userId)
    .not("submitted_at", "is", null)
    .in("module", requiredModules);

  const submittedModules = new Set(
    ((submittedRows ?? []) as SubmittedAssessmentRow[])
      .map((row) => row.module)
      .filter((module): module is string => typeof module === "string" && module.length > 0)
  );

  if (!submittedModules.has("base")) {
    return `/me/base?invitationId=${encodeURIComponent(invitationId)}`;
  }

  if (requiredModules.includes("values") && !submittedModules.has("values")) {
    return `/me/values?invitationId=${encodeURIComponent(invitationId)}`;
  }

  return `/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`;
}

function renderErrorState(title: string, detail: string) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 md:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-700">Die Einladung konnte nicht geladen werden.</p>
        <p className="mt-2 text-xs text-slate-500">Technischer Hinweis: {detail}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          Zum Dashboard
        </Link>
      </section>
    </main>
  );
}

export default async function JoinWelcomePage({
  searchParams,
}: {
  searchParams: Promise<WelcomeSearchParams>;
}) {
  const params = await searchParams;
  const token = readToken(params);
  let invitationId = readInvitationId(params);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = token
      ? `/join/welcome?token=${encodeURIComponent(token)}`
      : invitationId
        ? `/join/welcome?invitationId=${encodeURIComponent(invitationId)}`
        : "/join/welcome";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (token) {
    const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
    if (error) {
      return renderErrorState(resolveInviteError(error.message), error.message);
    }
    const acceptedInvitationId = extractInvitationIdFromAcceptPayload(data);
    invitationId = acceptedInvitationId ?? invitationId;
  }

  if (!invitationId) {
    return renderErrorState("Einladung nicht gefunden", "missing_invitation_id");
  }

  const { data: invitationData, error: invitationError } = await supabase
    .from("invitations")
    .select(
      "id, status, invitee_user_id, invitee_email, inviter_display_name, inviter_email, expires_at, revoked_at"
    )
    .eq("id", invitationId)
    .maybeSingle();

  if (invitationError || !invitationData) {
    return renderErrorState("Einladung nicht gefunden", invitationError?.message ?? "invitation_not_found");
  }

  const invitation = invitationData as InvitationRow;
  const userEmail = normalizeEmail(user.email);
  const isInvitee =
    invitation.invitee_user_id === user.id ||
    (userEmail.length > 0 && normalizeEmail(invitation.invitee_email) === userEmail);

  if (!isInvitee) {
    return renderErrorState("Einladung nicht verfügbar", "not_invitee");
  }

  if (invitation.revoked_at || invitation.status === "revoked") {
    return renderErrorState("Einladung widerrufen", "revoked");
  }

  if (isInvitationExpired(invitation.expires_at)) {
    return renderErrorState("Einladung abgelaufen", "expired");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name, focus_skill, intention")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = (profileData as ProfileRow | null) ?? null;
  const hasProfileBasics = Boolean(
    profile?.display_name?.trim() && profile?.focus_skill?.trim() && profile?.intention?.trim()
  );

  const inviterName =
    invitation.inviter_display_name?.trim() || invitation.inviter_email?.trim() || "Co-Founder";

  const nextStepUrl = await resolveNextInviteStepUrl({
    supabase,
    userId: user.id,
    invitationId,
    invitationStatus: invitation.status,
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="border-b border-cyan-200 pb-3">
          <h1 className="text-3xl font-semibold text-slate-900">Willkommen</h1>
          <p className="mt-2 text-base text-slate-700">{inviterName} hat dich eingeladen</p>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-700">
          Bitte gib deinen Namen an. Dieser Name erscheint im Report für deinen Co-Founder.
        </p>
        <p className="mt-1 text-xs text-slate-500">Du kannst das später im Dashboard ändern.</p>

        <div className="mt-6">
          {hasProfileBasics ? (
            <section className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/80 via-white to-violet-50/70 p-6">
              <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Deine Profil-Basics</h2>
              <dl className="mt-3 space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Name</dt>
                  <dd className="font-medium text-slate-900">{profile?.display_name}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Fokus</dt>
                  <dd className="font-medium text-slate-900">{profile?.focus_skill}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-500">Intention</dt>
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
              }}
              submitLabel="Weiter zum Fragebogen"
              onSuccessRedirectTo={nextStepUrl}
              variant="accent"
            />
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {hasProfileBasics ? (
            <Link
              href={nextStepUrl}
              className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            >
              Weiter zum Fragebogen
            </Link>
          ) : null}
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
          >
            Später
          </Link>
        </div>
      </section>
    </main>
  );
}
