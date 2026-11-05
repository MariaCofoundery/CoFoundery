import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { deletePostTemplateAction } from "@/features/advisor/socialCalendarActions";
import { PostTemplateEditor } from "@/features/advisor/PostTemplateEditor";
import { DEFAULT_TEMPLATE_STEPS, timelinePosition, type PostTemplate, type TemplateStep } from "@/features/advisor/postPlanning";
import { calendarHref } from "@/features/advisor/calendar/calendarModel";
import { teamraumHref } from "@/features/advisor/teamraumRoutes";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Die Vorlagen als Karten mit Zeitstrahl (Entwurf 05.11.2026): man sieht auf einen Blick, wann vor und nach einem
 * Termin etwas rausgeht - und findet sie als eigenen Reiter statt unten auf der Seite. Rechts der Editor.
 */
export async function PostTemplateCards({ orgId, month, templates, canWrite, editing }: { orgId: string; month: string; templates: PostTemplate[]; canWrite: boolean; editing: string | null }) {
  const t = await getTranslations("advisor.social.cards");
  const tt = await getTranslations("advisor.social.templates");
  const tc = await getTranslations("advisor.social.channels");
  const base = (vorlage?: string) => teamraumHref("social", orgId, { reiter: "vorlagen", ...(vorlage ? { vorlage } : {}) });
  const all: PostTemplate[] = [{ templateId: null, name: t("default"), steps: DEFAULT_TEMPLATE_STEPS }, ...templates];
  const current = editing === "neu" ? null : templates.find((entry) => entry.templateId === editing) ?? null;
  const editorOpen = canWrite && (editing === "neu" || current !== null);

  const stepText = (step: TemplateStep) => `${step.days === 0 ? tt("same") : tt(step.days < 0 ? "daysBefore" : "daysAfter", { count: Math.abs(step.days) })} · ${tc(step.channel)}`;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <p className="mb-4 max-w-2xl text-[15px] leading-6 text-slate-700">{tt("text")}</p>
        <section aria-label={tt("title", { count: templates.length })} className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
          {all.map((template) => {
            const days = template.steps.map((step) => step.days);
            const min = Math.min(-14, ...days);
            const max = Math.max(3, ...days);
            const sorted = [...template.steps].sort((a, b) => a.days - b.days);
            const channels = [...new Set(template.steps.map((step) => tc(step.channel)))].join(", ");
            const isEditing = template.templateId !== null && template.templateId === editing;
            return (
              <article key={template.templateId ?? "default"} className={`flex flex-col gap-3.5 rounded-[20px] border-[1.5px] bg-white p-[18px] transition hover:border-violet-300 ${isEditing ? "border-violet-500" : "border-slate-200"}`}>
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="font-brand grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-pink-100 text-[20px] font-semibold text-pink-900">{template.steps.length}</span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="text-[16px] font-bold text-slate-950">{template.name}</h3>
                    <p className="text-[13px] text-slate-700">{t("summary", { count: template.steps.length, channels })}</p>
                  </div>
                </div>
                <div aria-hidden="true" className="relative mx-3 mb-1 h-[62px]">
                  <span className="absolute inset-x-0 top-6 h-0.5 bg-slate-200" />
                  <span className="absolute top-4 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[3px] bg-[#6D49E0]" style={{ left: `${timelinePosition(0, min, max)}%` }} />
                  <span className="absolute top-[-2px] -translate-x-1/2 text-[11px] font-bold text-violet-900" style={{ left: `${timelinePosition(0, min, max)}%` }}>{t("event")}</span>
                  {sorted.filter((step) => step.days !== 0).map((step, index) => (
                    <span key={`${step.days}-${step.channel}-${index}`}>
                      <span className="absolute top-[18px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-[2.5px] border-white bg-pink-600" style={{ left: `${timelinePosition(step.days, min, max)}%` }} />
                      <span className="absolute top-10 -translate-x-1/2 whitespace-nowrap text-[11.5px] font-bold text-slate-800" style={{ left: `${timelinePosition(step.days, min, max)}%` }}>{step.days < 0 ? `−${-step.days}` : `+${step.days}`}</span>
                    </span>
                  ))}
                </div>
                <ul className="grid gap-0.5 text-[12.5px] text-slate-700">
                  {sorted.map((step, index) => <li key={`${step.days}-${step.channel}-${index}`}>{stepText(step)}{step.label ? ` – ${step.label}` : ""}</li>)}
                </ul>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {canWrite && template.templateId ? (
                    <Link href={base(template.templateId)} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[11px] border border-slate-300 bg-white px-3 text-[13.5px] font-semibold text-slate-950 hover:bg-slate-50">{tt("edit")}</Link>
                  ) : null}
                  <Link href={calendarHref(orgId)} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-[11px] bg-violet-100 px-3 text-[13.5px] font-bold text-violet-950 hover:bg-violet-200">{t("apply")}</Link>
                  {canWrite && template.templateId ? (
                    <form action={deletePostTemplateAction}>
                      <input type="hidden" name="orgId" value={orgId} />
                      <input type="hidden" name="month" value={month} />
                      <input type="hidden" name="templateId" value={template.templateId} />
                      <SubmitButton label={tt("delete")} pendingLabel="…" className="inline-flex min-h-10 items-center px-2 text-[13px] font-medium text-rose-700 underline-offset-4 hover:underline" />
                    </form>
                  ) : null}
                </div>
              </article>
            );
          })}
          {canWrite ? (
            <Link href={base("neu")} className="flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-violet-300 text-violet-900 hover:bg-violet-50">
              <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-violet-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
              <span className="text-[15px] font-bold">{tt("new")}</span>
              <span className="text-[13px] text-slate-700">{t("newHint")}</span>
            </Link>
          ) : null}
        </section>
      </div>
      {editorOpen ? (
        <PostTemplateEditor key={current?.templateId ?? "neu"} orgId={orgId} month={month} template={current} cancelHref={base()} />
      ) : null}
    </div>
  );
}
