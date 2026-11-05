"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createEventPostsAction } from "@/features/advisor/socialCalendarActions";
import { CHANNEL_STYLE, type Channel } from "@/features/advisor/socialCalendarModel";
import { DEFAULT_TEMPLATE_STEPS, checkPostDay, suggestPostsForEvent, type PostTemplate, type TemplateStep } from "@/features/advisor/postPlanning";

type Row = { key: string; eventId: string; title: string; plannedOn: string; plannedTime: string | null; channel: Channel; include: boolean };
type EventInput = { eventId: string; title: string; day: string };

/**
 * Vorschlaege fuer Postings zu Veranstaltungen (Wunsch Maria, 05.11.2026): je Veranstaltung eine Vorlage waehlen,
 * die Vorschlaege stehen in einem eigenen Feld, nichts ist gespeichert. Faellt ein Tag auf ein Wochenende oder
 * einen Feiertag, steht das daneben - mit dem Werktag davor und danach zum Antippen. Erst "uebernehmen" legt die
 * Postings als Ideen im Social-Media-Kalender an.
 */
export function EventPostSuggestions({
  orgId,
  back,
  today,
  locale,
  events,
  templates,
  templatesHref,
  compact = false,
  returnEventId = null,
}: {
  orgId: string;
  back: "plan" | "social" | "calendar";
  today: string;
  locale: string;
  events: EventInput[];
  templates: PostTemplate[];
  templatesHref: string | null;
  /** Schmale Spalte (Panel eines Termins): Datum und Uhrzeit stehen in einer eigenen Zeile. */
  compact?: boolean;
  /** Nach dem Uebernehmen zurueck zu diesem Termin im Kalender. */
  returnEventId?: string | null;
}) {
  const t = useTranslations("advisor.social.suggest");
  const tChannels = useTranslations("advisor.social.channels");
  const choices: PostTemplate[] = useMemo(() => [{ templateId: null, name: t("defaultTemplate"), steps: DEFAULT_TEMPLATE_STEPS }, ...templates], [templates, t]);
  const stepLabel = (step: TemplateStep) => (step.days < 0 ? t("labelBefore") : step.days === 0 ? t("labelToday") : t("labelAfter"));
  const build = (event: EventInput, template: PostTemplate): Row[] =>
    suggestPostsForEvent(event, template.steps, today, stepLabel).map((entry) => ({
      key: entry.key,
      eventId: entry.eventId,
      title: entry.title,
      plannedOn: entry.plannedOn,
      plannedTime: entry.plannedTime,
      channel: entry.channel,
      include: true,
    }));
  const [templateOf, setTemplateOf] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<Row[]>(() => events.flatMap((event) => build(event, choices[0])));
  const day = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "numeric", timeZone: "UTC" });
  const short = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
  const dayOf = (iso: string, format = short) => format.format(new Date(`${iso}T00:00:00Z`));
  const change = (key: string, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const applyTemplate = (event: EventInput, index: number) => {
    setTemplateOf((current) => ({ ...current, [event.eventId]: index }));
    setRows((current) => [...current.filter((row) => row.eventId !== event.eventId), ...build(event, choices[index])]);
  };
  const chosen = rows.filter((row) => row.include && row.title.trim());

  if (events.length === 0) return <p className="text-[15px] text-slate-700">{t("allCovered")}</p>;

  return (
    <form action={createEventPostsAction} className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="back" value={back} />
      {returnEventId ? <input type="hidden" name="termin" value={returnEventId} /> : null}
      <input type="hidden" name="posts" value={JSON.stringify(chosen.map(({ title, plannedOn, plannedTime, channel, eventId }) => ({ title, plannedOn, plannedTime, channel, eventId })))} />
      {events.map((event) => {
        const eventRows = rows.filter((row) => row.eventId === event.eventId).sort((a, b) => (a.plannedOn < b.plannedOn ? -1 : a.plannedOn > b.plannedOn ? 1 : 0));
        return (
          <section key={event.eventId} aria-label={event.title} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 text-[15px] font-semibold text-slate-950">
                {event.title} <span className="font-normal text-slate-600">· {dayOf(event.day, day)}</span>
              </p>
              <label className="flex min-w-0 max-w-full items-center gap-2 text-[13px] text-slate-700">
                <span>{t("template")}</span>
                <select value={templateOf[event.eventId] ?? 0} onChange={(input) => applyTemplate(event, Number(input.target.value))} className="min-h-9 min-w-0 max-w-full rounded-lg border border-slate-300 bg-white px-2 text-[13px]">
                  {choices.map((choice, index) => <option key={choice.templateId ?? "default"} value={index}>{choice.name}</option>)}
                </select>
              </label>
            </div>
            {eventRows.length === 0 ? <p className="mt-2 text-[13px] text-slate-600">{t("nothingAhead")}</p> : null}
            <ul className="mt-2 grid gap-2">
              {eventRows.map((row) => {
                const check = checkPostDay(row.plannedOn);
                return (
                  <li key={row.key} className={`grid gap-2 rounded-xl border px-3 py-2.5 ${row.include ? "border-slate-200" : "border-slate-200 opacity-60"}`}>
                    <div className={compact ? "flex flex-wrap items-center gap-2" : "grid items-center gap-2 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto]"}>
                      <input type="checkbox" aria-label={t("include")} checked={row.include} onChange={(input) => change(row.key, { include: input.target.checked })} className="size-5" />
                      <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${CHANNEL_STYLE[row.channel].chip}`}>
                        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${CHANNEL_STYLE[row.channel].dot}`} />
                        {tChannels(row.channel)}
                      </span>
                      <label className={compact ? "min-w-0 basis-full" : "min-w-0"}>
                        <span className="sr-only">{t("title")}</span>
                        <input value={row.title} maxLength={160} onChange={(input) => change(row.key, { title: input.target.value })} className="min-h-10 w-full min-w-0 rounded-lg border border-slate-300 px-2.5 text-[14px]" />
                      </label>
                      <label>
                        <span className="sr-only">{t("day")}</span>
                        <input type="date" value={row.plannedOn} onChange={(input) => { if (input.target.value) change(row.key, { plannedOn: input.target.value }); }} className="min-h-10 rounded-lg border border-slate-300 px-2 text-[14px]" />
                      </label>
                      <label>
                        <span className="sr-only">{t("time")}</span>
                        <input type="time" value={row.plannedTime ?? ""} onChange={(input) => change(row.key, { plannedTime: input.target.value || null })} className="min-h-10 rounded-lg border border-slate-300 px-2 text-[14px]" />
                      </label>
                    </div>
                    {!check.ok ? (
                      <div role="note" className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-950">
                        <span>
                          {check.reason === "holiday" ? t("warnHoliday", { day: dayOf(row.plannedOn, day), holiday: check.holiday ?? "" }) : t("warnWeekend", { day: dayOf(row.plannedOn, day) })}
                        </span>
                        <button type="button" onClick={() => change(row.key, { plannedOn: check.before })} className="inline-flex min-h-8 items-center rounded-full border border-amber-300 bg-white px-3 font-semibold">{t("instead", { day: dayOf(check.before) })}</button>
                        <button type="button" onClick={() => change(row.key, { plannedOn: check.after })} className="inline-flex min-h-8 items-center rounded-full border border-amber-300 bg-white px-3 font-semibold">{t("instead", { day: dayOf(check.after) })}</button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="text-[13px] text-slate-600">
        {t("note")} {templatesHref ? <a href={templatesHref} className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("editTemplates")}</a> : null}
      </p>
      {chosen.length > 0 ? <SubmitButton label={t("create", { count: chosen.length })} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" /> : null}
    </form>
  );
}
