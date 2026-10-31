import { getTranslations } from "next-intl/server";
import { saveOutcomeCatalogItemAction } from "@/features/advisor/teamProgramActions";
import type { OutcomeCatalogItem } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1 min-h-11 rounded-xl border border-slate-300 px-3 text-sm";

/**
 * Der Erfolgs-Katalog der Organisation: Welche Ergebnisse zaehlen und wie viele Sterne sie geben (1 bis 3).
 * Nur der Inhaber aendert ihn; alle Mitglieder sehen ihn.
 */
export async function OrgOutcomeCatalog({ orgId, isOwner, items }: { orgId: string; isOwner: boolean; items: OutcomeCatalogItem[] }) {
  const t = await getTranslations("advisor.teamProgram");
  const label = (item: OutcomeCatalogItem) => (item.defaultKey ? t(`outcome_${item.defaultKey}`) : (item.title ?? ""));
  return (
    <section aria-labelledby="catalog-title" className="grid gap-4">
      <div>
        <h2 id="catalog-title" className="text-xl font-semibold text-slate-950">{t("catalogTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("catalogText")}</p>
        <p className="mt-2 max-w-2xl rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("catalogNote")}</p>
      </div>
      {isOwner ? (
        <details className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("catalogNew")}</summary>
          <form action={saveOutcomeCatalogItemAction} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="orgId" value={orgId} />
            <label className="min-w-0 flex-1">
              <span className="block text-xs text-slate-500">{t("catalogItemTitle")}</span>
              <input name="title" required maxLength={120} className={`${FIELD} w-full`} />
            </label>
            <label>
              <span className="block text-xs text-slate-500">{t("catalogStars")}</span>
              <select name="stars" defaultValue="1" className={FIELD}>
                <option value="1">★</option>
                <option value="2">★★</option>
                <option value="3">★★★</option>
              </select>
            </label>
            <SubmitButton label={t("catalogAdd")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white" />
          </form>
        </details>
      ) : null}
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {items.map((item) => (
          <li key={item.catalogId} className={`flex flex-wrap items-center justify-between gap-3 px-4 py-2 ${item.active ? "" : "opacity-60"}`}>
            <span className="min-w-0 text-sm font-medium text-slate-900">{label(item)}</span>
            {isOwner ? (
              <form action={saveOutcomeCatalogItemAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="catalogId" value={item.catalogId} />
                <input type="hidden" name="title" value={item.title ?? ""} />
                <input type="hidden" name="activeFlag" value="1" />
                <select name="stars" defaultValue={String(item.stars)} aria-label={t("catalogStars")} className={`${FIELD} mt-0`}>
                  <option value="1">★</option>
                  <option value="2">★★</option>
                  <option value="3">★★★</option>
                </select>
                <select name="active" defaultValue={item.active ? "yes" : "no"} aria-label={t("catalogActive")} className={`${FIELD} mt-0`}>
                  <option value="yes">{t("catalogOn")}</option>
                  <option value="no">{t("catalogOff")}</option>
                </select>
                <SubmitButton label={t("catalogSave")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700" />
              </form>
            ) : (
              <span className="text-sm text-amber-500" aria-label={t("outcomeStarsLabel", { count: item.stars })}>{"★".repeat(item.stars)}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
