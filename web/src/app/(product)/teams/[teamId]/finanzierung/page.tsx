import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getFinancingNotes, getFinancingStatuses } from "@/features/financing/financingData";
import { FinancingNote } from "@/features/financing/FinancingNote";
import { FinancingStatusButton } from "@/features/financing/FinancingStatusButton";
import {
  FINANCING_AGREEMENT_TOPICS,
  FINANCING_AREAS,
  FINANCING_ITEMS,
  FINANCING_PREP_QUESTIONS,
  FINANCING_STATUSES,
  financingHref,
  financingViewFrom,
  type FinancingView,
} from "@/features/financing/financingModel";
import { FounderSetupStatusChip } from "@/features/teams/FounderSetupStatusChip";

type Props = {
  params: Promise<{ teamId: string }>;
  searchParams?: Promise<{ view?: string }>;
};

const CARD = "rounded-3xl border border-[#e4e2f0] bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)] sm:p-6";

/**
 * Finanzierungs-Wegweiser. Keine Summe, kein Balken, keine Empfehlung von Investoren.
 * Der Status gehoert dem Team; die Ansicht "Eure Vereinbarungen" liest nur das Founder Setup.
 */
export default async function FinancingPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const view: FinancingView = financingViewFrom((await searchParams)?.view);
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(financingHref(teamId, view))}`);
  const setup = await getFounderSetup(teamId, user.id, supabase);
  if (!setup) return <TeamUnavailable teamId={teamId} />;

  const [t, setupT, teamLabel, statuses, notes] = await Promise.all([
    getTranslations("teams.financing"),
    getTranslations("teams.setup"),
    getTeamLabel(supabase, teamId),
    getFinancingStatuses(teamId, supabase),
    view === "prep" ? getFinancingNotes(teamId, supabase) : Promise.resolve(new Map()),
  ]);
  const setupItem = (key: string) => setup.items.find((item) => item.key === key);
  const nameOf = (userId: string | null) => {
    if (!userId) return null;
    const index = setup.members.findIndex((member) => member.userId === userId);
    return index >= 0 ? setup.members[index].displayName ?? setupT("founderFallback", { index: index + 1 }) : setupT("formerMember");
  };
  const labels = Object.fromEntries(FINANCING_STATUSES.map((status) => [status, t(`statuses.${status}`)])) as Record<(typeof FINANCING_STATUSES)[number], string>;
  const stageLabel = (key: string) => {
    const item = setupItem(key);
    return t(`stages.${item?.stage ?? "open"}`);
  };

  const tab = (which: FinancingView) => (
    <Link
      key={which}
      href={financingHref(teamId, which)}
      aria-current={view === which ? "page" : undefined}
      className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] ${view === which ? "border-[#0b1f3a] bg-[#0b1f3a] text-white" : "border-[#e4e2f0] bg-white text-[#0b1f3a] hover:bg-[#f7f6fb]"}`}
    >
      {t(`tabs.${which}`)}
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <TeamPageHeader teamId={teamId} active="overview" title={t("title")} teamLabel={teamLabel} hideTitle />

      <section className="brand-panel mt-5 rounded-[28px] p-6 sm:p-8" aria-labelledby="financing-title">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{t("eyebrow")}</p>
        <h1 id="financing-title" className="mt-2 text-3xl font-semibold leading-tight">{t(`hero.${view}.title`)}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white">{t(`hero.${view}.intro`)}</p>
      </section>

      <nav aria-label={t("tabs.label")} className="mt-5 flex flex-wrap gap-2">
        {(["guide", "agreements", "prep"] as const).map(tab)}
      </nav>

      {view === "guide" ? (
        <div className="mt-5 grid gap-4">
          <p className="rounded-2xl border border-[#e4e2f0] bg-[#f7f6fb] px-4 py-3 text-sm leading-6 text-[#5f5e7a]">{t("guideNote")}</p>
          {FINANCING_AREAS.map((area) => (
            <section key={area} className={CARD} aria-labelledby={`financing-area-${area}`}>
              <h2 id={`financing-area-${area}`} className="text-xl font-semibold text-[#0b1f3a]">{t(`areas.${area}.title`)}</h2>
              <p className="mt-1 text-sm text-[#5f5e7a]">{t(`areas.${area}.text`)}</p>
              <ul className="mt-4 grid gap-2">
                {FINANCING_ITEMS.filter((item) => item.area === area).map((item) => {
                  const entry = statuses.get(item.key);
                  const hint = t(`items.${item.key}.hint`);
                  const editor = nameOf(entry?.updatedByUserId ?? null);
                  return (
                    <li key={item.key} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e4e2f0] bg-white px-4 py-3">
                      <div className="min-w-0 flex-1 basis-72">
                        <p className="font-medium text-[#0b1f3a]">{t(`items.${item.key}.title`)}</p>
                        {hint ? <p className="mt-0.5 text-[13px] text-[#5f5e7a]">{hint}</p> : null}
                        {item.setupTopic ? (
                          <p className="mt-1 text-[13px] text-[#5f5e7a]">
                            {t("setupHint", { state: stageLabel(item.setupTopic) })} ·{" "}
                            <Link href={`/teams/${encodeURIComponent(teamId)}/setup/${item.setupTopic}`} className="font-semibold text-[#6d49e0] underline underline-offset-2">{t("setupLink")}</Link>
                          </p>
                        ) : null}
                        {editor && entry && entry.status !== "open" ? <p className="mt-0.5 text-xs text-[#5f5e7a]">{t("lastChanged", { name: editor })}</p> : null}
                      </div>
                      <FinancingStatusButton
                        teamId={teamId}
                        itemKey={item.key}
                        initial={entry?.status ?? "open"}
                        labels={labels}
                        itemTitle={t(`items.${item.key}.title`)}
                        errorText={t("statusError")}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      {view === "agreements" ? (
        <div className="mt-5 grid gap-4">
          <p className="rounded-2xl border border-[#e4e2f0] bg-[#f7f6fb] px-4 py-3 text-sm leading-6 text-[#5f5e7a]">{t("agreementsNote")}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {FINANCING_AGREEMENT_TOPICS.map((key) => {
              const item = setupItem(key);
              const questions = (["q1", "q2"] as const).map((q) => t(`topicQuestions.${key}.${q}`));
              return (
                <article key={key} className={`${CARD} flex flex-col gap-3`}>
                  <div>
                    <FounderSetupStatusChip
                      stage={item?.stage ?? "open"}
                      outcome={item?.outcome ?? null}
                      label={t(`stages.${item?.stage ?? "open"}`)}
                    />
                  </div>
                  <h2 className="text-lg font-semibold text-[#0b1f3a]">{setupT(`items.${key}.title`)}</h2>
                  <details className="border-t border-[#e4e2f0] pt-2">
                    <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-[#0b1f3a]">{t("questionsToggle")}</summary>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-[#5f5e7a]">
                      {questions.map((question) => <li key={question}>{question}</li>)}
                    </ul>
                  </details>
                  <Link href={`/teams/${encodeURIComponent(teamId)}/setup/${key}`} className="mt-auto text-sm font-semibold text-[#6d49e0] underline underline-offset-2">{t("setupLink")}</Link>
                </article>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "prep" ? (
        <div className="mt-5 grid gap-4">
          <p className="rounded-2xl border border-[#e4e2f0] bg-[#f7f6fb] px-4 py-3 text-sm leading-6 text-[#5f5e7a]">{t("prepNote")}</p>
          <section className={CARD}>
            <ul className="grid gap-3">
              {FINANCING_PREP_QUESTIONS.map((key) => (
                <li key={key}>
                  <FinancingNote
                    teamId={teamId}
                    questionKey={key}
                    question={t(`prep.${key}`)}
                    initial={notes.get(key)?.note ?? ""}
                    labels={{
                      placeholder: t("notes.placeholder"),
                      save: t("notes.save"),
                      saved: t("notes.saved"),
                      saving: t("notes.saving"),
                      error: t("notes.error"),
                      unsaved: t("notes.unsaved"),
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      <p className="mt-6 text-xs leading-6 text-[#5f5e7a]">{t("disclaimer")}</p>
      <details className="mt-3 rounded-2xl border border-[#e4e2f0] bg-white p-4">
        <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-[#0b1f3a]">{t("sourcesTitle")}</summary>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f5e7a]">{t("sources")}</p>
      </details>
    </main>
  );
}
