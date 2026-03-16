import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/(product)/dashboard/actions";
import { DashboardViewSwitch } from "@/features/dashboard/DashboardViewSwitch";
import {
  getAdvisorDashboardTeams,
  getDashboardRoleViews,
} from "@/features/dashboard/dashboardRoleData";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-[color:var(--brand-primary-hover)]";
const SECONDARY_CTA_CLASS =
  "inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

export default async function AdvisorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [roleViews, teams] = await Promise.all([
    getDashboardRoleViews(user.id),
    getAdvisorDashboardTeams(user.id),
  ]);

  if (!roleViews.hasAdvisor) {
    redirect("/dashboard");
  }

  const displayName = user.email?.split("@")[0] ?? "Advisor";

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-16 md:px-10 xl:px-12">
      <header className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Advisor-Plattform</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 md:text-4xl">
            Advisor Dashboard
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {displayName}, hier siehst du die Founder-Teams, zu denen du aktuell Zugriff hast,
            und kannst direkt in Workbook oder Report springen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <DashboardViewSwitch
            activeView="advisor"
            hasFounder={roleViews.hasFounder}
            hasAdvisor={roleViews.hasAdvisor}
          />
          <form action={signOutAction}>
            <button type="submit" className={SECONDARY_CTA_CLASS}>
              Abmelden
            </button>
          </form>
        </div>
      </header>

      <section className="rounded-[32px] border border-slate-200/80 bg-white/92 p-8 shadow-[0_16px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Betreute Teams</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {teams.length} aktive Team{teams.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Fokus für V1: klare Teamliste, direkter Sprung ins Workbook und sichtbare offene
              Advisor-Impulse.
            </p>
          </div>
        </div>

        {teams.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-8">
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
                  Sobald du zu einem Founder-Team als Advisor eingeladen wirst, erscheinen deine begleiteten Teams hier.
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  Du kannst einen Invite-Link direkt von einem Founder oder Accelerator erhalten.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {teams.map((team) => (
              <article
                key={team.invitationId}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex rounded-full border border-[color:var(--brand-accent)]/18 bg-[color:var(--brand-accent)]/7 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-700">
                      {team.teamContext === "existing_team" ? "Bestehendes Team" : "Pre-Founder"}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">
                      {team.founderAName} x {team.founderBName}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{team.lastActivityLabel}</p>
                    <p className="mt-1 text-sm leading-7 text-slate-600">
                      Follow-up: {team.followUpLabel}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Status</p>
                    <p className="mt-2 font-medium text-slate-900">{team.statusLabel}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={team.workbookHref} className={PRIMARY_CTA_CLASS}>
                    Workbook öffnen
                  </Link>
                  {team.reportReady ? (
                    <Link href={team.reportHref} className={SECONDARY_CTA_CLASS}>
                      Report ansehen
                    </Link>
                  ) : (
                    <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
                      Report noch nicht bereit
                    </span>
                  )}
                  <Link href={team.advisorActionHref} className={SECONDARY_CTA_CLASS}>
                    Advisor-Impulse ergänzen
                  </Link>
                  <Link href={team.snapshotHref} className={SECONDARY_CTA_CLASS}>
                    Snapshot exportieren
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
