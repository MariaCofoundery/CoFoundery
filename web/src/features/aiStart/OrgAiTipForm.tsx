import { getTranslations } from "next-intl/server";
import { saveOrgAiTipAction } from "@/features/aiStart/aiStartActions";
import type { AiTipLink } from "@/features/aiStart/aiStartModel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";

/**
 * Programmtipp (Entwurf 09.11.2026): die Organisation gibt ihren Teams die KI-Checkliste mit - mit eigenem Hinweis und
 * empfohlenen Links. Sie sieht NICHT, was ein Team abgehakt hat; die Checkliste bleibt Sache des Teams.
 */
export async function OrgAiTipForm({ orgId, tip }: { orgId: string; tip: { enabled: boolean; note: string | null; links: AiTipLink[] } }) {
  const t = await getTranslations("advisor.aiTip");
  const rows = Array.from({ length: Math.max(3, tip.links.length + 1) }, (_, index) => tip.links[index] ?? null);
  return (
    <section id="ki-tipp" aria-labelledby="ai-tip-title" className="scroll-mt-24 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 id="ai-tip-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("text")}</p>
      </div>
      <form action={saveOrgAiTipAction} className="grid gap-4">
        <input type="hidden" name="orgId" value={orgId} />
        <label className="flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 p-4">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-slate-950">{t("enabled")}</span>
            <span className="mt-1 block text-[13.5px] leading-6 text-slate-700">{t("enabledHint")}</span>
          </span>
          <input type="checkbox" name="enabled" value="yes" defaultChecked={tip.enabled} role="switch" className="peer sr-only" />
          <span aria-hidden="true" className="relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-slate-400 p-[3px] transition peer-checked:bg-emerald-700 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500 peer-focus-visible:ring-offset-2 after:block after:h-7 after:w-7 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-6" />
        </label>
        <label className={TILE}><span className={TILE_LABEL}>{t("note")}</span><textarea name="note" rows={3} maxLength={500} defaultValue={tip.note ?? ""} placeholder={t("notePlaceholder")} className={`${TILE_INPUT} resize-y font-normal leading-6`} /></label>
        <fieldset className="grid gap-2">
          <legend className="text-[13px] font-bold text-slate-700">{t("links")}</legend>
          {rows.map((link, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <input name="linkLabel" maxLength={80} defaultValue={link?.label ?? ""} placeholder={t("linkLabel")} aria-label={t("linkLabel")} className={`${TILE_INPUT} w-full`} />
              <input type="url" name="linkUrl" maxLength={400} defaultValue={link?.url ?? ""} placeholder="https://…" aria-label={t("linkUrl")} className={`${TILE_INPUT} w-full`} />
            </div>
          ))}
          <span className="text-xs text-slate-600">{t("linksHint")}</span>
        </fieldset>
        <SubmitButton label={t("save")} pendingLabel="…" className="inline-flex min-h-11 items-center self-start rounded-xl bg-[#6D49E0] px-6 text-sm font-semibold text-white" />
        <p className="text-xs leading-5 text-slate-600">{t("privacy")}</p>
      </form>
    </section>
  );
}
