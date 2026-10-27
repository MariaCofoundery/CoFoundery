"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { IconTile, type IconName, type IconTone } from "@/features/ui/Icons";
import { SwitchTrack } from "@/features/account/accountUi";
import { EditableList } from "@/features/testProject/TestProjectClient";
import {
  addCheckInTopicAction,
  offerRetroAction,
  respondRetroAction,
  setCheckInIntervalAction,
  setCheckInTopicIncludedAction,
  skipCheckInAction,
  startCheckInAction,
  submitCheckInAction,
  submitRetroAction,
  type CheckInActionResult,
} from "@/features/checkIn/checkInActions";
import { CHECK_IN_ANSWERS, CHECK_IN_INTERVALS, CHECK_IN_LIMITS, checkInHref, type CheckInItem } from "@/features/checkIn/checkInModel";

const CARD = "rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-[26px]";
const INPUT = "mt-2 min-h-11 w-full rounded-xl border border-[#d8d5ea] bg-white px-3.5 py-2 text-[15px] text-[#0b1f3a] outline-none focus:border-[#6d49e0] focus:ring-4 focus:ring-[#6d49e0]/15";
const BTN = "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45";
const BTN_SECONDARY = "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8d5ea] bg-white px-[18px] text-[15px] font-semibold text-[#0b1f3a] hover:border-[#6d49e0] disabled:cursor-not-allowed disabled:opacity-45";
const LABEL = "text-[13px] font-semibold uppercase tracking-[0.06em] text-[#5f5e7a]";

export type CheckInLabels = Record<string, string>;
const fill = (text: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((acc, [key, value]) => acc.replace(`{${key}}`, String(value)), text);

function useRun(teamId: string, labels: CheckInLabels) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(task: () => Promise<CheckInActionResult>, result?: string | ((r: Extract<CheckInActionResult, { ok: true }>) => string | undefined)) {
    setError(null);
    startTransition(async () => {
      const outcome = await task();
      if (!outcome.ok) {
        setError(labels[`error.${outcome.error}`] ?? labels["error.generic"]);
        return;
      }
      const key = typeof result === "function" ? result(outcome) : result;
      if (key) router.replace(checkInHref(teamId, key));
      router.refresh();
    });
  }
  return { run, pending, error };
}

const ErrorLine = ({ error }: { error: string | null }) =>
  error ? <p role="alert" className="rounded-xl bg-[#fdecec] px-4 py-3 text-sm text-[#9b1c1c]">{error}</p> : null;

