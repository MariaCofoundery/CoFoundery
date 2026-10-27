import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { AppIcon, IconTile, type IconName, type IconTone } from "@/features/ui/Icons";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { normalizeLocale } from "@/i18n/config";
import { getTeamCheckIn, type CheckInDetail, type TeamCheckInView } from "@/features/checkIn/checkInData";
import { CHECK_IN_RETRO_QUESTIONS } from "@/features/checkIn/checkInDefaults";
import {
  checkInHref,
  checkInSetupTopicHref,
  isCheckInDue,
  isRetroComplete,
  summarizeCheckIn,
} from "@/features/checkIn/checkInModel";
import {
  CheckInIntervalControl,
  CheckInOpenForm,
  CheckInRetro,
  CheckInStartButtons,
  CheckInTalkLink,
  type CheckInLabels,
  type CheckInRetroState,
  type CheckInTopicCard,
} from "@/features/checkIn/CheckInClient";

type Props = { params: Promise<{ teamId: string }>; searchParams: Promise<{ result?: string }> };

const CARD = "rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-[26px]";
const LABEL = "text-[13px] font-semibold uppercase tracking-[0.06em] text-[#5f5e7a]";
const FEEDBACK = ["started", "submitted", "closed", "skipped", "interval", "topic", "retro"];
const TONES: IconTone[] = ["violet", "teal", "amber", "blue", "green", "pink"];
const ICONS: IconName[] = ["scale", "clock", "chat", "heart", "check", "link"];

type Translator = Awaited<ReturnType<typeof getTranslations>>;

function buildLabels(t: Translator): CheckInLabels {
  const labels: CheckInLabels = {};
  const groups: Array<[string, string[]]> = [
    ["settings", ["label", "option", "help"]],
    ["due", ["start", "skip"]],
    ["open", ["title", "help", "question", "note", "notePlaceholder", "viewAgreement", "includeLabel", "excluded", "customPlaceholder", "customAdd", "frozen", "progress", "submit", "mine", "submitted", "notYet", "discard", "allAnswered"]],
    ["agreement", ["meta", "metaUnknown", "custom", "close", "toTopic", "empty"]],
    ["retro", ["title", "help", "offer", "questions", "questionsHelp", "addQuestion", "itemOn", "remove", "invite", "join", "decline", "offeredByYou", "in", "out", "open", "needTwo", "running", "answerPlaceholder", "submit", "update", "waiting", "locked", "notIn"]],
  ];
  for (const [group, keys] of groups) for (const key of keys) labels[`${group}.${key}`] = t.raw(`${group}.${key}`) as string;
  for (const answer of ["same", "partly", "talk"]) labels[`open.answers.${answer}`] = t(`open.answers.${answer}`);
  labels["error.generic"] = t("feedback.error");
  for (const key of ["team_check_in_already_open", "team_check_in_no_topics", "team_check_in_not_editable", "team_check_in_already_submitted", "team_check_in_input_invalid", "team_check_in_phase_locked", "team_check_in_retro_already_offered", "team_check_in_unavailable"]) {
    labels[`error.${key}`] = t(`feedback.errors.${key}`);
  }
  return labels;
}

