import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { deleteHighlightPlacementAction, saveHighlightPlacementAction } from "@/features/connect/highlightPlacementActions";
import { placementState, type PlacementRow } from "@/features/connect/highlightPlacementModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Candidate = { kind: "listing" | "venture" | "person" | "problem"; id: string; title: string | null; owner_name: string | null; at: string | null; placed: boolean };
const PATH = { listing: "listings", venture: "ventures", person: "people", problem: "problems" } as const;
const input = "mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const button = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50";

export default async function HighlightsAdminPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const [t, locale, { data, error }] = await Promise.all([
    getTranslations("connect.highlightAdmin"),
    getLocale(),
    client.rpc("admin_list_connect_highlight_placements"),
  ]);
  const candidatesResult = await client.rpc("admin_list_highlight_candidates");
  const candidates = (candidatesResult.error ? [] : (candidatesResult.data ?? [])) as Candidate[];
  const rows = (error ? [] : (data ?? [])) as PlacementRow[];
  const day = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
  const defaultEnd = new Date(Date.now() + 28 * 86_400_000).toISOString().slice(0, 10);
  const result = typeof params.result === "string" ? params.result : null;
  const groups = (["running", "planned", "ended"] as const).map((state) => ({
    state,
    items: rows.filter((row) => placementState(row) === state),
  }));

  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
    <Link href="/admin" className="text-sm text-slate-600 underline">{"← "}{t("back")}</Link>
    <h1 className="mt-4 text-2xl font-semibold text-slate-950">{t("title")}</h1>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("intro")}</p>

    {result === "saved" || result === "deleted" ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{t(`results.${result}`)}</p> : null}
    {result && result !== "saved" && result !== "deleted" ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{t(`results.${result === "notfound" || result === "invalid" ? result : "error"}`)}</p> : null}
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{t("results.error")}</p> : null}

    <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
    <summary className="cursor-pointer text-sm font-semibold text-slate-800">{t("linkAlternative")}</summary>
    <form action={saveHighlightPlacementAction} className="mt-4 space-y-4">
      <h2 className="text-lg font-semibold text-slate-950">{t("newTitle")}</h2>
      <label className="block text-sm font-medium">{t("link")}
        <input name="link" required className={input} placeholder="https://made2found.de/connect/listings/…" />
        <span className="mt-1 block text-xs font-normal text-slate-500">{t("linkHint")}</span>
      </label>
      <fieldset>
        <legend className="text-sm font-medium">{t("source")}</legend>
        <div className="mt-2 space-y-2 text-sm">
          <label className="flex min-h-11 items-start gap-2"><input type="radio" name="source" value="editorial" defaultChecked className="mt-1" /><span><b>{t("sources.editorial")}</b><span className="block text-xs text-slate-500">{t("sourceHints.editorial")}</span></span></label>
          <label className="flex min-h-11 items-start gap-2"><input type="radio" name="source" value="sponsored" className="mt-1" /><span><b>{t("sources.sponsored")}</b><span className="block text-xs text-slate-500">{t("sourceHints.sponsored")}</span></span></label>
        </div>
      </fieldset>
      <label className="block text-sm font-medium">{t("note")}
        <textarea name="note" maxLength={240} rows={3} className={`${input} p-3`} />
        <span className="mt-1 block text-xs font-normal text-slate-500">{t("noteHint")}</span>
      </label>
      <label className="block text-sm font-medium">{t("endsOn")}
        <input name="ends_on" type="date" required defaultValue={defaultEnd} className={`${input} sm:max-w-xs`} />
      </label>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name="pinned" value="yes" className="mt-1 h-4 w-4" />
        <span><b>{t("pin")}</b><span className="mt-0.5 block text-xs font-normal text-slate-500">{t("pinHint")}</span></span>
      </label>
      <SubmitButton label={t("save")} pendingLabel={t("saving")} className={button} />
    </form>
    </details>

    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="pick-title">
      <h2 id="pick-title" className="text-lg font-semibold text-slate-950">{t("pick.title")}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{t("pick.intro")}</p>
      {candidatesResult.error ? <p role="alert" className="mt-3 text-sm text-red-900">{t("pick.error")}</p> : candidates.length === 0 ? <p className="mt-3 text-sm text-slate-500">{t("pick.empty")}</p> : <ul className="mt-4 divide-y divide-slate-100">
        {candidates.map((item) => <li key={`${item.kind}-${item.id}`} className="py-3">
          <details>
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm [&::-webkit-details-marker]:hidden">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{t(`kinds.${item.kind}`)}</span>
              <span className="min-w-0 flex-1 font-semibold text-slate-950 [overflow-wrap:anywhere]">{item.title ?? t("gone")}</span>
              {item.owner_name && item.kind !== "person" ? <span className="text-slate-500">{item.owner_name}</span> : null}
              {item.placed ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">{t("pick.placed")}</span> : null}
              <span className="font-semibold text-violet-800">{t("pick.open")}</span>
            </summary>
            <form action={saveHighlightPlacementAction} className="mt-3 space-y-3 rounded-xl bg-slate-50 p-4">
              <input type="hidden" name="link" value={`/connect/${PATH[item.kind]}/${item.id}`} />
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex min-h-11 items-center gap-2"><input type="radio" name="source" value="editorial" defaultChecked />{t("sources.editorial")}</label>
                <label className="flex min-h-11 items-center gap-2"><input type="radio" name="source" value="sponsored" />{t("sources.sponsored")}</label>
              </div>
              <label className="block text-sm font-medium">{t("note")}
                <textarea name="note" maxLength={240} rows={2} className={`${input} p-3`} />
              </label>
              <label className="block text-sm font-medium">{t("endsOn")}
                <input name="ends_on" type="date" required defaultValue={defaultEnd} className={`${input} sm:max-w-xs`} />
              </label>
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input type="checkbox" name="pinned" value="yes" className="mt-1 h-4 w-4" />
                <span><b>{t("pin")}</b><span className="mt-0.5 block text-xs font-normal text-slate-500">{t("pinHint")}</span></span>
              </label>
              <SubmitButton label={t("pick.save")} pendingLabel={t("saving")} className={button} />
            </form>
          </details>
        </li>)}
      </ul>}
    </section>

    {groups.map(({ state, items }) => <section key={state} className="mt-8">
      <h2 className="text-lg font-semibold text-slate-950">{t(`groups.${state}`)} <span className="text-sm font-normal text-slate-500">({items.length})</span></h2>
      {items.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t("none")}</p> : <ul className="mt-3 space-y-3">
        {items.map((row) => <li key={row.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 [overflow-wrap:anywhere]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-950">{row.title ?? t("gone")}</p>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.source === "sponsored" ? "bg-amber-100 text-amber-950" : "bg-violet-100 text-violet-900"}`}>{t(`sources.${row.source}`)}</span>
            {row.pinned ? <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-800">{t("pinnedTag")}</span> : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">{t(`kinds.${row.kind}`)}{row.owner_name ? ` · ${row.owner_name}` : ""} · {day(row.starts_at)} – {day(row.ends_at)}</p>
          {row.note ? <p className="mt-2 text-sm text-slate-700">{row.note}</p> : null}
          {state !== "ended" && row.title !== null && !row.owner_consent ? <p className="mt-2 text-xs text-amber-800">{t("noConsentHint")}</p> : null}
          {state === "running" && row.title === null ? <p className="mt-2 text-xs text-amber-800">{t("goneHint")}</p> : null}
          <form action={deleteHighlightPlacementAction} className="mt-3">
            <input type="hidden" name="id" value={row.id} />
            <SubmitButton label={t("remove")} pendingLabel={t("removing")} className={button} />
          </form>
        </li>)}
      </ul>}
    </section>)}
    <p className="mt-8 text-xs leading-5 text-slate-500">{t("visibilityHint")}</p>
  </main>;
}
