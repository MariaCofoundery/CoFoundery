import Link from "next/link";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { FOUNDER_SETUP_PHASE_KEYS, getFounderSetupCatalogItem } from "@/features/teams/founderSetupCatalog";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { countFounderSetupStatuses } from "@/features/teams/founderSetupModel";
import { founderSetupRailState } from "@/features/teams/founderSetupTopicNav";
import { FounderSetupStatusChip } from "@/features/teams/FounderSetupStatusChip";
import { FounderSetupAdvisorAccessPanel } from "@/features/teams/FounderSetupAdvisorAccessPanel";
import { getFounderSetupAdvisorAccess } from "@/features/teams/founderSetupAdvisorAccessData";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { getCollaborationConversationPointCounts } from "@/features/collaborationLab/collaborationConversationPoints";

type Props = { params: Promise<{ teamId: string }> };

const DOT = {
  open: "border-2 border-slate-400",
  discussing: "border-2 border-violet-500 bg-violet-100",
  waiting_for_you: "border-2 border-amber-500 bg-amber-100",
  awaiting_others: "border-2 border-sky-500 bg-sky-100",
  settled: "border-2 border-teal-600 bg-teal-600",
} as const;

export default async function FounderSetupPage({ params }: Props) {
  const { teamId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/setup`)}`);
  const setup = await getFounderSetup(teamId, user.id, supabase);
  if (!setup) return <TeamUnavailable teamId={teamId} />;
  const advisorAccess = await getFounderSetupAdvisorAccess(teamId, supabase);
  // Der Hinweis MUSS in der Liste stehen, nicht nur auf der Themenseite:
  // Sonst findet man ihn nur, wenn man das richtige Thema ohnehin schon
  // aufmacht - und dann braucht man ihn nicht mehr.
  const conversationPointCounts = await getCollaborationConversationPointCounts(
    teamId,
    user.id,
    supabase
  );
  const [t, teamLabel] = await Promise.all([
    getTranslations("teams.setup"),
    getTeamLabel(supabase, teamId),
  ]);
  const counts = countFounderSetupStatuses(setup);
  const railState = (item: (typeof setup.items)[number]) => founderSetupRailState(item, user.id);
  // Das naechste Thema: zuerst ein wichtiges, noch offenes; sonst eines, das gerade geklaert wird oder
  // auf Bestaetigung wartet; sonst das erste offene. Keine Rangfolge der Personen, nur der Reihenfolge der Seite.
  const unsettled = FOUNDER_SETUP_PHASE_KEYS.flatMap((phase) =>
    setup.items.filter((item) => getFounderSetupCatalogItem(item.key)?.phase === phase && item.stage !== "settled")
  );
  // Was auf DICH wartet, kommt vor allem anderen: ein Vorschlag, dem nur deine Zustimmung fehlt.
  const nextItem =
    unsettled.find((item) => railState(item) === "waiting_for_you") ??
    unsettled.find((item) => getFounderSetupCatalogItem(item.key)?.weight === "critical" && item.stage === "open") ??
    unsettled.find((item) => item.stage === "discussing" || item.stage === "awaiting_confirmation") ??
    unsettled[0] ??
    null;
  const settledCount = counts.clarified + counts.documented + counts.not_relevant;
  const chips = [
    { key: "settled", count: settledCount, dot: "bg-teal-600" },
    { key: "discussing", count: counts.discussing, dot: "bg-violet-600" },
    { key: "pending", count: counts.confirmation_pending, dot: "bg-sky-600" },
    { key: "open", count: counts.open, dot: "border-2 border-white" },
  ] as const;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <TeamPageHeader teamId={teamId} active="setup" title={t("title")} teamLabel={teamLabel} hideTitle />
      <section className="brand-panel mt-5 rounded-[28px] p-6 sm:p-8" aria-labelledby="setup-title">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{teamLabel}</p>
        <h1 id="setup-title" className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white">{t("subtitle")}</p>
        {setup.started ? (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={t("hero.stateLabel")}>
            {chips.map((chip) => (
              <li key={chip.key} className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${chip.dot === "border-2 border-white" ? "border-2 border-white" : chip.dot}`} />
                {t(`hero.chips.${chip.key}`, { count: chip.count })}
              </li>
            ))}
          </ul>
        ) : null}
        {setup.started ? (
          <div className="mt-5" role="img" aria-label={t("list.progressLabel", { done: settledCount, total: setup.items.length })}>
            <div className="h-2 max-w-md overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${Math.round((settledCount / Math.max(setup.items.length, 1)) * 100)}%` }} /></div>
            <p className="mt-1.5 text-sm font-semibold text-white">{t("list.progressLabel", { done: settledCount, total: setup.items.length })}</p>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-white/15 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{t("hero.nextEyebrow")}</p>
            <p className="mt-1 text-lg font-semibold">{nextItem ? t(`items.${nextItem.key}.title`) : t("hero.allDone")}</p>
          </div>
          {nextItem ? (
            <Link
              href={`/teams/${teamId}/setup/${nextItem.key}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-violet-800 transition hover:bg-violet-50"
            >
              {t("hero.openTopic")}
            </Link>
          ) : null}
          <Link href={`/teams/${teamId}/setup/document`} className="text-sm text-white underline underline-offset-4">
            {t("document.open")}
          </Link>
        </div>
      </section>

      {setup.items.some(item => item.rosterConfirmationMissing) ? <p className="mt-5 rounded-xl border border-slate-200 p-4 text-sm leading-6">{t("rosterChanged")}</p> : null}

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
                <div className="flex flex-wrap items-center gap-3">
                  {openCritical > 0 ? (
                    <span className="text-sm font-medium text-amber-800">
                      {t("phases.openCritical", { count: openCritical })}
                    </span>
                  ) : null}
                  <span className="text-sm text-slate-600">{t("list.phaseProgress", { done: items.filter((item) => item.stage === "settled").length, total: items.length })}</span>
                  <span aria-hidden="true" className="h-1.5 w-28 overflow-hidden rounded-full bg-[#e4e2f0]"><span className="block h-full rounded-full bg-gradient-to-r from-[#6d49e0] to-[#0a80b8]" style={{ width: `${Math.round((items.filter((item) => item.stage === "settled").length / items.length) * 100)}%` }} /></span>
                </div>
              </div>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {t(`phases.${phase}.text`)}
              </p>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {items.map((item) => {
                  const catalogItem = getFounderSetupCatalogItem(item.key);
                  const isCritical = catalogItem?.weight === "critical";
                  return (
                    <li key={item.key}>
                      <Link
                        href={`/teams/${teamId}/setup/${item.key}`}
                        className="group flex h-full min-h-16 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-violet-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] sm:px-5"
                      >
                        <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[railState(item)]}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-slate-950">
                            {t(`items.${item.key}.title`)}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {t(`categories.${item.category}`)}
                            {conversationPointCounts.get(item.key)
                              ? ` · ${t("conversationPoints.listHint", { count: conversationPointCounts.get(item.key)! })}`
                              : ""}
                            {/* Nicht "wichtiger", sondern: teuer, wenn es
                                offen bleibt und es darauf ankommt. */}
                            {isCritical && item.stage === "open"
                              ? ` · ${t("weights.critical")}`
                              : ""}
                          </span>
                        </span>
                        {/* Die Stufe traegt das Zeichen, das Ergebnis nur die Beschriftung
                            des letzten Schritts. Ein offenes Thema bleibt still: "Offen" an
                            zwanzig Zeilen ist Laerm. Was auf DICH wartet, ist hervorgehoben. */}
                        {railState(item) === "waiting_for_you" ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">{t("topic.railState.waiting_for_you")}</span>
                        ) : item.stage !== "open" ? (
                          <FounderSetupStatusChip
                            stage={item.stage}
                            outcome={item.outcome}
                            label={
                              item.stage === "settled" && item.outcome
                                ? t(`outcomes.${item.outcome}`)
                                : t(`stages.${item.stage}`)
                            }
                          />
                        ) : <span className="sr-only">{t("stages.open")}</span>}
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
