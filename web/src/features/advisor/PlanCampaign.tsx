"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { DictationBadge, DictationButton, DictationMessage, useDictationCopy } from "@/features/dictation/DictationControls";
import { useDictation } from "@/features/dictation/useDictation";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createCampaignAction } from "@/features/advisor/socialCalendarActions";
import { CHANNELS, CHANNEL_STYLE, suggestCampaign, type CalendarEvent, type CampaignSuggestion, type Channel } from "@/features/advisor/socialCalendarModel";

/**
 * Kampagne reinsprechen oder tippen -> Vorschlag mit Postings (Tag, Uhrzeit, Kanaele, Thema) ->
 * pruefen, aendern, freigeben. Erst die Freigabe schreibt in den Kalender (socialCalendarModel.ts:
 * Regeln im Browser, kein Dienst).
 */
const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";

type Draft = CampaignSuggestion["posts"][number] & { key: number; include: boolean };

export function PlanCampaign({ orgId, month, today, events }: { orgId: string; month: string; today: string; events: CalendarEvent[] }) {
  const t = useTranslations("advisor.social");
  const locale = useLocale();
  const copy = useDictationCopy();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const dictation = useDictation({ value: text, onChange: setText, locale, copy });

  const recognize = () => {
    const result = suggestCampaign(text, { today, events });
    setName(result?.name ?? "");
    setDrafts(result ? result.posts.map((post, index) => ({ ...post, key: index, include: true })) : []);
  };
  const change = (key: number, patch: Partial<Draft>) => setDrafts((current) => current?.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)) ?? null);
  const toggleChannel = (key: number, channel: Channel) =>
    setDrafts((current) => current?.map((draft) => (draft.key === key ? { ...draft, channels: draft.channels.includes(channel) ? draft.channels.filter((entry) => entry !== channel) : [...draft.channels, channel] } : draft)) ?? null);
  const chosen = (drafts ?? []).filter((draft) => draft.include && draft.title.trim() && draft.plannedOn);

  return (
    <div className="grid gap-3">
      <div className="relative">
        <label htmlFor="plan-campaign" className="sr-only">{t("plan.label")}</label>
        <textarea id="plan-campaign" value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={4000} placeholder={t("plan.placeholder")} className={`${INPUT} py-2 pr-14 leading-6`} />
        <DictationButton dictation={dictation} />
        <DictationBadge dictation={dictation} />
      </div>
      <DictationMessage dictation={dictation} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={recognize} disabled={text.trim().length < 5} className="inline-flex min-h-11 items-center rounded-xl border border-violet-300 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50">
          {t("plan.recognize")}
        </button>
        <span className="text-xs text-slate-500">{t("plan.hint")}</span>
      </div>

      {drafts !== null ? (
        drafts.length === 0 ? (
          <p role="status" className="text-sm text-slate-600">{t("plan.none")}</p>
        ) : (
          <form action={createCampaignAction} className="grid gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <input type="hidden" name="month" value={month} />
            <input type="hidden" name="plan" value={JSON.stringify({ name, posts: chosen.map(({ title, plannedOn, plannedTime, channels, eventId }) => ({ title, plannedOn, plannedTime, channels, eventId })) })} />
            <label className="block max-w-md">
              <span className={LABEL}>{t("plan.campaign")}</span>
              <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} className={INPUT} />
            </label>
            <p role="status" className="text-sm font-semibold text-slate-900">{t("plan.found", { count: drafts.length })}</p>
            <ul className="grid gap-2">
              {drafts.map((draft) => (
                <li key={draft.key} className={`advisor-card grid gap-3 p-3 ${draft.include ? "" : "opacity-60"}`}>
                  <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
                    <label className="flex min-h-11 items-center gap-2 text-xs font-semibold text-slate-600">
                      <input type="checkbox" checked={draft.include} onChange={(event) => change(draft.key, { include: event.target.checked })} className="size-5" />
                      <span className="sm:sr-only">{t("plan.include")}</span>
                    </label>
                    <label>
                      <span className={LABEL}>{t("form.title")}</span>
                      <input value={draft.title} maxLength={160} onChange={(event) => change(draft.key, { title: event.target.value })} className={INPUT} />
                    </label>
                    <label>
                      <span className={LABEL}>{t("form.day")}</span>
                      <input type="date" value={draft.plannedOn} onChange={(event) => change(draft.key, { plannedOn: event.target.value })} className={INPUT} />
                    </label>
                    <label>
                      <span className={LABEL}>{t("form.time")}</span>
                      <input type="time" value={draft.plannedTime ?? ""} onChange={(event) => change(draft.key, { plannedTime: event.target.value || null })} className={INPUT} />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("form.channels")}>
                    {CHANNELS.map((channel) => {
                      const on = draft.channels.includes(channel);
                      return (
                        <button key={channel} type="button" aria-pressed={on} onClick={() => toggleChannel(draft.key, channel)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${on ? `${CHANNEL_STYLE[channel].chip} border-transparent` : "border-slate-200 bg-white text-slate-500"}`}>
                          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${CHANNEL_STYLE[channel].dot}`} />
                          {t(`channels.${channel}`)}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              {chosen.length > 0 ? <SubmitButton label={t("plan.create", { count: chosen.length })} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" /> : null}
              <button type="button" onClick={() => setDrafts(null)} className="inline-flex min-h-11 items-center px-2 text-sm text-slate-600 underline-offset-4 hover:underline">{t("plan.discard")}</button>
            </div>
          </form>
        )
      ) : null}
    </div>
  );
}
