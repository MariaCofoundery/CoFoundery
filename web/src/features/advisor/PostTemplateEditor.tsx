"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { deletePostTemplateAction, savePostTemplateAction } from "@/features/advisor/socialCalendarActions";
import { CHANNELS, type Channel } from "@/features/advisor/socialCalendarModel";
import type { PostTemplate, TemplateStep } from "@/features/advisor/postPlanning";

const INPUT = "min-h-10 rounded-lg border border-slate-300 bg-white px-2.5 text-[14px]";
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
export function PostTemplateEditor({ orgId, month, templates, canWrite }: { orgId: string; month: string; templates: PostTemplate[]; canWrite: boolean }) {
  const t = useTranslations("advisor.social.templates");
  const tChannels = useTranslations("advisor.social.channels");
  const blank = (): StepRow[] => [
    { key: 1, amount: 7, when: "before", channel: "linkedin", label: "", time: "09:00" },
    { key: 2, amount: 7, when: "before", channel: "instagram", label: "", time: "12:00" },
  ];
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [rows, setRows] = useState<StepRow[]>(blank);
  const [nextKey, setNextKey] = useState(100);
  const change = (key: number, patch: Partial<StepRow>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const edit = (template: PostTemplate | null) => {
    setEditing(template?.templateId ?? null);
    setName(template?.name ?? "");
    setRows(template ? template.steps.map(toRow) : blank());
  };
  const summary = (template: PostTemplate) =>
    template.steps
      .map((step) => `${step.days === 0 ? t("same") : t(step.days < 0 ? "daysBefore" : "daysAfter", { count: Math.abs(step.days) })} ${tChannels(step.channel)}`)
      .join(" · ");

  return (
    <div className="grid gap-4">
      {templates.length === 0 ? <p className="text-[14px] text-slate-700">{t("none")}</p> : null}
      <ul className="grid gap-2">
        {templates.map((template) => (
          <li key={template.templateId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-slate-950">{template.name}</p>
              <p className="text-[13px] text-slate-600">{summary(template)}</p>
            </div>
            {canWrite ? (
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => edit(template)} className="text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("edit")}</button>
                <form action={deletePostTemplateAction}>
                  <input type="hidden" name="orgId" value={orgId} />
                  <input type="hidden" name="month" value={month} />
                  <input type="hidden" name="templateId" value={template.templateId ?? ""} />
                  <SubmitButton label={t("delete")} pendingLabel="…" className="text-sm text-rose-700 underline-offset-4 hover:underline" />
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canWrite ? (
        <form action={savePostTemplateAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="month" value={month} />
          {editing ? <input type="hidden" name="templateId" value={editing} /> : null}
          <input type="hidden" name="steps" value={JSON.stringify(rows.map(toStep))} />
          <p className="text-[15px] font-semibold text-slate-950">{editing ? t("editing") : t("new")}</p>
          <label className="block max-w-md">
            <span className="block text-sm font-semibold text-slate-900">{t("name")}</span>
            <input value={name} onChange={(input) => setName(input.target.value)} name="name" required maxLength={80} placeholder={t("namePlaceholder")} className={`${INPUT} mt-1.5 w-full`} />
          </label>
          <ul className="grid gap-2">
            {rows.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center gap-2">
                {row.when !== "same" ? (
                  <label>
                    <span className="sr-only">{t("amount")}</span>
                    <input type="number" min={1} max={60} value={row.amount} onChange={(input) => change(row.key, { amount: Math.min(60, Math.max(1, Number(input.target.value) || 1)) })} className={`${INPUT} w-20`} />
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
                  <span className="sr-only">{t("channel")}</span>
                  <select value={row.channel} onChange={(input) => change(row.key, { channel: input.target.value as Channel })} className={INPUT}>
                    {CHANNELS.map((channel) => <option key={channel} value={channel}>{tChannels(channel)}</option>)}
                  </select>
                </label>
                <label className="min-w-40 flex-1">
                  <span className="sr-only">{t("label")}</span>
                  <input value={row.label} maxLength={60} onChange={(input) => change(row.key, { label: input.target.value })} placeholder={t("labelPlaceholder")} className={`${INPUT} w-full`} />
                </label>
                <label>
                  <span className="sr-only">{t("time")}</span>
                  <input type="time" value={row.time} onChange={(input) => change(row.key, { time: input.target.value })} className={INPUT} />
                </label>
                <button type="button" onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))} disabled={rows.length <= 1} aria-label={t("remove")} className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40">×</button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={rows.length >= 20}
              onClick={() => {
                setRows((current) => [...current, { key: nextKey, amount: 3, when: "before", channel: "linkedin", label: "", time: "" }]);
                setNextKey((key) => key + 1);
              }}
              className="inline-flex min-h-10 items-center rounded-lg border border-dashed border-violet-300 px-3 text-sm font-semibold text-violet-800 disabled:opacity-40"
            >
              + {t("addStep")}
            </button>
            <SubmitButton label={t("save")} pendingLabel="…" className="brand-cta inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-semibold" />
            {editing ? <button type="button" onClick={() => edit(null)} className="text-sm text-slate-600 underline-offset-4 hover:underline">{t("cancel")}</button> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
