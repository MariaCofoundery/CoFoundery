import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { AppIcon, IconTile } from "@/features/ui/Icons";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { normalizeLocale } from "@/i18n/config";
import { getTestProject, type TestProjectView } from "@/features/testProject/testProjectData";
import { getCapabilityVocabulary, getOwnCapabilityEntries } from "@/features/capability/capabilityData";
import {
  TEST_PROJECT_CLOSING_QUESTIONS,
  TEST_PROJECT_INTERIM_QUESTIONS,
  TEST_PROJECT_RIGHTS_QUESTIONS,
  TEST_PROJECT_TEMPLATES,
} from "@/features/testProject/testProjectTemplates";
import {
  TEST_PROJECT_BOTH,
  activeTestProjectItems,
  contributionSuggestions,
  groupTestProjectTasks,
  hasAgreedToCurrentDraft,
  isTestProjectPhaseComplete,
  testProjectDaysLeft,
  testProjectHref,
  type TestProjectContribution,
  type TestProjectPhase,
  type TestProjectResponse,
} from "@/features/testProject/testProjectModel";
import {
  TestProjectCancelButton,
  TestProjectEditor,
  TestProjectResponseForm,
  TestProjectStarter,
  type TestProjectLabels,
} from "@/features/testProject/TestProjectClient";
import { UserText } from "@/features/ui/UserText";

type Props = {
  params: Promise<{ teamId: string; relationshipId: string }>;
  searchParams: Promise<{ result?: string }>;
};

const CARD = "rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-[26px]";
const LABEL = "text-[13px] font-semibold uppercase tracking-[0.06em] text-[#5f5e7a]";
const FEEDBACK = ["saved", "agreed", "started", "withdrawn", "cancelled", "submitted", "closed"];
const FLOW = ["draft", "agree", "work", "interim", "closing"] as const;
const FLOW_ICONS = ["pencil", "check", "tools", "clock", "chat"] as const;

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/** Flache Tabelle fuer die Client-Teile. Platzhalter bleiben stehen und werden dort ersetzt. */
function buildLabels(t: Translator): TestProjectLabels {
  const labels: TestProjectLabels = {};
  const groups: Array<[string, string[]]> = [
    ["picker", ["title", "help", "weeks", "free", "freeTitle", "freeText"]],
    ["editor", ["tasks", "tasksHelp", "taskItem", "taskPlaceholderItem", "taskWho", "taskBoth", "taskField", "taskFieldPlaceholder", "addTask", "title", "help", "name", "namePlaceholder", "task", "taskPlaceholder", "weeks", "weeksOption", "weeksOne", "weeksHelp", "roles", "rolesPlaceholder", "note", "notePlaceholder", "done", "doneHelp", "donePlaceholder", "addDone", "rights", "rightsHelp", "addQuestion", "closing", "closingHelp", "itemOn", "remove", "save", "create"]],
    ["contribution", ["title", "help", "own", "placeholder", "suggestions", "suggestionsNone", "save", "other", "otherEmpty", "afterCreate", "resetNote"]],
    ["agreement", ["title", "text", "agreed", "notYet", "agree", "withdraw", "cancel", "incomplete", "unsaved"]],
    ["active", ["cancel", "cancelHelp"]],
    ["interim", ["placeholder", "submit", "update"]],
    ["closing", ["placeholder", "submit", "update", "outcome"]],
  ];
  for (const [group, keys] of groups) for (const key of keys) labels[`${group}.${key}`] = t.raw(`${group}.${key}`) as string;
  // Die Fragen- und Ausgangs-Beschriftungen fuer den Abschluss.
  for (const outcome of ["continue", "found_team", "stop"]) labels[`closing.outcomes.${outcome}`] = t(`closing.outcomes.${outcome}`);
  labels.itemOn = t("editor.itemOn");
  labels.remove = t("editor.remove");
  labels["error.generic"] = t("feedback.error");
  for (const key of ["test_project_version_changed", "test_project_incomplete", "test_project_not_editable", "test_project_already_open", "test_project_phase_locked", "test_project_input_invalid", "test_project_unavailable"]) {
    labels[`error.${key}`] = t(`feedback.errors.${key}`);
  }
  return labels;
}

