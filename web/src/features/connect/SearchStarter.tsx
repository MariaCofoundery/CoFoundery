import Link from "next/link";
import { quickSaveConnectSearchAction } from "@/features/connect/savedSearchActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

type T = (key: string, values?: Record<string, string | number>) => string;

/**
 * "Sag uns, was du suchst" - die Suche ganz vorn. Ein Wort, ein Ort, ein Knopf; danach meldet sich Connect, wenn etwas Passendes erscheint.
 * Mit `compact` (kein Treffer, Suche gerade eingegeben) sind die Felder vorbefuellt und die Karte kleiner.
 */
export function SearchStarter({ t, topic = "", location = "", compact = false, savedCount = 0, topics = [], places = [] }: {
  t: T; topic?: string; location?: string; compact?: boolean; savedCount?: number; topics?: string[]; places?: string[];
}) {
  const field = "min-h-12 w-full rounded-xl border border-[#d8d5ea] bg-white px-4 text-base text-slate-900 placeholder:text-[#8a88a8]";
  return (
    <section aria-labelledby="search-starter-title" data-connect-search-starter
      className={`rounded-[22px] border border-[#cfc6f6] bg-[linear-gradient(120deg,#f4f0ff,#eaf6fb)] ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="search-starter-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t(compact ? "searches.starter.titleEmpty" : "searches.starter.title")}</h2>
          <p className="mt-1 max-w-xl text-[15px] leading-6 text-[#33325e]">{t("searches.starter.text")}</p>
        </div>
        {savedCount > 0 ? <Link href="/connect/searches" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline underline-offset-2">{t("searches.starter.manage", { count: savedCount })}</Link> : null}
      </div>
      <form action={quickSaveConnectSearchAction} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-1.5 text-[13px] font-semibold text-[#5f5e7a]">{t("searches.starter.what")}
          <input name="topic" required minLength={2} maxLength={60} defaultValue={topic} list="starter-topics" autoComplete="off" placeholder={t("searches.starter.whatPlaceholder")} className={field} />
          <datalist id="starter-topics">{topics.map((entry) => <option key={entry} value={entry} />)}</datalist>
        </label>
        <label className="grid gap-1.5 text-[13px] font-semibold text-[#5f5e7a]">{t("searches.starter.where")}
          <input name="location" maxLength={60} defaultValue={location} list="starter-places" autoComplete="off" placeholder={t("searches.starter.wherePlaceholder")} className={field} />
          <datalist id="starter-places">{places.map((entry) => <option key={entry} value={entry} />)}</datalist>
        </label>
        <SubmitButton label={t("searches.starter.save")} pendingLabel={t("pending.save")} className="min-h-12 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-base font-semibold text-white" />
      </form>
      <p className="mt-3 text-[13px] leading-5 text-[#5f5e7a]">{t("searches.starter.note")}</p>
    </section>
  );
}
