"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DictationBadge, DictationButton, DictationMessage, useDictationCopy } from "@/features/dictation/DictationControls";
import { useDictation } from "@/features/dictation/useDictation";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createOrgTasksAction } from "@/features/advisor/teamraumActions";
import { suggestTasks, type DictationMember, type DictationProgram, type TaskSuggestion } from "@/features/advisor/taskDictation";

/**
 * Teamraum: Aufgaben diktieren (oder tippen). "Vorschlaege erkennen" zerlegt den Text in Aufgaben mit
 * Person, Frist und Team (taskDictation.ts, Regeln im Browser, kein Dienst). Jede Karte laesst sich
 * aendern oder abwaehlen; erst "Anlegen" schreibt - ueber dieselbe Datenbankfunktion wie jede Aufgabe.
 */

const LABEL = "block text-sm font-semibold text-slate-900";
const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";

type Draft = TaskSuggestion & { key: number; include: boolean };

export function DictateTasks({
  orgId,
  tab,
  me,
  today,
  members,
  programs,
  variant = "block",
  moreHref,
}: {
  orgId: string;
  tab: "week" | "tasks";
  me: string;
  today: string;
  members: DictationMember[];
  programs: DictationProgram[];
  /** "line": eine Zeile mit Mikrofon und "Anlegen" (Diese Woche, Entwurf 05.11.2026). Gespeichert wird erst nach dem Vorschlag. */
  variant?: "block" | "line";
  moreHref?: string;
}) {
  const t = useTranslations("advisor.teamraum.dictate");
  const locale = useLocale();
  const copy = useDictationCopy();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const dictation = useDictation({ value: text, onChange: setText, locale, copy });
  // Am Telefon passt das Beispiel nicht in die Zeile - dort nur "Neue Aufgabe …".
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const recognize = () => {
    setDrafts(suggestTasks(text, { me, members, programs, today }).map((suggestion, index) => ({ ...suggestion, key: index, include: true })));
  };
  const change = (key: number, patch: Partial<Draft>) => setDrafts((current) => current?.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)) ?? null);
  const chosen = (drafts ?? []).filter((draft) => draft.include && draft.title.trim().length > 0);

  const input = variant === "line" ? (
    <>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white py-1.5 pl-4 pr-1.5 shadow-sm focus-within:border-violet-400">
        <span aria-hidden="true" className="text-xl font-semibold text-violet-600">+</span>
        <label htmlFor={`dictate-${tab}`} className="sr-only">{t("lineLabel")}</label>
        <input
          id={`dictate-${tab}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && text.trim().length >= 3) {
              event.preventDefault();
              recognize();
            }
          }}
          maxLength={4000}
          placeholder={narrow ? t("linePlaceholderShort") : t("linePlaceholder")}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-500"
        />
        <DictationButton dictation={dictation} inline />
        <button type="button" onClick={recognize} disabled={text.trim().length < 3} className="brand-cta inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 text-sm font-semibold sm:px-5">
          {t("lineAdd")}
        </button>
      </div>
      <DictationBadge dictation={dictation} />
      <DictationMessage dictation={dictation} />
      <p className="px-1 text-[13px] leading-5 text-slate-600">
        {t("lineHint")}{" "}
        {moreHref ? <a href={moreHref} className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("lineMore")}</a> : null}
      </p>
    </>
  ) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {input}
      {variant === "line" ? null : (<>
      <div className="relative">
        <label htmlFor={`dictate-${tab}`} className="sr-only">{t("label")}</label>
        <textarea
          id={`dictate-${tab}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          maxLength={4000}
          placeholder={t("placeholder")}
          className={`${INPUT} py-2 pr-14 leading-6`}
        />
        <DictationButton dictation={dictation} />
        <DictationBadge dictation={dictation} />
      </div>
      <DictationMessage dictation={dictation} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={recognize} disabled={text.trim().length < 3} className="inline-flex min-h-11 items-center rounded-xl border border-violet-300 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50">
          {t("recognize")}
        </button>
        <span className="text-[13px] text-slate-600">{t("hint")}</span>
      </div>
      </>)}

      {drafts !== null ? (
        drafts.length === 0 ? (
          <p role="status" className="text-sm text-slate-600">{t("none")}</p>
        ) : (
          <form action={createOrgTasksAction} className="grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="tab" value={tab} />
            <input type="hidden" name="tasks" value={JSON.stringify(chosen.map(({ title, assigneeUserId, dueOn, programId }) => ({ title, assigneeUserId, dueOn, programId })))} />
            <p role="status" className="text-sm font-semibold text-slate-900">{t("found", { count: drafts.length })}</p>
            <ul className="grid gap-2">
              {drafts.map((draft) => (
                <li key={draft.key} className={`advisor-card grid gap-3 p-3 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end ${draft.include ? "" : "opacity-60"}`}>
                  <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-600 sm:pb-0.5">
                    <input type="checkbox" checked={draft.include} onChange={(event) => change(draft.key, { include: event.target.checked })} className="size-5" />
                    <span className="sm:sr-only">{t("include")}</span>
                  </label>
                  <label>
                    <span className={LABEL}>{t("title")}</span>
                    <input value={draft.title} maxLength={200} onChange={(event) => change(draft.key, { title: event.target.value })} className={INPUT} />
                  </label>
                  <label>
                    <span className={LABEL}>{t("assignee")}</span>
                    <select value={draft.assigneeUserId ?? ""} onChange={(event) => change(draft.key, { assigneeUserId: event.target.value || null })} className={INPUT}>
                      <option value="">{t("nobody")}</option>
                      {members.map((member) => <option key={member.userId} value={member.userId}>{member.userId === me ? t("me", { name: member.name }) : member.name}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className={LABEL}>{t("due")}</span>
                    <input type="date" value={draft.dueOn ?? ""} onChange={(event) => change(draft.key, { dueOn: event.target.value || null })} className={INPUT} />
                  </label>
                  <label>
                    <span className={LABEL}>{t("program")}</span>
                    <select value={draft.programId ?? ""} onChange={(event) => change(draft.key, { programId: event.target.value || null })} className={INPUT}>
                      <option value="">{t("internal")}</option>
                      {programs.map((program) => <option key={program.programId} value={program.programId}>{program.name}</option>)}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              {chosen.length > 0 ? <SubmitButton label={t("create", { count: chosen.length })} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" /> : null}
              <button type="button" onClick={() => setDrafts(null)} className="inline-flex min-h-11 items-center px-2 text-sm text-slate-600 underline-offset-4 hover:underline">{t("discard")}</button>
            </div>
          </form>
        )
      ) : null}
    </div>
  );
}
