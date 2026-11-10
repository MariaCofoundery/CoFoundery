import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { DOOR_GROUPS, DOOR_SECTORS, type DoorFilters, type DoorResult } from "@/features/connect/doors/doorCatalog";
import { doorMeta, doorTitle } from "@/features/connect/doors/doorLabels";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
const LABEL = "text-xs font-semibold uppercase tracking-[.12em] text-slate-500";

/**
 * "Zugang zu ..." auf der Seite "Menschen" (Entwurf 10.11.2026): ein eingeklappter Filter mit denselben Kacheln wie beim Anlegen
 * (hier als Auswahlfelder, ohne Skript). Ist er gesetzt, zeigt die Seite Tueren statt Personen. Sortiert nach Aktualitaet.
 */
export async function DoorSearch({ filters, results }: { filters: DoorFilters | null; results: DoorResult[] | null }) {
  const t = await getTranslations("connect.doors");
  const tt = (key: string, values?: Record<string, string | number>) => t(key, values);
  return (
    <section aria-labelledby="door-search-title" className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,.05)]">
      <details open={Boolean(filters)}>
        <summary id="door-search-title" className="inline-flex min-h-11 cursor-pointer items-center text-base font-semibold text-slate-950">{t("search.title")}</summary>
        <form method="get" className="mt-2 grid gap-3">
          <p className="max-w-2xl text-sm leading-6 text-slate-700">{t("search.hint")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className={LABEL}>{t("search.group")}
              <select name="tuer_gruppe" defaultValue={filters?.group ?? ""} className={FIELD}><option value="">–</option>{DOOR_GROUPS.map((group) => <option key={group.key} value={group.key}>{t(`groups.${group.key}`)}</option>)}</select>
            </label>
            <label className={LABEL}>{t("search.type")}
              <select name="tuer_art" defaultValue={filters?.types[0] ?? ""} className={FIELD}>
                <option value="">{t("search.allTypes")}</option>
                {DOOR_GROUPS.map((group) => <optgroup key={group.key} label={t(`groups.${group.key}`)}>{group.types.map((type) => <option key={type} value={type}>{t(`types.${type}`)}</option>)}</optgroup>)}
              </select>
            </label>
            <label className={LABEL}>{t("sector")}
              <select name="tuer_branche" defaultValue={filters?.sector ?? ""} className={FIELD}><option value="">{t("sectorNone")}</option>{DOOR_SECTORS.map((sector) => <option key={sector} value={sector}>{t(`sectors.${sector}`)}</option>)}</select>
            </label>
            <label className={LABEL}>{t("search.region")}<input name="tuer_region" maxLength={60} defaultValue={filters?.region ?? ""} className={FIELD} /></label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton label={t("search.show")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white" />
            {filters ? <Link href="/connect/people" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 underline underline-offset-2">{t("search.reset")}</Link> : null}
          </div>
        </form>
      </details>
      {results ? (
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-900" role="status">{t("search.results", { count: results.length })}</p>
          {results.length === 0 ? <p className="mt-2 text-sm text-slate-700">{t("search.none")}</p> : null}
          <ul className="mt-3 grid gap-4 md:grid-cols-2">
            {results.map((result) => (
              <li key={result.id} className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4">
                <Link href={`/connect/people/${result.userId}`} className="text-[15px] font-semibold text-slate-950 underline-offset-4 hover:underline">{result.displayName}</Link>
                {result.headline ? <span className="text-[13px] text-slate-600">{result.headline}</span> : null}
                <b className="mt-1 text-[15.5px] text-slate-950">{doorTitle(tt, result)}</b>
                <span className="text-[13.5px] text-slate-700">{doorMeta(tt, result)}</span>
                <span className="text-[13.5px] text-slate-900"><b>{t(`closeness.${result.closeness}.label`)}</b>{result.note ? <span className="text-slate-700"> · „{result.note}“</span> : null}</span>
                {result.doorsOpen ? (
                  <Link href={`/connect/people/${result.userId}/contact?tuer=${result.id}`} className="mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#6D49E0] px-4 text-sm font-semibold text-white hover:bg-[#5B36D6]">{t("card.ask")}</Link>
                ) : (
                  <span className="mt-1 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600">{t("card.paused")}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-slate-600">{t("search.footnote")}</p>
        </div>
      ) : null}
    </section>
  );
}
