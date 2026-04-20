import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getAdvisorDashboardProfile,
  getAdvisorDashboardTeams,
  getDashboardRoleViews,
  type AdvisorDashboardTeam,
} from "@/features/dashboard/dashboardRoleData";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";
const TERTIARY_CTA_CLASS =
  "inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700";
const DISABLED_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400";

function accessStatusClassName(status: AdvisorDashboardTeam["accessStatus"]) {
  if (status === "ready") {
    return "border-emerald-200 bg-emerald-50/80 text-emerald-800";
  }

  if (status === "paused") {
    return "border-amber-200 bg-amber-50/80 text-amber-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function TeamFounderAvatars({ team }: { team: AdvisorDashboardTeam }) {
  return (
    <div className="flex -space-x-2">
      <ProfileAvatar
        displayName={team.founderAName}
        avatarId={team.founderAAvatarId}
        imageUrl={team.founderAAvatarUrl}
        className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
        fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[11px] font-semibold text-slate-700 shadow-sm"
      />
      <ProfileAvatar
        displayName={team.founderBName}
        avatarId={team.founderBAvatarId}
        imageUrl={team.founderBAvatarUrl}
        className="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm"
        fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-stone-100 text-[11px] font-semibold text-slate-700 shadow-sm"
      />
    </div>
  );
}

function TeamCard({ team }: { team: AdvisorDashboardTeam }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white/92 p-6 shadow-[0_14px_38px_rgba(15,23,42,0.045)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <TeamFounderAvatars team={team} />
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {team.teamContext === "existing_team" ? "Bestehendes Team" : "Pre-Founder"}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">
                {team.founderAName} & {team.founderBName}
              </h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm leading-6 text-slate-600 md:grid-cols-3">
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Letzte Aktivitaet
              </span>
              {team.lastActivityLabel}
            </p>
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Begleitung
              </span>
              {team.statusLabel}
            </p>
            <p>
              <span className="block text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Follow-up
              </span>
              {team.followUpLabel}
            </p>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm lg:w-64">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${accessStatusClassName(team.accessStatus)}`}>
            {team.accessStatusLabel}
          </span>
          <p className="mt-3 font-medium text-slate-900">{team.approvalSummary}</p>
          <p className="mt-1 leading-6 text-slate-600">{team.accessStatusDescription}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {team.canOpenWorkbook ? (
          <Link href={team.workbookHref} className={PRIMARY_CTA_CLASS}>
            Workbook öffnen
          </Link>
        ) : (
          <span className={DISABLED_CTA_CLASS}>{team.accessStatusLabel}</span>
        )}
        {team.canOpenWorkbook && team.reportReady ? (
          <Link href={team.reportHref} className={SECONDARY_CTA_CLASS}>
            Report ansehen
          </Link>
        ) : null}
        {team.canOpenWorkbook ? (
          <Link href={team.snapshotHref} className={TERTIARY_CTA_CLASS}>
            Snapshot exportieren
          </Link>
        ) : null}
        {team.canOpenWorkbook && !team.reportReady ? (
          <span className={DISABLED_CTA_CLASS}>Report noch nicht bereit</span>
        ) : null}
      </div>
    </article>
  );
}

function TeamSection({
  title,
  description,
  teams,
}: {
  title: string;
  description: string;
  teams: AdvisorDashboardTeam[];
}) {
  if (teams.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
          {teams.length} Team{teams.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="grid gap-5">
        {teams.map((team) => (
          <TeamCard key={team.invitationId} team={team} />
        ))}
      </div>
    </section>
  );
}

export default async function AdvisorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ debug?: string }>;
}) {
  const params = await searchParams;
  const debug = params.debug === "1";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [roleViews, teams, advisorProfile] = await Promise.all([
    getDashboardRoleViews(user.id),
    getAdvisorDashboardTeams(user.id),
    getAdvisorDashboardProfile(user.id),
  ]);

  if (!roleViews.hasAdvisor) {
    redirect("/dashboard");
  }

  const metadataName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  const emailName = user.email?.split("@")[0]?.trim() ?? "";
  const displayName = advisorProfile.displayName || metadataName || emailName || "Advisor";
  const readyTeams = teams.filter((team) => team.accessStatus === "ready");
  const waitingTeams = teams.filter((team) => team.accessStatus === "waiting_for_approval");
  const pausedTeams = teams.filter((team) => team.accessStatus === "paused");

  if (debug) {
    console.info("[advisor-report-debug] dashboard_links", {
      userId: user.id,
      teams: teams.map((team) => ({
        invitationId: team.invitationId,
        workbookHref: team.workbookHref,
        reportHref: team.reportHref,
        reportReady: team.reportReady,
        accessStatus: team.accessStatus,
      })),
    });
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-14 md:px-10 xl:px-12">
      <header className="rounded-[36px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-7 shadow-[0_18px_55px_rgba(15,23,42,0.055)] md:p-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-5">
            <ProfileAvatar
              displayName={displayName}
              avatarId={advisorProfile.avatarId}
              imageUrl={advisorProfile.avatarUrl}
              className="h-16 w-16 rounded-2xl object-cover shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
              fallbackClassName="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.08)]"
            />
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Advisor-Arbeitsplatz</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">
                {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Du begleitest Founder-Teams mit Außenblick. Zugriff entsteht erst, wenn beide Founder
                die Begleitung aktiv freigegeben haben.
              </p>
            </div>
          </div>

          <div className="grid min-w-[260px] grid-cols-3 gap-2 rounded-3xl border border-slate-200 bg-white/88 p-3 text-center">
            <div className="rounded-2xl bg-emerald-50/80 px-3 py-3">
              <p className="text-2xl font-semibold text-emerald-800">{readyTeams.length}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-700">
                Bereit
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-3">
              <p className="text-2xl font-semibold text-slate-800">{waitingTeams.length}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                Wartet
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50/80 px-3 py-3">
              <p className="text-2xl font-semibold text-amber-800">{pausedTeams.length}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-amber-700">
                Pausiert
              </p>
            </div>
          </div>
        </div>
      </header>

      <section
        id="advisor-teams"
        className="mt-8 rounded-[32px] border border-slate-200/80 bg-slate-50/75 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.04)] md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Teams & Workbooks</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Deine begleiteten Teams
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Öffne nur Teams mit aktiver Freigabe. Alles andere bleibt sichtbar als Status, aber
              nicht als Arbeitszugriff.
            </p>
          </div>
        </div>

        {debug ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Debug · Dashboard Links
            </p>
            <div className="mt-3 space-y-3 text-xs leading-6 text-slate-700">
              {teams.map((team) => (
                <div key={`debug-${team.invitationId}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <p className="font-semibold text-slate-900">
                    {team.founderAName} & {team.founderBName}
                  </p>
                  <p>invitationId: {team.invitationId}</p>
                  <p>workbookHref: {team.workbookHref}</p>
                  <p>reportHref: {team.reportHref}</p>
                  <p>
                    reportReady: {String(team.reportReady)} · accessStatus: {team.accessStatus}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {teams.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/82 p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-6 w-6 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 18a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
                  <path d="M17 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
                  <path d="M12 8.5l2-1.2" />
                  <path d="M10.5 14.5l4 1" />
                </svg>
              </div>

              <div className="max-w-2xl">
                <p className="text-lg font-semibold text-slate-900">Noch keine Teams verknüpft</p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Sobald du zu einem Founder-Team als Advisor eingeladen wirst, erscheint es hier
                  mit seinem Freigabestatus.
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Arbeiten kannst du erst, wenn beide Founder die Begleitung freigegeben haben.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <TeamSection
              title="Bereit zur Begleitung"
              description="Diese Teams sind freigegeben. Du kannst Workbook, Report und Snapshot öffnen."
              teams={readyTeams}
            />
            <TeamSection
              title="Wartet auf Freigabe"
              description="Diese Teams sind verknüpft, aber noch nicht vollständig freigegeben."
              teams={waitingTeams}
            />
            <TeamSection
              title="Zugriff pausiert"
              description="Hier fehlt aktuell eine aktive Freigabe. Du siehst den Status, arbeitest aber nicht weiter."
              teams={pausedTeams}
            />
          </>
        )}
      </section>
    </main>
  );
}