export default async function CheckInPage({ params, searchParams }: Props) {
  const { teamId } = await params;
  const { result } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(checkInHref(teamId))}`);
  const view = await getTeamCheckIn(teamId, user.id, supabase);
  // Eigener Erinnerungsstatus (Zeilensicherheit: nur die eigenen Zeilen). Fehlt etwas, gilt
  // der Standard: Mitteilung an, Mail aus.
  const [optOutResult, optInResult, pushResult] = await Promise.all([
    supabase.from("notification_opt_outs").select("kind").eq("user_id", user.id).eq("kind", "team_check_in").maybeSingle(),
    supabase.from("notification_opt_ins").select("kind").eq("user_id", user.id).eq("kind", "team_check_in_email").maybeSingle(),
    supabase.from("push_subscriptions").select("user_id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const reminderState: "off" | "email" | "push" | "none" = optOutResult.data
    ? "off"
    : optInResult.data
      ? "email"
      : (pushResult.count ?? 0) > 0
        ? "push"
        : "none";
  if (!view) return <TeamUnavailable teamId={teamId} />;

  const [t, setupT, teamLabel, rawLocale] = await Promise.all([
    getTranslations("teams.checkIn"),
    getTranslations("teams.setup"),
    getTeamLabel(supabase, teamId),
    getLocale(),
  ]);
  const locale = normalizeLocale(rawLocale);
  const dateFormat = new Intl.DateTimeFormat(getPresentationLocale(rawLocale), { dateStyle: "medium" });
  const labels = buildLabels(t);
  const feedback = result ? (FEEDBACK.includes(result) ? result : "error") : null;

  const nameOf = (id: string) => view.members.find((member) => member.userId === id)?.displayName ?? "Founder";
  const memberIds = view.members.map((member) => member.userId);
  const topicTitle = (topic: CheckInDetail["topics"][number]) =>
    topic.itemKey ? setupT(`items.${topic.itemKey}.title`) : topic.customText ?? "";
  const { open, lastClosed } = view;
  const due = view.due;
  const isDue = isCheckInDue(due);

  const topicCards = (detail: CheckInDetail): CheckInTopicCard[] =>
    detail.topics.map((topic, index) => ({
      id: topic.id,
      title: topicTitle(topic),
      itemKey: topic.itemKey,
      icon: ICONS[index % ICONS.length],
      tone: TONES[index % TONES.length],
      included: topic.included,
      agreedNote: topic.itemKey ? detail.agreedText[topic.itemKey]?.note ?? null : null,
      agreedOn: topic.itemKey && detail.agreedText[topic.itemKey]?.confirmedAt ? dateFormat.format(new Date(detail.agreedText[topic.itemKey].confirmedAt as string)) : null,
      setupHref: topic.itemKey ? checkInSetupTopicHref(teamId, topic.itemKey) : null,
    }));

  const retroTarget = open ?? lastClosed;
  const retroState = (detail: CheckInDetail): CheckInRetroState => {
    const invites = detail.retroInvites;
    const questions = detail.checkIn.retroQuestions.filter((item) => item.on && item.t.trim() !== "").map((item) => item.t);
    return {
      offeredBy: detail.checkIn.retroOfferedBy,
      offeredByName: detail.checkIn.retroOfferedBy ? nameOf(detail.checkIn.retroOfferedBy) : null,
      ownResponse: invites.find((invite) => invite.userId === user.id)?.response ?? null,
      isOfferer: detail.checkIn.retroOfferedBy === user.id,
      statuses: memberIds.map((id) => ({ userId: id, name: nameOf(id), response: invites.find((invite) => invite.userId === id)?.response ?? null })),
      participantCount: invites.filter((invite) => invite.response === "in").length,
      complete: isRetroComplete(invites, detail.retroAnswers),
      questions,
      ownAnswers: detail.retroAnswers.find((entry) => entry.userId === user.id)?.answers.map((entry) => entry.a) ?? [],
    };
  };

  const closedSummary = lastClosed ? summarizeCheckIn(lastClosed.topics, lastClosed.answers, memberIds) : [];
  const notable = closedSummary.filter((entry) => entry.notable);
  const calm = closedSummary.filter((entry) => !entry.notable);
  const topicOf = (detail: CheckInDetail, id: string) => detail.topics.find((topic) => topic.id === id);
  const AnswerList = ({ detail, entry }: { detail: CheckInDetail; entry: (typeof closedSummary)[number] }) => (
    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
      {entry.answers.map((answer) => (
        <li key={answer.userId} className="min-w-0 rounded-xl border border-[#e4e2f0] bg-white p-3">
          <p className={LABEL}>{t(answer.userId === user.id ? "results.own" : "results.other", { name: nameOf(answer.userId) })}</p>
          <p className="mt-1 text-[15px] font-semibold text-[#0b1f3a]">{t(`open.answers.${answer.answer}`)}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#5f5e7a]">{answer.note.trim() || t("results.noNote")}</p>
        </li>
      ))}
      {topicOf(detail, entry.topicId)?.itemKey && entry.answers.some((answer) => answer.answer === "talk") ? (
        <li className="flex items-center"><CheckInTalkLink href={checkInSetupTopicHref(teamId, topicOf(detail, entry.topicId)?.itemKey as string)} label={t("results.talk")} /></li>
      ) : null}
    </ul>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <TeamPageHeader teamId={teamId} active="checkin" title={t("title")} teamLabel={teamLabel} hideTitle />
      <section className="brand-panel relative mt-5 overflow-hidden rounded-[28px] px-6 py-8 sm:px-9">
        <span aria-hidden="true" className="orb -top-14 right-10 hidden h-40 w-40 md:block" />
        <div className="relative flex items-center gap-[18px]">
          <span aria-hidden="true" className="hidden h-14 w-14 flex-none items-center justify-center rounded-[14px] bg-white/20 sm:inline-flex"><AppIcon name="clock" /></span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
            <h1 className="mt-0.5 text-[30px] font-semibold leading-[1.15] sm:text-[34px]">{t("title")}</h1>
            <p className="mt-2 max-w-2xl text-base leading-7 text-white opacity-95">{t("intro")}</p>
          </div>
        </div>
      </section>
      <p className="mt-3 text-[13px] text-[#5f5e7a]">{t("disclaimer")}</p>

      {feedback ? <p role="status" className="mt-4 rounded-xl bg-[#f1f0f7] px-4 py-3 text-sm text-[#33325e]">{t(`feedback.${feedback}`)}</p> : null}

      <div className="mt-6 grid gap-5">
        {open ? (
          <CheckInOpenForm
            teamId={teamId}
            checkInId={open.checkIn.id}
            topics={topicCards(open)}
            canEditTopics={open.submittedUserIds.length === 0}
            submitted={open.submittedUserIds.includes(user.id)}
            members={view.members.map((member) => ({ userId: member.userId, name: member.displayName ?? "Founder", submitted: open.submittedUserIds.includes(member.userId) }))}
            labels={labels}
          />
        ) : (
          <section className={CARD} aria-labelledby="ci-due-title">
            <div className="flex items-start gap-3.5">
              <IconTile name="clock" tone={isDue ? "amber" : "violet"} />
              <div className="min-w-0">
                <h2 id="ci-due-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">
                  {view.eligibleCount === 0 ? t("due.none") : isDue ? t("due.now") : due ? t("due.on", { date: dateFormat.format(due) }) : t("due.none")}
                </h2>
              </div>
            </div>
            {view.eligibleCount === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[#5f5e7a]">{t("noTopics")} <Link href={`/teams/${encodeURIComponent(teamId)}/setup`} className="font-semibold text-[#6d49e0] hover:underline">{t("toSetup")}</Link></p>
            ) : (
              <div className="mt-4"><CheckInStartButtons teamId={teamId} canStart={view.eligibleCount > 0} labels={labels} /></div>
            )}
          </section>
        )}

        {lastClosed ? (
          <section className={CARD} aria-labelledby="ci-results-title">
            <h2 id="ci-results-title" className="text-xl font-semibold text-[#0b1f3a]">{t("results.title")}</h2>
            <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{t("results.help")}{lastClosed.checkIn.closedAt ? ` · ${t("results.closedOn", { date: dateFormat.format(new Date(lastClosed.checkIn.closedAt)) })}` : ""}</p>
            {notable.length === 0 ? <p className="mt-4 rounded-2xl bg-[#e3f6ec] px-4 py-3 text-sm text-[#17794a]">{t("results.nothing")}</p> : (
              <ul className="mt-4 grid gap-4">
                {notable.map((entry) => {
                  const topic = topicOf(lastClosed, entry.topicId);
                  return (
                    <li key={entry.topicId} className="rounded-2xl bg-[#f7f6fb] p-4">
                      <p className="text-base font-semibold text-[#0b1f3a]">{topic ? topicTitle(topic) : ""}</p>
                      <AnswerList detail={lastClosed} entry={entry} />
                    </li>
                  );
                })}
              </ul>
            )}
            {calm.length > 0 ? (
              <details className="mt-4 rounded-2xl border border-[#e4e2f0] px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#33325e]">{t("results.calm", { count: calm.length })}</summary>
                <ul className="mt-3 grid gap-3">
                  {calm.map((entry) => {
                    const topic = topicOf(lastClosed, entry.topicId);
                    return (
                      <li key={entry.topicId}>
                        <p className="text-sm font-semibold text-[#0b1f3a]">{topic ? topicTitle(topic) : ""}</p>
                        <AnswerList detail={lastClosed} entry={entry} />
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
          </section>
        ) : null}

        {retroTarget ? (() => {
          const state = retroState(retroTarget);
          const participant = state.ownResponse === "in";
          const grid = retroTarget.retroAnswers.filter((entry) => state.complete && participant && retroTarget.retroInvites.some((invite) => invite.userId === entry.userId && invite.response === "in"));
          const rows = state.questions.map((question, index) => ({ question, byUser: grid.map((entry) => ({ id: entry.userId, answer: entry.answers[index]?.a ?? "" })) }));
          return (
            <>
              <CheckInRetro teamId={teamId} checkInId={retroTarget.checkIn.id} state={state} labels={labels} defaults={CHECK_IN_RETRO_QUESTIONS.map((q) => q[locale])} />
              {rows.length > 0 && grid.length >= 2 ? (
                <section className={CARD} aria-labelledby="ci-retro-results-title">
                  <h2 id="ci-retro-results-title" className="text-xl font-semibold text-[#0b1f3a]">{t("retro.resultsTitle")}</h2>
                  <p className="mt-1 text-sm text-[#5f5e7a]">{t("retro.resultsHelp")}</p>
                  <div className="mt-4 grid gap-4">
                    {rows.map((row, index) => (
                      <div key={index} className="rounded-2xl bg-[#f7f6fb] p-4">
                        <p className="text-sm font-semibold text-[#0b1f3a]">{row.question}</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {row.byUser.map((entry) => (
                            <div key={entry.id} className="min-w-0 rounded-xl border border-[#e4e2f0] bg-white p-3">
                              <p className={LABEL}>{t(entry.id === user.id ? "results.own" : "results.other", { name: nameOf(entry.id) })}</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-[#0b1f3a]">{entry.answer.trim() || t("retro.noAnswer")}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          );
        })() : null}

        <section className={CARD} aria-labelledby="ci-settings-title">
          <h2 id="ci-settings-title" className="text-xl font-semibold text-[#0b1f3a]">{t("settings.title")}</h2>
          <div className="mt-3"><CheckInIntervalControl teamId={teamId} current={view.intervalDays} labels={labels} /></div>
          <div className="mt-4 rounded-2xl bg-[#f7f6fb] px-4 py-3 text-[13.5px] leading-6 text-[#3f3e5a]">
            <p className="font-semibold text-[#0b1f3a]">{t("reminders.title")}</p>
            <p className="mt-1">{t(`reminders.state.${reminderState}`)}</p>
            <p className="mt-1 text-[#5f5e7a]">{t("reminders.missWarning")}</p>
            <Link href="/account#post" className="mt-2 inline-block font-semibold text-[#6d49e0] underline underline-offset-2">
              {t("reminders.link")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
