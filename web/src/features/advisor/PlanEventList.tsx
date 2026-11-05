"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DictationBadge, DictationButton, DictationMessage, useDictationCopy } from "@/features/dictation/DictationControls";
import { useDictation } from "@/features/dictation/useDictation";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createProgramEventsAction } from "@/features/advisor/teamProgramActions";
import { parseEventList, type ParsedEvent } from "@/features/advisor/eventListParser";

const LABEL = "block text-sm font-semibold text-slate-900";
const INPUT = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";

type Draft = ParsedEvent & { key: number; include: boolean };

/**
 * Programmplan: mehrere Veranstaltungen auf einmal - tippen oder diktieren, "Erkennen", jede Zeile pruefen und
 * ergaenzen, dann anlegen (eventListParser.ts, Regeln im Browser). Erst "anlegen" schreibt.
 */
export function PlanEventList({ orgId, today, formats }: { orgId: string; today: string; formats: { formatId: string; label: string }[] }) {
  const t = useTranslations("advisor.teamProgram.bulk");
  const locale = useLocale();
  const copy = useDictationCopy();
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const dictation = useDictation({ value: text, onChange: setText, locale, copy });
  const change = (key: number, patch: Partial<Draft>) => setDrafts((current) => current?.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)) ?? null);
  const chosen = (drafts ?? []).filter((draft) => draft.include && draft.title.trim() && draft.day);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="relative">
        <label htmlFor="plan-bulk" className="sr-only">{t("label")}</label>
        <textarea id="plan-bulk" value={text} onChange={(event) => setText(event.target.value)} rows={4} maxLength={6000} placeholder={t("placeholder")} className={`${INPUT} py-2 pr-14 leading-6`} />
        <DictationButton dictation={dictation} />
        <DictationBadge dictation={dictation} />
      </div>
      <DictationMessage dictation={dictation} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setDrafts(parseEventList(text, { today, formats }).map((entry, index) => ({ ...entry, key: index, include: true })))}
          disabled={text.trim().length < 5}
          className="inline-flex min-h-11 items-center rounded-xl border border-violet-300 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50"
        >
          {t("recognize")}
        </button>
        <span className="text-[13px] text-slate-600">{t("hint")}</span>
      </div>

      {drafts !== null ? (
        drafts.length === 0 ? (
          <p role="status" className="text-sm text-slate-700">{t("none")}</p>
        ) : (
          <form action={createProgramEventsAction} className="grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="events" value={JSON.stringify(chosen.map(({ title, day, time, location, formatId, kind }) => ({ title, day, time, location, formatId, kind })))} />
            <p role="status" className="text-[15px] font-semibold text-slate-950">{t("found", { count: drafts.length })}</p>
            <ul className="grid gap-2">
              {drafts.map((draft) => (
                <li key={draft.key} className={`grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 ${draft.include ? "" : "opacity-60"}`}>
                  <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)] sm:items-end">
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
                      <input type="checkbox" checked={draft.include} onChange={(event) => change(draft.key, { include: event.target.checked })} className="size-5" />
                      <span className="sm:sr-only">{t("include")}</span>
                    </label>
                    <label>
                      <span className={LABEL}>{t("title")}</span>
                      <input value={draft.title} maxLength={160} onChange={(event) => change(draft.key, { title: event.target.value })} className={INPUT} />
                    </label>
                    <label>
                      <span className={LABEL}>{t("day")}</span>
                      <input type="date" value={draft.day} onChange={(event) => change(draft.key, { day: event.target.value })} className={INPUT} />
                    </label>
                    <label>
                      <span className={LABEL}>{t("time")}</span>
                      <input type="time" value={draft.time ?? ""} onChange={(event) => change(draft.key, { time: event.target.value || null })} className={INPUT} />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label>
                      <span className={LABEL}>{t("format")}</span>
                      <select value={draft.formatId ?? ""} onChange={(event) => change(draft.key, { formatId: event.target.value || null })} className={INPUT}>
                        <option value="">{t("noFormat")}</option>
                        {formats.map((format) => <option key={format.formatId} value={format.formatId}>{format.label}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className={LABEL}>{t("kind")}</span>
                      <select value={draft.kind} onChange={(event) => change(draft.key, { kind: event.target.value as Draft["kind"] })} className={INPUT}>
                        <option value="education">{t("kindEducation")}</option>
                        <option value="internal">{t("kindInternal")}</option>
                        <option value="external">{t("kindExternal")}</option>
                      </select>
                    </label>
                    <label>
                      <span className={LABEL}>{t("location")}</span>
                      <input value={draft.location ?? ""} maxLength={200} onChange={(event) => change(draft.key, { location: event.target.value || null })} className={INPUT} />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[13px] text-slate-600">{t("detailsLater")}</p>
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
