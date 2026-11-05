import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { deleteEventFormatAction, saveEventFormatAction } from "@/features/advisor/teamProgramActions";
import type { EventFormat } from "@/features/advisor/teamProgramData";

/**
 * Formate der Organisation (20270324120000): Masterclass, Pitch in Progress, Fireside Chat ... Pflegt die Inhaberin,
 * im Programmplan und unter Einrichten - dieselbe Liste. Ein geloeschtes Format verschwindet von den Veranstaltungen.
 */
export async function EventFormats({ orgId, formats, isOwner, back, error }: { orgId: string; formats: EventFormat[]; isOwner: boolean; back: "plan" | "features"; error: boolean }) {
  const t = await getTranslations("advisor.teamProgram.formats");
  return (
    <div id="formats" className="scroll-mt-24">
      <p className="text-[14px] leading-6 text-slate-700">{t("text")}</p>
      {error ? <p role="alert" className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{t("error")}</p> : null}
      <ul className="mt-3 flex flex-wrap gap-2">
        {formats.length === 0 ? <li className="text-sm text-slate-600">{t("none")}</li> : null}
        {formats.map((format) => (
          <li key={format.formatId} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-violet-200 bg-violet-50 pl-3.5 pr-1 text-sm font-semibold text-violet-900">
            {format.label}
            {isOwner ? (
              <form action={deleteEventFormatAction}>
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="formatId" value={format.formatId} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" aria-label={t("delete", { label: format.label })} className="grid h-7 w-7 place-items-center rounded-full text-violet-700 hover:bg-violet-100">×</button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      {isOwner ? (
        <form action={saveEventFormatAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="back" value={back} />
          <label className="min-w-56">
            <span className="block text-sm font-semibold text-slate-900">{t("new")}</span>
            <input name="label" required maxLength={60} placeholder={t("placeholder")} className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]" />
          </label>
          <SubmitButton label={t("add")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50" />
        </form>
      ) : null}
    </div>
  );
}