export function CheckInIntervalControl({ teamId, current, labels }: { teamId: string; current: number; labels: CheckInLabels }) {
  const { run, pending, error } = useRun(teamId, labels);
  return (
    <div>
      <fieldset disabled={pending}>
        <legend className={LABEL}>{labels["settings.label"]}</legend>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {CHECK_IN_INTERVALS.map((days) => (
            <label key={days} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-[15px] ${current === days ? "border-[#6d49e0] bg-[#efeafd]" : "border-[#e4e2f0] bg-white"}`}>
              <input type="radio" name="interval" className="accent-[#6d49e0]" checked={current === days} onChange={() => run(() => setCheckInIntervalAction(teamId, days), "interval")} />
              {fill(labels["settings.option"], { days })}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-2 text-[13px] leading-5 text-[#5f5e7a]">{labels["settings.help"]}</p>
      <div className="mt-2"><ErrorLine error={error} /></div>
    </div>
  );
}

export function CheckInStartButtons({ teamId, canStart, labels }: { teamId: string; canStart: boolean; labels: CheckInLabels }) {
  const { run, pending, error } = useRun(teamId, labels);
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className={BTN} disabled={pending || !canStart} onClick={() => run(() => startCheckInAction(teamId), "started")}>{labels["due.start"]}</button>
        <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => skipCheckInAction(teamId), "skipped")}>{labels["due.skip"]}</button>
      </div>
      <div className="mt-3"><ErrorLine error={error} /></div>
    </div>
  );
}

export type CheckInTopicCard = {
  id: string;
  title: string;
  itemKey: string | null;
  icon: IconName;
  tone: IconTone;
  included: boolean;
  agreedNote: string | null;
  agreedOn: string | null;
  setupHref: string | null;
};

export type CheckInMemberStatus = { userId: string; name: string; submitted: boolean };

/** Das Popup mit dem bestaetigten Text: man weiss ja nicht mehr, was vereinbart war. */
function AgreementDialog({ topic, labels, onClose }: { topic: CheckInTopicCard; labels: CheckInLabels; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f3a]/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="ci-agreement-title" className="grid max-h-[90vh] w-full max-w-lg gap-3 overflow-auto rounded-[24px] border border-[#e4e2f0] bg-white p-6" onClick={(event) => event.stopPropagation()}>
        <h2 id="ci-agreement-title" className="text-xl font-semibold text-[#0b1f3a]">{topic.title}</h2>
        <p className="text-sm text-[#5f5e7a]">{topic.itemKey ? (topic.agreedOn ? fill(labels["agreement.meta"], { date: topic.agreedOn }) : labels["agreement.metaUnknown"]) : labels["agreement.custom"]}</p>
        {topic.itemKey ? <p className="whitespace-pre-wrap rounded-r-xl border-l-4 border-[#6d49e0] bg-[#efeafd] px-4 py-2.5 text-[15px] leading-6 text-[#0b1f3a]">{topic.agreedNote?.trim() || labels["agreement.empty"]}</p> : null}
        <div className="flex flex-wrap gap-3">
          {topic.setupHref ? <Link href={topic.setupHref} className={BTN_SECONDARY}>{labels["agreement.toTopic"]}</Link> : null}
          <button type="button" className={BTN} onClick={onClose} autoFocus>{labels["agreement.close"]}</button>
        </div>
      </div>
    </div>
  );
}

export function CheckInOpenForm({
  teamId, checkInId, topics, canEditTopics, submitted, members, labels,
}: {
  teamId: string;
  checkInId: string;
  topics: CheckInTopicCard[];
  canEditTopics: boolean;
  submitted: boolean;
  members: CheckInMemberStatus[];
  labels: CheckInLabels;
}) {
  const { run, pending, error } = useRun(teamId, labels);
  const [answers, setAnswers] = useState<Record<string, { answer: string; note: string }>>({});
  const [custom, setCustom] = useState("");
  const [viewing, setViewing] = useState<CheckInTopicCard | null>(null);
  const included = topics.filter((topic) => topic.included);
  const answered = included.filter((topic) => answers[topic.id]?.answer).length;
  const ready = included.length > 0 && answered === included.length;

  return (
    <section className={CARD} aria-labelledby="ci-open-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="ci-open-title" className="text-xl font-semibold text-[#0b1f3a]">{labels["open.title"]}</h2>
          <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{labels["open.help"]}</p>
        </div>
        {!submitted ? (
          <p aria-live="polite" className="rounded-full bg-[#efeafd] px-3 py-1 text-sm font-semibold text-[#4a2fb8]">{fill(labels["open.progress"], { done: answered, total: included.length })}</p>
        ) : null}
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {members.map((member) => (
          <li key={member.userId} className={`rounded-full px-3 py-1 text-sm font-semibold ${member.submitted ? "bg-[#e3f6ec] text-[#17794a]" : "bg-[#f1f0f7] text-[#33325e]"}`}>
            {fill(labels[member.submitted ? "open.submitted" : "open.notYet"], { name: member.name })}
          </li>
        ))}
      </ul>

      <ul className="mt-5 grid gap-3">
        {topics.map((topic) => (
          <li key={topic.id} className={`rounded-[18px] border border-[#e4e2f0] p-4 ${topic.included ? "bg-white" : "bg-[#f7f6fb] opacity-70"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <IconTile name={topic.icon} tone={topic.tone} />
                <span className="text-base font-semibold text-[#0b1f3a]">{topic.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" className={`${BTN_SECONDARY} min-h-9 px-3.5 text-sm`} onClick={() => setViewing(topic)}>{labels["open.viewAgreement"]}</button>
                {canEditTopics && !submitted ? (
                  <label className="inline-flex cursor-pointer items-center" title={labels["open.includeLabel"]}>
                    <input type="checkbox" className="peer sr-only" checked={topic.included} disabled={pending} aria-label={`${labels["open.includeLabel"]}: ${topic.title}`} onChange={(event) => run(() => setCheckInTopicIncludedAction(teamId, topic.id, event.target.checked))} />
                    <SwitchTrack />
                  </label>
                ) : null}
              </div>
            </div>
            {!topic.included ? <p className="mt-2 text-sm text-[#5f5e7a]">{labels["open.excluded"]}</p> : null}
            {topic.included && !submitted ? (
              <div className="mt-3 grid gap-3">
                <p className="text-sm text-[#5f5e7a]">{labels["open.question"]}</p>
                <div role="radiogroup" aria-label={topic.title} className="flex flex-wrap gap-2">
                  {CHECK_IN_ANSWERS.map((answer) => (
                    <label key={answer} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-[14.5px] ${answers[topic.id]?.answer === answer ? "border-[#6d49e0] bg-[#efeafd]" : "border-[#e4e2f0] bg-white"}`}>
                      <input type="radio" name={`a-${topic.id}`} className="accent-[#6d49e0]" checked={answers[topic.id]?.answer === answer} onChange={() => setAnswers((current) => ({ ...current, [topic.id]: { answer, note: current[topic.id]?.note ?? "" } }))} />
                      {labels[`open.answers.${answer}`]}
                    </label>
                  ))}
                </div>
                <label className="text-[13px] font-semibold text-[#5f5e7a]">{labels["open.note"]}
                  <input type="text" className={INPUT} maxLength={CHECK_IN_LIMITS.note} placeholder={labels["open.notePlaceholder"]} value={answers[topic.id]?.note ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [topic.id]: { answer: current[topic.id]?.answer ?? "", note: event.target.value } }))} />
                </label>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canEditTopics && !submitted ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <input type="text" aria-label={labels["open.customPlaceholder"]} className={`${INPUT} mt-0 min-w-[220px] flex-1`} maxLength={CHECK_IN_LIMITS.customTopic} placeholder={labels["open.customPlaceholder"]} value={custom} onChange={(event) => setCustom(event.target.value)} />
          <button type="button" className={BTN_SECONDARY} disabled={pending || custom.trim() === ""} onClick={() => { const text = custom; setCustom(""); run(() => addCheckInTopicAction(teamId, checkInId, text)); }}>{labels["open.customAdd"]}</button>
        </div>
      ) : null}
      {!submitted && canEditTopics ? <p className="mt-2 text-[13px] text-[#5f5e7a]">{labels["open.frozen"]}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {submitted ? (
          <p className="text-sm text-[#5f5e7a]">{labels["open.mine"]}</p>
        ) : (
          <button type="button" className={BTN} disabled={pending || !ready} onClick={() => run(
            () => submitCheckInAction(teamId, checkInId, included.map((topic) => ({ topicId: topic.id, answer: answers[topic.id]?.answer ?? "", note: answers[topic.id]?.note ?? "" }))),
            (result) => (result.status === "closed" ? "closed" : "submitted")
          )}>{labels["open.submit"]}</button>
        )}
        <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => skipCheckInAction(teamId), "skipped")}>{labels["open.discard"]}</button>
      </div>
      {!submitted && !ready ? <p className="mt-2 text-[13px] text-[#5f5e7a]">{labels["open.allAnswered"]}</p> : null}
      <div className="mt-3"><ErrorLine error={error} /></div>
      {viewing ? <AgreementDialog topic={viewing} labels={labels} onClose={() => setViewing(null)} /> : null}
    </section>
  );
}

/** Zum Thema im Setup, wenn jemand sprechen moechte. */
export function CheckInTalkLink({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="text-sm font-semibold text-[#6d49e0] hover:underline">{label}</Link>;
}

export type CheckInRetroState = {
  offeredBy: string | null;
  offeredByName: string | null;
  ownResponse: "in" | "out" | null;
  isOfferer: boolean;
  statuses: Array<{ userId: string; name: string; response: "in" | "out" | null }>;
  participantCount: number;
  complete: boolean;
  questions: string[];
  ownAnswers: string[];
};

export function CheckInRetro({
  teamId, checkInId, state, defaults, labels,
}: {
  teamId: string;
  checkInId: string;
  state: CheckInRetroState;
  defaults: string[];
  labels: CheckInLabels;
}) {
  const { run, pending, error } = useRun(teamId, labels);
  const [items, setItems] = useState<CheckInItem[]>(() => defaults.map((t) => ({ t, on: true })));
  const [answers, setAnswers] = useState<string[]>(() => state.questions.map((_, index) => state.ownAnswers[index] ?? ""));
  const retroLabels = { itemOn: labels["retro.itemOn"], remove: labels["retro.remove"] };

  return (
    <section className={CARD} aria-labelledby="ci-retro-title">
      <div className="flex items-start gap-3.5">
        <IconTile name="chat" tone="teal" />
        <div className="min-w-0">
          <h2 id="ci-retro-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{labels["retro.title"]}</h2>
          <p className="mt-1 text-sm leading-6 text-[#5f5e7a]">{labels["retro.help"]}</p>
        </div>
      </div>

      {!state.offeredBy ? (
        <div className="mt-4 grid gap-3">
          <p className={LABEL}>{labels["retro.questions"]}</p>
          <EditableList items={items} onChange={setItems} labels={retroLabels} addLabel={labels["retro.addQuestion"]} />
          <p className="text-[13px] leading-5 text-[#5f5e7a]">{labels["retro.questionsHelp"]}</p>
          <div><button type="button" className={BTN} disabled={pending || !items.some((item) => item.on && item.t.trim() !== "")} onClick={() => run(() => offerRetroAction(teamId, checkInId, items), "retro")}>{labels["retro.offer"]}</button></div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {!state.isOfferer && state.ownResponse === null ? (
            <div className="rounded-2xl border border-[#d9cff8] bg-[#f5f2fe] p-4">
              <p className="text-[15px] leading-6 text-[#0b1f3a]">{fill(labels["retro.invite"], { name: state.offeredByName ?? "" })}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" className={BTN} disabled={pending} onClick={() => run(() => respondRetroAction(teamId, checkInId, true), "retro")}>{labels["retro.join"]}</button>
                <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => run(() => respondRetroAction(teamId, checkInId, false), "retro")}>{labels["retro.decline"]}</button>
              </div>
            </div>
          ) : null}
          {state.isOfferer ? <p className="text-sm text-[#5f5e7a]">{labels["retro.offeredByYou"]}</p> : null}
          <ul className="flex flex-wrap gap-2">
            {state.statuses.map((status) => (
              <li key={status.userId} className={`rounded-full px-3 py-1 text-sm font-semibold ${status.response === "in" ? "bg-[#e3f6ec] text-[#17794a]" : "bg-[#f1f0f7] text-[#33325e]"}`}>
                {fill(labels[`retro.${status.response ?? "open"}`], { name: status.name })}
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#5f5e7a]">{state.participantCount >= 2 ? fill(labels["retro.running"], { count: state.participantCount }) : labels["retro.needTwo"]}</p>
          {state.ownResponse === "out" ? <p className="text-sm text-[#5f5e7a]">{labels["retro.notIn"]}</p> : null}

          {state.ownResponse === "in" && state.participantCount >= 2 ? (
            <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => submitRetroAction(teamId, checkInId, state.questions.map((q, index) => ({ q, a: answers[index] ?? "" }))), "retro"); }}>
              {state.questions.map((question, index) => (
                <label key={index} className="text-sm font-medium text-[#33325e]">{question}
                  <textarea className={`${INPUT} min-h-24`} maxLength={CHECK_IN_LIMITS.retroAnswer} disabled={state.complete} placeholder={labels["retro.answerPlaceholder"]} value={answers[index] ?? ""} onChange={(event) => setAnswers((current) => current.map((value, i) => (i === index ? event.target.value : value)))} />
                </label>
              ))}
              {state.complete ? <p className="text-sm text-[#5f5e7a]">{labels["retro.locked"]}</p> : (
                <div className="flex flex-wrap items-center gap-3">
                  <button type="submit" className={BTN} disabled={pending || !answers.some((answer) => answer.trim() !== "")}>{labels[state.ownAnswers.length ? "retro.update" : "retro.submit"]}</button>
                  {state.ownAnswers.length ? <p className="text-sm text-[#5f5e7a]">{labels["retro.waiting"]}</p> : null}
                </div>
              )}
            </form>
          ) : null}
        </div>
      )}
      <div className="mt-3"><ErrorLine error={error} /></div>
    </section>
  );
}
