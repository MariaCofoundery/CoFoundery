import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { FOUNDER_SETUP_PHASE_KEYS, getFounderSetupCatalogItem } from "@/features/teams/founderSetupCatalog";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { countFounderSetupStatuses } from "@/features/teams/founderSetupModel";
import { FounderSetupStatusChip } from "@/features/teams/FounderSetupStatusChip";
import { FounderSetupAdvisorAccessPanel } from "@/features/teams/FounderSetupAdvisorAccessPanel";
import { getFounderSetupAdvisorAccess } from "@/features/teams/founderSetupAdvisorAccessData";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";

type Props = { params: Promise<{ teamId: string }> };

export default async function FounderSetupPage({ params }: Props) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/setup`)}`);
  const setup = await getFounderSetup(teamId, user.id, supabase);
  if (!setup) notFound();
  const advisorAccess = await getFounderSetupAdvisorAccess(teamId, supabase);
  const [t, navigationT] = await Promise.all([
    getTranslations("teams.setup"),
    getTranslations("teams.teamNavigation"),
  ]);
  const counts = countFounderSetupStatuses(setup);
  const teamLabel = setup.members
    .map((member, index) => member.displayName ?? t("founderFallback", { index: index + 1 }))
    .join(" + ");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href={`/teams/${teamId}`} className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
        {t("backToCollaboration")}
      </Link>
      <header className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{t("title")}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{t("subtitle")}</p>
        {setup.started ? (
          <p className="mt-4 text-sm font-medium text-slate-700">
            {t("summary", {
              clarified: counts.clarified + counts.documented + counts.not_relevant,
              discussing: counts.discussing,
              open: counts.open,
              pending: counts.confirmation_pending,
            })}
          </p>
        ) : null}
      </header>

      <FounderTeamNavigation
        teamId={teamId}
        active="setup"
        labels={{
          ariaLabel: navigationT("ariaLabel"),
          context: navigationT("context", { team: teamLabel }),
          overview: navigationT("overview"),
          setup: navigationT("setup"),
          library: navigationT("library"),
          alignment: navigationT("alignment"),
          roles: navigationT("roles"),
        }}
      />

      {/* ---------------------------------------------------------------
          Phasen statt einer Liste von zwanzig.

          Vorher standen alle Themen gleichzeitig da, geordnet nach
          Kategorien - und etwa ein Drittel davon ist erst sinnvoll, wenn es
          eine Gesellschaft gibt. "Ausscheiden" anzubieten, bevor die
          Rechtsform steht, ist Laerm.

          Die Kategorie bleibt am Thema stehen, sie ordnet jetzt nur nicht
          mehr die Seite.
          --------------------------------------------------------------- */}
      <div className="mt-7 grid gap-8">
        {FOUNDER_SETUP_PHASE_KEYS.map((phase) => {
          const items = setup.items.filter(
            (item) => getFounderSetupCatalogItem(item.key)?.phase === phase
          );
          if (items.length === 0) return null;
          const openCritical = items.filter(
            (item) =>
              getFounderSetupCatalogItem(item.key)?.weight === "critical" &&
              item.stage === "open"
          ).length;

          return (
            <section key={phase} aria-labelledby={`setup-phase-${phase}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`setup-phase-${phase}`} className="text-xl font-semibold text-slate-950">
                  {t(`phases.${phase}.title`)}
                </h2>
                {openCritical > 0 ? (
                  <span className="text-sm font-medium text-amber-800">
                    {t("phases.openCritical", { count: openCritical })}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {t(`phases.${phase}.text`)}
              </p>
              <ul className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.035)]">
                {items.map((item) => {
                  const catalogItem = getFounderSetupCatalogItem(item.key);
                  const isCritical = catalogItem?.weight === "critical";
                  return (
                    <li key={item.key} className="border-b border-slate-200 last:border-b-0">
                      <Link
                        href={`/teams/${teamId}/setup/${item.key}`}
                        className="group flex min-h-16 w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--brand-accent)] sm:px-5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-slate-950">
                            {t(`items.${item.key}.title`)}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {t(`categories.${item.category}`)}
                            {/* Nicht "wichtiger", sondern: teuer, wenn es
                                offen bleibt und es darauf ankommt. */}
                            {isCritical && item.stage === "open"
                              ? ` · ${t("weights.critical")}`
                              : ""}
                          </span>
                        </span>
                        {/* Die Stufe traegt das Zeichen, das Ergebnis nur
                            die Beschriftung des letzten Schritts. */}
                        <FounderSetupStatusChip
                          stage={item.stage}
                          outcome={item.outcome}
                          label={
                            item.stage === "settled" && item.outcome
                              ? t(`outcomes.${item.outcome}`)
                              : t(`stages.${item.stage}`)
                          }
                        />
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          className="h-5 w-5 shrink-0 fill-none stroke-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:stroke-slate-600"
                          strokeWidth="1.8"
                        >
                          <path d="m7.5 4.5 5 5.5-5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      {/* Eine Legende, weil der Unterschied sonst geraten werden muss.
          "Dokumentiert" ist staerker als "Geklaert" - das sah man den
          Zeichen nicht an. */}
      <details className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-800">
          {t("legendTitle")}
        </summary>
        <p className="mt-3 text-sm leading-7 text-slate-600">{t("legendStages")}</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">{t("legendOutcomes")}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["clarified", "documented", "not_relevant"] as const).map((outcome) => (
            <div key={outcome} className="rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-sm font-semibold text-slate-900">{t(`outcomes.${outcome}`)}</dt>
              <dd className="mt-1 text-xs leading-6 text-slate-600">{t(`outcomeHelp.${outcome}`)}</dd>
            </div>
          ))}
        </dl>
      </details>

      {/* Der Weg zu dem, was herauskommt. Ohne ihn bliebe das Dokument eine
          Seite, die niemand findet. */}
      <section className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-slate-950">{t("document.title")}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{t("document.openHelp")}</p>
        </div>
        <Link
          href={`/teams/${teamId}/setup/document`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          {t("document.open")}
        </Link>
      </section>

      <FounderSetupAdvisorAccessPanel
        teamId={teamId}
        currentUserId={user.id}
        members={setup.members}
        access={advisorAccess}
      />
      <p className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("legalGeneral")}</p>
    </main>
  );
}
