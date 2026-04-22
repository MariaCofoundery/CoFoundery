import Link from "next/link";
import { redirect } from "next/navigation";
import {
  claimAdvisorTeamInviteFounderAction,
} from "@/features/dashboard/advisorTeamInviteActions";
import {
  fallbackLabelFromEmail,
  getAdvisorTeamInviteByToken,
  normalizeEmail,
  normalizeTeamName,
} from "@/features/dashboard/advisorTeamInviteData";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

function statusCopy(error: string | undefined) {
  if (error === "email_mismatch") {
    return "Diese Einladung passt nicht zur E-Mail-Adresse deines aktuellen Profils.";
  }
  if (error === "already_claimed") {
    return "Dieser Founder-Platz wurde bereits mit einem anderen Profil verknüpft.";
  }
  if (error === "activation_failed") {
    return "Die Team-Verknüpfung konnte gerade nicht abgeschlossen werden. Bitte versuche es gleich noch einmal.";
  }
  if (error === "invalid_token") {
    return "Dieser Founder-Link ist nicht mehr gültig oder konnte nicht gefunden werden.";
  }
  return null;
}

export default async function AdvisorTeamInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; claimed?: string }>;
}) {
  const { token } = await params;
  const resolvedSearchParams = await searchParams;
  const invite = await getAdvisorTeamInviteByToken(token);
  const errorMessage = statusCopy(resolvedSearchParams.error);

  if (invite.status !== "ready") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-16 md:px-10">
        <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-10 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Founder-Einladung</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">Einladung nicht gefunden</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
            Dieser Link ist nicht mehr gültig oder konnte keinem offenen Team-Startpunkt zugeordnet werden.
          </p>
          <div className="mt-8">
            <Link href="/login" className={SECONDARY_CTA_CLASS}>
              Zur Anmeldung
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const { row, founderSlot, slotEmail } = invite;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginHref = `/login?next=${encodeURIComponent(`/team-invite/${token}`)}`;
  const teamName = normalizeTeamName(row.team_name);
  const counterpartLabel =
    founderSlot === "founderA"
      ? fallbackLabelFromEmail(row.founder_b_email)
      : fallbackLabelFromEmail(row.founder_a_email);
  const founderALinked = Boolean(row.founder_a_claimed_at);
  const founderBLinked = Boolean(row.founder_b_claimed_at);
  const currentUserMatchesInvite = normalizeEmail(user?.email) === normalizeEmail(slotEmail);
  const slotAlreadyClaimed =
    founderSlot === "founderA"
      ? row.founder_a_user_id === user?.id
      : row.founder_b_user_id === user?.id;
  const canActivate =
    Boolean(user?.id) &&
    currentUserMatchesInvite &&
    (founderSlot === "founderA" ? !row.founder_a_user_id || slotAlreadyClaimed : !row.founder_b_user_id || slotAlreadyClaimed);
  const invitationReady = Boolean(row.invitation_id);

  async function claimAction() {
    "use server";

    const result = await claimAdvisorTeamInviteFounderAction({ token });
    if (!result.ok) {
      redirect(`/team-invite/${encodeURIComponent(token)}?error=${encodeURIComponent(result.reason)}`);
    }

    if (result.state === "activated" && result.invitationId) {
      redirect(`/join/start?invitationId=${encodeURIComponent(result.invitationId)}`);
    }

    redirect(`/team-invite/${encodeURIComponent(token)}?claimed=1`);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 md:px-10">
      <section className="rounded-[36px] border border-slate-200/80 bg-white/95 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)] md:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Founder-Einladung</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">
              Matching-Start für zwei Founder
            </h1>
            <p className="mt-5 text-sm leading-7 text-slate-700">
              {row.advisor_name?.trim()
                ? `${row.advisor_name.trim()} hat euch eingeladen, einen gemeinsamen Founder-Matching-Kontext in Cofoundery Align zu starten.`
                : "Ihr wurdet eingeladen, einen gemeinsamen Founder-Matching-Kontext in Cofoundery Align zu starten."}
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Dein Schritt bleibt bewusst schlank: Profil verknüpfen, Start bestätigen und danach
              warten, bis auch {counterpartLabel} gestartet ist. Erst dann wird euer gemeinsamer Flow aktiviert.
            </p>
            {teamName ? (
              <p className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                Team/Projekt: {teamName}
              </p>
            ) : null}
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Aktueller Stand</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <StatusRow
                label="Founder A"
                value={founderALinked ? "gestartet" : "noch offen"}
              />
              <StatusRow
                label="Founder B"
                value={founderBLinked ? "gestartet" : "noch offen"}
              />
              <StatusRow
                label="Dein Platz"
                value={slotEmail}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
          {errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {!user ? (
            <>
              <h2 className="text-xl font-semibold text-slate-950">Mit deinem Profil starten</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Melde dich mit der E-Mail-Adresse <strong>{slotEmail}</strong> an, damit dein Founder-Platz sauber verknüpft werden kann.
              </p>
              <div className="mt-6">
                <Link href={loginHref} className={PRIMARY_CTA_CLASS}>
                  Login / Founder-Start
                </Link>
              </div>
            </>
          ) : !currentUserMatchesInvite ? (
            <>
              <h2 className="text-xl font-semibold text-slate-950">Bitte mit der richtigen E-Mail anmelden</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Dieser Founder-Platz ist für <strong>{slotEmail}</strong> vorgesehen. Aktuell bist du mit <strong>{user.email}</strong> angemeldet.
              </p>
            </>
          ) : invitationReady ? (
            <>
              <h2 className="text-xl font-semibold text-slate-950">Euer Matching ist bereit</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Beide Founder sind gestartet. Du kannst jetzt direkt in euren bestehenden Matching-Flow wechseln.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/join/start?invitationId=${encodeURIComponent(row.invitation_id as string)}`}
                  className={PRIMARY_CTA_CLASS}
                >
                  Zum Matching
                </Link>
              </div>
            </>
          ) : canActivate ? (
            <>
              <h2 className="text-xl font-semibold text-slate-950">Deinen Founder-Platz aktivieren</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Dieser Link gehört zu <strong>{slotEmail}</strong>. Mit einem Klick bestätigst du deinen Start in den Matching-Flow.
              </p>
              <form action={claimAction} className="mt-6">
                <button type="submit" className={PRIMARY_CTA_CLASS}>
                  Start bestätigen
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-950">Wartet auf den zweiten Founder</h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Dein Platz ist bereits verknüpft. Sobald auch {counterpartLabel} gestartet ist, wird euer gemeinsamer Matching-Kontext automatisch aktiviert.
              </p>
              {resolvedSearchParams.claimed === "1" ? (
                <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Dein Start wurde gespeichert. Du musst gerade nichts weiter tun.
                </p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white/85 px-3 py-2">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
