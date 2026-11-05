"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";
import { savePostTemplateAction } from "@/features/advisor/socialCalendarActions";
import { CHANNELS, type Channel } from "@/features/advisor/socialCalendarModel";
import type { PostTemplate, TemplateStep } from "@/features/advisor/postPlanning";

const INPUT = "min-h-10 rounded-[10px] border-0 bg-white px-2.5 text-[14px] text-slate-950 outline-none focus:ring-2 focus:ring-violet-500";
type When = "before" | "same" | "after";
type StepRow = { key: number; amount: number; when: When; channel: Channel; label: string; time: string };

const toRow = (step: TemplateStep, key: number): StepRow => ({
  key,
  amount: Math.abs(step.days),
  when: step.days < 0 ? "before" : step.days === 0 ? "same" : "after",
  channel: step.channel,
  label: step.label ?? "",
  time: step.time ?? "",
});
const toStep = (row: StepRow) => ({ days: row.when === "same" ? 0 : row.when === "before" ? -row.amount : row.amount, channel: row.channel, label: row.label || null, time: row.time || null });

/**
 * Vorlagen fuer Postings zu Veranstaltungen anlegen und aendern (20270324120000): je Zeile "so viele Tage vorher /
 * am Tag / danach, auf diesem Kanal, mit dieser Bezeichnung und Uhrzeit". Gespeichert wird ueber die Datenbank,
 * die die Schritte prueft.
 */
export function PostTemplateEditor({ orgId, month, template, cancelHref }: { orgId: string; month: string; template: PostTemplate | null; cancelHref: string }) {
  const t = useTranslations("advisor.social.templates");
  const tChannels = useTranslations("advisor.social.channels");
  const blank = (): StepRow[] => [
    { key: 1, amount: 7, when: "before", channel: "linkedin", label: "", time: "09:00" },
    { key: 2, amount: 7, when: "before", channel: "instagram", label: "", time: "12:00" },
  ];
  const [name, setName] = useState(template?.name ?? "");
  const [rows, setRows] = useState<StepRow[]>(() => (template ? template.steps.map(toRow) : blank()));
  const [nextKey, setNextKey] = useState(100);
  const change = (key: number, patch: Partial<StepRow>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <form action={savePostTemplateAction} aria-labelledby="template-editor-title" className="flex min-w-0 flex-col rounded-[20px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(23,23,58,0.08)] lg:w-[26rem] lg:shrink-0 xl:w-[28rem]">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="month" value={month} />
      {template?.templateId ? <input type="hidden" name="templateId" value={template.templateId} /> : null}
      <input type="hidden" name="steps" value={JSON.stringify(rows.map(toStep))} />
      <div className="grid gap-3 px-5 pb-2 pt-[18px]">
        <h3 id="template-editor-title" className="text-xs font-bold uppercase tracking-[0.06em] text-pink-900">{template ? t("editing") : t("new")}</h3>
        <label className={TILE}>
          <span className={TILE_LABEL}>{t("name")}</span>
          <input value={name} onChange={(input) => setName(input.target.value)} name="name" required maxLength={80} placeholder={t("namePlaceholder")} className={`${TILE_INPUT} text-[16px]`} />
        </label>
        <p className="text-[13px] font-semibold text-slate-700">{t("stepsLabel")}</p>
        <ul className="grid gap-2">
          {rows.map((row) => (
            <li key={row.key} className="grid gap-2 rounded-[14px] border border-slate-100 bg-[#F8F8FC] p-3">
              <div className="flex flex-wrap items-center gap-2">
                {row.when !== "same" ? (
                  <label>
                    <span className="sr-only">{t("amount")}</span>
                    <input type="number" min={1} max={60} value={row.amount} onChange={(input) => change(row.key, { amount: Math.min(60, Math.max(1, Number(input.target.value) || 1)) })} className={`${INPUT} w-[4.5rem]`} />
                  </label>
                ) : null}
                <label>
                  <span className="sr-only">{t("when")}</span>
                  <select value={row.when} onChange={(input) => change(row.key, { when: input.target.value as When })} className={INPUT}>
                    <option value="before">{t("whenBefore")}</option>
                    <option value="same">{t("whenSame")}</option>
                    <option value="after">{t("whenAfter")}</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">{t("time")}</span>
                  <input type="time" value={row.time} onChange={(input) => change(row.key, { time: input.target.value })} className={INPUT} />
                </label>
                <span className="flex-1" />
                <button type="button" onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))} disabled={rows.length <= 1} aria-label={t("remove")} className="grid h-10 w-10 place-items-center rounded-[10px] text-slate-600 hover:bg-white disabled:opacity-40">×</button>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("channel")}>
                {CHANNELS.slice(0, 4).map((channel) => (
                  <button key={channel} type="button" aria-pressed={row.channel === channel} onClick={() => change(row.key, { channel })} className={`inline-flex min-h-9 items-center rounded-full border px-3 text-[13px] font-semibold ${row.channel === channel ? "border-violet-400 bg-violet-50 text-violet-950" : "border-slate-300 bg-white text-slate-700"}`}>
                    {tChannels(channel)}
                  </button>
                ))}
                <label>
                  <span className="sr-only">{t("channelMore")}</span>
                  <select
                    value={CHANNELS.slice(4).includes(row.channel) ? row.channel : ""}
                    onChange={(input) => {
                      if (input.target.value) change(row.key, { channel: input.target.value as Channel });
                    }}
                    className={`inline-flex min-h-9 rounded-full border px-3 text-[13px] font-semibold ${CHANNELS.slice(4).includes(row.channel) ? "border-violet-400 bg-violet-50 text-violet-950" : "border-slate-300 bg-white text-slate-700"}`}
                  >
                    <option value="">{t("channelMore")}</option>
                    {CHANNELS.slice(4).map((channel) => <option key={channel} value={channel}>{tChannels(channel)}</option>)}
                  </select>
                </label>
              </div>
              <label>
                <span className="sr-only">{t("label")}</span>
                <input value={row.label} maxLength={60} onChange={(input) => change(row.key, { label: input.target.value })} placeholder={t("labelPlaceholder")} className={`${INPUT} w-full`} />
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={rows.length >= 20}
          onClick={() => {
            setRows((current) => [...current, { key: nextKey, amount: 3, when: "before", channel: "linkedin", label: "", time: "" }]);
            setNextKey((key) => key + 1);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border-[1.5px] border-dashed border-violet-300 text-[13.5px] font-bold text-violet-900 disabled:opacity-40"
        >
          + {t("addStep")}
        </button>
        <p className="text-[12.5px] leading-5 text-slate-600">{t("weekendNote")}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3.5">
        <Link href={cancelHref} className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-slate-800 hover:bg-slate-100">{t("cancel")}</Link>
        <SubmitButton label={t("save")} pendingLabel="…" className="inline-flex min-h-[46px] items-center rounded-xl bg-[#6D49E0] px-5 text-[14.5px] font-semibold text-white hover:bg-[#5B36D6]" />
      </div>
    </form>
  );
}