function Flow({ t, index }: { t: Translator; index: number }) {
  return (
    <ol className="grid grid-cols-5" aria-label={t("title")}>
      {FLOW.map((step, i) => (
        <li key={step} className="relative flex flex-col items-center gap-2 px-1 text-center text-xs font-semibold text-[#33325e] sm:text-[13.5px]">
          {i > 0 ? <span aria-hidden="true" className="absolute left-[-50%] top-[17px] h-[3px] w-full bg-[#e4e2f0] sm:top-[21px]" /> : null}
          <span aria-current={i === index ? "step" : undefined} className={`relative z-[1] inline-flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-[#f7f6fb] sm:h-11 sm:w-11 ${i <= index ? "bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-white" : "bg-[#efeafd] text-[#4a2fb8]"}`}>
            <AppIcon name={i < index ? "check" : FLOW_ICONS[i]} />
          </span>
          {t(`flow.${step}`)}
        </li>
      ))}
    </ol>
  );
}

function ResultsBlock({
  phase, responses, view, meId, t, title,
}: {
  phase: TestProjectPhase;
  responses: TestProjectResponse[];
  view: TestProjectView;
  meId: string;
  t: Translator;
  title: string;
}) {
  const complete = isTestProjectPhaseComplete(responses, phase, view.participantUserIds);
  const byUser = view.participantUserIds.map((id, index) => ({
    id,
    name: view.participantNames[index],
    response: responses.find((entry) => entry.phase === phase && entry.userId === id) ?? null,
  }));
  if (!byUser.some((entry) => entry.response)) return null;
  const questions = byUser.find((entry) => entry.response)?.response?.answers.map((entry) => entry.q) ?? [];
  return (
    <section className={CARD} aria-label={title}>
      <h3 className="text-lg font-semibold text-[#0b1f3a]">{title}</h3>
      {!complete ? <p className="mt-2 text-sm text-[#5f5e7a]">{t(phase === "interim" ? "interim.waiting" : "closing.waiting")}</p> : (
        <>
          <p className="mt-1 text-sm text-[#5f5e7a]">{t("results.help")}</p>
          <div className="mt-4 grid gap-4">
            {questions.map((question, index) => (
              <div key={index} className="rounded-2xl bg-[#f7f6fb] p-4">
                <p className="text-sm font-semibold text-[#0b1f3a]">{question}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {byUser.map((entry) => (
                    <div key={entry.id} className="min-w-0 rounded-xl border border-[#e4e2f0] bg-white p-3">
                      <p className={LABEL}>{t(entry.id === meId ? "results.own" : "results.other", { name: entry.name })}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-[#0b1f3a]"><UserText text={entry.response?.answers[index]?.a.trim() || t("results.noAnswer")} /></p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {phase === "closing" ? (
              <div className="rounded-2xl bg-[#efeafd] p-4">
                <p className="text-sm font-semibold text-[#0b1f3a]">{t("results.outcome")}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {byUser.map((entry) => (
                    <p key={entry.id} className="text-[15px] text-[#0b1f3a]"><span className="font-semibold">{entry.name}:</span> {entry.response?.outcome ? t(`closing.outcomes.${entry.response.outcome}`) : t("results.noAnswer")}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

export default async function TestProjectPage({ params, searchParams }: Props) {
  const { teamId, relationshipId } = await params;
  const { result } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(testProjectHref(teamId, relationshipId))}`);
  const view = await getTestProject(teamId, relationshipId, user.id, supabase);
  if (!view) return <TeamUnavailable teamId={teamId} />;

  const [t, tCapability, teamLabel, rawLocale, vocabulary, ownEntries] = await Promise.all([
    getTranslations("teams.testProject"),
    getTranslations("capability"),
    getTeamLabel(supabase, teamId),
    getLocale(),
    getCapabilityVocabulary(supabase),
    getOwnCapabilityEntries(supabase, user.id),
  ]);
  // Bereichsnamen aus dem Vokabular: Vorschlaege fuer "Bereich" an Aufgaben und Namen der Beitrags-Bereiche.
  const areaLabels = Object.fromEntries(
    vocabulary.areas.map((area) => [area.area_id, tCapability.has(`areaLabels.${area.area_id}`) ? tCapability(`areaLabels.${area.area_id}`) : area.area_id])
  );
  const fieldSuggestions = [...new Set(Object.values(areaLabels))].sort((a, b) => a.localeCompare(b));
  const locale = normalizeLocale(rawLocale);
  const date = new Intl.DateTimeFormat(getPresentationLocale(rawLocale), { dateStyle: "medium" });
  const labels = buildLabels(t);
  const feedback = result ? (FEEDBACK.includes(result) ? result : "error") : null;
  const { current, currentAgreements, currentResponses, previous, previousResponses } = view;

  const participants = view.participantUserIds.map((id, index) => ({
    userId: id,
    name: view.participantNames[index],
    agreed: current ? hasAgreedToCurrentDraft(current, currentAgreements, id) : false,
  }));
  const ownResponse = (phase: TestProjectPhase) => currentResponses.find((entry) => entry.phase === phase && entry.userId === user.id) ?? null;
  const interimDone = isTestProjectPhaseComplete(currentResponses, "interim", view.participantUserIds);
  const flowIndex = !current
    ? (previous?.status === "closed" ? 4 : 0)
    : current.status === "draft"
      ? (participants.some((person) => person.agreed) ? 1 : 0)
      : ownResponse("closing") ? 4 : interimDone ? 3 : 2;

  const rights = TEST_PROJECT_RIGHTS_QUESTIONS.map((q) => q[locale]);
  const closingDefaults = TEST_PROJECT_CLOSING_QUESTIONS.map((q) => q[locale]);
  const daysLeft = current?.status === "active" ? testProjectDaysLeft(current.endsAt) : null;
  const nameOf = (id: string) => view.participantNames[view.participantUserIds.indexOf(id)] ?? "Founder";
  const otherId = view.participantUserIds.find((id) => id !== user.id) ?? "";
  const contributionOf = (list: TestProjectContribution[], id: string) => list.find((entry) => entry.userId === id) ?? { text: "", areaIds: [] };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <TeamPageHeader teamId={teamId} active="overview" title={t("title")} teamLabel={teamLabel} hideTitle />
      <section className="brand-panel relative mt-5 overflow-hidden rounded-[28px] px-6 py-8 sm:px-9">
        <span aria-hidden="true" className="orb -top-14 right-10 hidden h-40 w-40 md:block" />
        <div className="relative flex items-center gap-[18px]">
          <span aria-hidden="true" className="hidden h-14 w-14 flex-none items-center justify-center rounded-[14px] bg-white/20 sm:inline-flex"><AppIcon name="flask" /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
            <h1 className="mt-0.5 text-[30px] font-semibold leading-[1.15] sm:text-[34px]">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-white opacity-95">{t("intro")}</p>
            <p className="mt-3"><span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[13px] font-semibold text-white">{t("pair", { names: view.participantNames.join(" & ") })}</span></p>
          </div>
        </div>
      </section>

      <p role="note" className="mt-5 flex items-start gap-3 rounded-2xl border border-[#f0d28a] bg-[#fff4dc] px-4 py-3 text-sm leading-6 text-[#6b4a00]">
        <span aria-hidden="true" className="mt-0.5 flex-none"><AppIcon name="warn" /></span>
        <span>{t("disclaimer")}</span>
      </p>

      {feedback ? (
        <p role="status" className="mt-5 rounded-xl bg-[#f1f0f7] px-4 py-3 text-sm text-[#33325e]">{t(`feedback.${feedback}`)}</p>
      ) : null}

      <div className="mt-6"><Flow t={t} index={flowIndex} /></div>

      <div className="mt-6 grid gap-5">
        {!current ? (
          <>
            {previous ? (
              <section className={CARD} aria-labelledby="tp-previous-title">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 id="tp-previous-title" className="text-xl font-semibold text-[#0b1f3a]">{t("previous.title")}</h2>
                  <span className="rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-semibold text-[#33325e]">{t(`previous.${previous.status === "closed" ? "closed" : "cancelled"}`)}</span>
                </div>
                <p className="mt-2 text-[15px] font-semibold text-[#0b1f3a]">{previous.title}</p>
                <div className="mt-4 grid gap-4">
                  <ResultsBlock phase="interim" responses={previousResponses} view={view} meId={user.id} t={t} title={t("results.interim")} />
                  <ResultsBlock phase="closing" responses={previousResponses} view={view} meId={user.id} t={t} title={t("results.closing")} />
                </div>
                {previous.status === "closed" ? (
                  <p className="mt-4 text-sm text-[#5f5e7a]">{t("results.next")} <Link href={`/teams/${encodeURIComponent(teamId)}/setup`} className="font-semibold text-[#6d49e0] hover:underline">{t("results.nextLink")}</Link></p>
                ) : null}
              </section>
            ) : null}
            <TestProjectStarter
              teamId={teamId}
              relationshipId={relationshipId}
              participants={participants}
              labels={labels}
              freeIcon="spark"
              rights={rights}
              closing={closingDefaults}
              fieldSuggestions={fieldSuggestions}
              templates={TEST_PROJECT_TEMPLATES.map((template) => ({
                key: template.key,
                icon: template.icon,
                tone: template.tone,
                weeks: template.weeks,
                title: template.title[locale],
                task: template.task[locale],
                roles: template.roles[locale],
                done: template.done.map((item) => item[locale]),
              }))}
            />
          </>
        ) : current.status === "draft" ? (
          <TestProjectEditor
            teamId={teamId}
            relationshipId={relationshipId}
            projectId={current.id}
            version={current.draftVersion}
            participants={participants}
            fieldSuggestions={fieldSuggestions}
            ownAgreed={hasAgreedToCurrentDraft(current, currentAgreements, user.id)}
            labels={labels}
            contribution={{
              own: contributionOf(view.currentContributions, user.id),
              other: { name: nameOf(otherId), ...contributionOf(view.currentContributions, otherId) },
              suggestions: contributionSuggestions(ownEntries).filter((id) => id in areaLabels),
              areaLabels,
            }}
            initial={{
              templateKey: current.templateKey,
              title: current.title,
              task: current.task,
              weeks: current.weeks,
              roles: current.roles,
              note: current.note,
              done: current.doneItems,
              rights: current.rightsItems,
              closing: current.closingItems,
              tasks: current.taskItems,
            }}
          />
        ) : (
          <>
            <section className={CARD} aria-labelledby="tp-active-title">
              <div className="flex items-start gap-3.5">
                <IconTile name="rocket" tone="green" />
                <div className="min-w-0">
                  <h2 id="tp-active-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{current.title}</h2>
                  <p className="mt-1 text-sm text-[#5f5e7a]">
                    {daysLeft === 0 ? t("active.endsToday") : daysLeft === 1 ? t("active.daysLeftOne") : t("active.daysLeft", { count: daysLeft ?? 0 })}
                    {current.endsAt ? ` · ${t("active.until", { date: date.format(new Date(current.endsAt)) })}` : ""}
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <div><dt className={LABEL}>{t("active.task")}</dt><dd className="mt-1 whitespace-pre-wrap text-[15px] leading-6"><UserText text={current.task} /></dd></div>
                {current.roles ? <div><dt className={LABEL}>{t("active.roles")}</dt><dd className="mt-1 whitespace-pre-wrap text-[15px] leading-6"><UserText text={current.roles} /></dd></div> : null}
                <div><dt className={LABEL}>{t("active.done")}</dt><dd className="mt-1"><ul className="list-disc pl-5 text-[15px] leading-6">{activeTestProjectItems(current.doneItems).map((item, i) => <li key={i}>{item.t}</li>)}</ul></dd></div>
                {current.note ? <div><dt className={LABEL}>{t("active.note")}</dt><dd className="mt-1 whitespace-pre-wrap text-[15px] leading-6"><UserText text={current.note} /></dd></div> : null}
                {activeTestProjectItems(current.rightsItems).length ? <div className="sm:col-span-2"><dt className={LABEL}>{t("active.rights")}</dt><dd className="mt-1"><ul className="list-disc pl-5 text-[15px] leading-6">{activeTestProjectItems(current.rightsItems).map((item, i) => <li key={i}>{item.t}</li>)}</ul></dd></div> : null}
              </dl>
              {current.taskItems.length ? (
                <div className="mt-5">
                  <p className={LABEL}>{t("active.tasks")}</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {groupTestProjectTasks(current.taskItems, view.participantUserIds).map((group) => (
                      <div key={group.who} className="rounded-2xl bg-[#f7f6fb] p-4">
                        <p className="text-sm font-semibold text-[#0b1f3a]">{group.who === TEST_PROJECT_BOTH ? t("active.both") : group.who === user.id ? t("active.you") : nameOf(group.who)}</p>
                        <ul className="mt-2 grid gap-1.5 text-[15px] leading-6">
                          {group.tasks.map((task, i) => (
                            <li key={i}>{task.t}{task.f ? <span className="ml-1.5 rounded-full bg-white px-2 py-0.5 text-[13px] text-[#5f5e7a]">{task.f}</span> : null}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {view.currentContributions.length ? (
                <div className="mt-5">
                  <p className={LABEL}>{t("active.contributions")}</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {view.participantUserIds.filter((id) => view.currentContributions.some((entry) => entry.userId === id)).map((id) => {
                      const entry = contributionOf(view.currentContributions, id);
                      return (
                        <div key={id} className="rounded-2xl bg-[#f7f6fb] p-4">
                          <p className="text-sm font-semibold text-[#0b1f3a]">{id === user.id ? t("active.you") : nameOf(id)}</p>
                          {entry.text ? <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6"><UserText text={entry.text} /></p> : null}
                          {entry.areaIds.length ? (
                            <ul className="mt-2 flex flex-wrap gap-1.5">{entry.areaIds.map((areaId) => <li key={areaId} className="rounded-full bg-white px-3 py-1 text-sm text-[#33325e]">{areaLabels[areaId] ?? areaId}</li>)}</ul>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <p className="mt-4 text-[13px] text-[#5f5e7a]">{t("active.frozen")}</p>
            </section>

            <section className={CARD} aria-labelledby="tp-interim-title">
              <h2 id="tp-interim-title" className="text-xl font-semibold text-[#0b1f3a]">{t("interim.title")}</h2>
              <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{t("interim.help")}</p>
              <div className="mt-4">
                <TestProjectResponseForm
                  teamId={teamId} relationshipId={relationshipId} projectId={current.id} phase="interim"
                  questions={TEST_PROJECT_INTERIM_QUESTIONS.map((q) => q[locale])}
                  initialAnswers={ownResponse("interim")?.answers.map((entry) => entry.a) ?? []}
                  initialOutcome={null} locked={interimDone} labels={labels}
                />
                {interimDone ? <p className="mt-3 text-sm text-[#5f5e7a]">{t("interim.locked")}</p> : ownResponse("interim") ? <p className="mt-3 text-sm text-[#5f5e7a]">{t("interim.waiting")}</p> : null}
              </div>
            </section>
            <ResultsBlock phase="interim" responses={currentResponses} view={view} meId={user.id} t={t} title={t("results.interim")} />

            <section className={CARD} aria-labelledby="tp-closing-title">
              <h2 id="tp-closing-title" className="text-xl font-semibold text-[#0b1f3a]">{t("closing.title")}</h2>
              <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{t("closing.help")}</p>
              <div className="mt-4">
                <TestProjectResponseForm
                  teamId={teamId} relationshipId={relationshipId} projectId={current.id} phase="closing"
                  questions={(activeTestProjectItems(current.closingItems).map((item) => item.t).length ? activeTestProjectItems(current.closingItems).map((item) => item.t) : closingDefaults)}
                  initialAnswers={ownResponse("closing")?.answers.map((entry) => entry.a) ?? []}
                  initialOutcome={ownResponse("closing")?.outcome ?? null} locked={false} labels={labels}
                />
              </div>
            </section>
            <ResultsBlock phase="closing" responses={currentResponses} view={view} meId={user.id} t={t} title={t("results.closing")} />

            <TestProjectCancelButton teamId={teamId} relationshipId={relationshipId} projectId={current.id} labels={labels} />
          </>
        )}
      </div>
    </main>
  );
}
