import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { listOwnRecommendations, listRecommendations, recommendationKindCounts, recommendationRegions } from "@/features/recommendations/recommendationsData";
import { decideRecommendationConsentAction, renewRecommendationAction, reportRecommendationAction, withdrawRecommendationAction } from "@/features/recommendations/recommendationsActions";
import { REC_KINDS, REC_REPORT_CATEGORIES, REC_SINCE, REC_TOPICS, parseRecFilters } from "@/features/recommendations/recommendationsModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const dynamic = "force-dynamic";

const CHIP = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50";
const FIELD = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px]";
const BTN = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold";

/**
 * Empfehlungen (Entwurf 10.11.2026): was und wen das Netzwerk empfiehlt. Keine Sterne, keine Rangfolge nach Beliebtheit,
 * sortiert nur nach Datum oder Name. Jeder Eintrag ist von einem Menschen geprueft; Personen sind nur nach Zustimmung zu sehen.
 */
export default async function RecommendationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { client, user } = await requireConnectMember("/connect/empfehlungen");
  const t = await getTranslations("connect.recommendations");
  const mine = sp.meine === "1";

  if (mine) {
    const own = await listOwnRecommendations(client, user.id);
    const badge = (status: string) => t(`status.${status}`);
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/connect/empfehlungen" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("back")}</Link>
        <h1 className="font-brand mt-2 text-3xl font-semibold text-slate-950">{t("mine.title")}</h1>
        {sp.neu === "consent" ? <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("mine.createdConsent")}</p> : sp.neu === "review" ? <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("mine.createdReview")}</p> : sp.ok === "1" ? <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("mine.saved")}</p> : null}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <section aria-labelledby="given" className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 id="given" className="text-lg font-semibold text-slate-950">{t("mine.given")}</h2>
            {own.given.length === 0 ? <p className="mt-3 text-sm text-slate-700">{t("mine.givenNone")}</p> : null}
            <ul className="mt-2 divide-y divide-slate-100">
              {own.given.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="min-w-0 flex-1"><b className="block text-[15px] text-slate-950">{r.title}</b><span className="text-[13px] text-slate-600">{t(`kinds.${r.kind}`)}</span></span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-800">{badge(r.status)}</span>
                  {r.status === "published" ? <form action={renewRecommendationAction}><input type="hidden" name="id" value={r.id} /><SubmitButton label={t("mine.renew")} pendingLabel={t("mine.saving")} className={`${BTN} text-violet-800`} /></form> : null}
                  {["pending_consent", "review", "published"].includes(r.status) ? <form action={withdrawRecommendationAction}><input type="hidden" name="id" value={r.id} /><SubmitButton label={t("mine.withdraw")} pendingLabel={t("mine.saving")} className={`${BTN} text-slate-700`} /></form> : null}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-5 text-slate-600">{t("mine.declinedNote")}</p>
          </section>
          <section aria-labelledby="about" className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 id="about" className="text-lg font-semibold text-slate-950">{t("mine.about")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">{t("mine.aboutHint")}</p>
            {own.aboutMe.length === 0 ? <p className="mt-3 text-sm text-slate-700">{t("mine.aboutNone")}</p> : null}
            <ul className="mt-3 grid gap-3">
              {own.aboutMe.map((r) => (
                <li key={r.id} className={`rounded-2xl border p-4 ${r.status === "pending_consent" ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
                  <b className="block text-[15px] text-slate-950">{t("mine.wants", { name: r.authorName || t("mine.someone") })}</b>
                  {r.status === "pending_consent" ? (
                    <>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-violet-800">{t("mine.preview")}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">{r.title}{r.sub ? <span className="font-normal text-slate-700"> · {r.sub}</span> : null}</p>
                      <p className="mt-1 border-l-4 border-violet-200 pl-3 text-sm leading-6 text-slate-900">„{r.comment}“</p>
                      <p className="mt-2 text-xs leading-5 text-slate-700">{t("mine.previewNote")}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form action={decideRecommendationConsentAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="accept" value="yes" /><SubmitButton label={t("mine.accept")} pendingLabel={t("mine.saving")} className={`${BTN} bg-emerald-800 text-white`} /></form>
                        <form action={decideRecommendationConsentAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="accept" value="no" /><SubmitButton label={t("mine.decline")} pendingLabel={t("mine.saving")} className={`${BTN} border border-slate-300 bg-white text-slate-950`} /></form>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">{t("mine.declineNote")}</p>
                    </>
                  ) : (
                    <>
                      <span className="mt-1 block text-[13px] text-slate-700">{badge(r.status)}</span>
                      {["review", "published"].includes(r.status) ? <form action={withdrawRecommendationAction} className="mt-1"><input type="hidden" name="id" value={r.id} /><SubmitButton label={t("mine.removeMine")} pendingLabel={t("mine.saving")} className={`${BTN} text-slate-700`} /></form> : null}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    );
  }

  const filters = parseRecFilters(sp);
  const [{ items, hasMore }, counts, regions] = await Promise.all([listRecommendations(client, filters), recommendationKindCounts(client), recommendationRegions(client)]);
  const active = filters.kinds.length + filters.topics.length + (filters.region ? 1 : 0) + (filters.q ? 1 : 0) + (filters.since ? 1 : 0);
  const pageHref = (page: number) => {
    const p = new URLSearchParams();
    filters.kinds.forEach((k) => p.append("was", k)); filters.topics.forEach((k) => p.append("thema", k));
    if (filters.region) p.set("region", filters.region); if (filters.q) p.set("suche", filters.q); if (filters.since) p.set("wann", filters.since);
    if (filters.sort === "alpha") p.set("sortieren", "alpha"); p.set("seite", String(page));
    return `/connect/empfehlungen?${p.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-brand text-3xl font-semibold text-slate-950 sm:text-4xl">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-slate-700">{t("intro")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/connect/empfehlungen?meine=1" className={`${BTN} border border-slate-300 bg-white text-slate-950`}>{t("mineLink")}</Link>
          <Link href="/connect/empfehlungen/neu" className={`${BTN} bg-violet-700 text-white`}>{t("giveLink")}</Link>
        </div>
      </header>
      {sp.gemeldet === "1" ? <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("reported")}</p> : null}

      <form method="get" className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-semibold text-slate-900">{t("filters.search")}
          <input type="search" name="suche" defaultValue={filters.q} placeholder={t("filters.searchPlaceholder")} className={FIELD} />
        </label>
        <fieldset><legend className="text-sm font-semibold text-slate-900">{t("filters.kind")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {REC_KINDS.map((k) => <label key={k} className={CHIP}><input type="checkbox" name="was" value={k} defaultChecked={filters.kinds.includes(k)} className="h-4 w-4" />{t(`kinds.${k}`)} <span className="text-xs font-normal text-slate-600">{counts[k] ?? 0}</span></label>)}
          </div>
        </fieldset>
        <fieldset><legend className="text-sm font-semibold text-slate-900">{t("filters.topic")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {REC_TOPICS.map((k) => <label key={k} className={CHIP}><input type="checkbox" name="thema" value={k} defaultChecked={filters.topics.includes(k)} className="h-4 w-4" />{t(`topics.${k}`)}</label>)}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-semibold text-slate-900">{t("filters.region")}
            <select name="region" defaultValue={filters.region} className={FIELD}><option value="">{t("filters.all")}</option>{regions.map((r) => <option key={r} value={r}>{r}</option>)}</select>
          </label>
          <label className="block text-sm font-semibold text-slate-900">{t("filters.when")}
            <select name="wann" defaultValue={filters.since} className={FIELD}><option value="">{t("filters.anytime")}</option>{REC_SINCE.map((d) => <option key={d} value={d}>{t(`filters.since.${d}`)}</option>)}</select>
          </label>
          <label className="block text-sm font-semibold text-slate-900">{t("filters.sort")}
            <select name="sortieren" defaultValue={filters.sort} className={FIELD}><option value="new">{t("filters.sortNew")}</option><option value="alpha">{t("filters.sortAlpha")}</option></select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label={t("filters.apply")} pendingLabel={t("filters.applying")} className={`${BTN} bg-violet-700 text-white`} />
          {active > 0 ? <Link href="/connect/empfehlungen" className={`${BTN} text-slate-700`}>{t("filters.reset")}</Link> : null}
        </div>
      </form>

      <p className="mt-5 text-sm text-slate-700" role="status">{t("count", { count: items.length })}</p>
      {items.length === 0 ? <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-4 text-[15px] text-slate-800">{active > 0 ? t("emptyFiltered") : t("empty")}</p> : null}
      <ul className="mt-3 grid gap-4 md:grid-cols-2">
        {items.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white p-5">
            <span className="self-start rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-900">{t(`kinds.${r.kind}`)}</span>
            <h2 className="text-lg font-semibold text-slate-950">
              {r.kind === "person" && r.subjectUserId ? <Link href={`/connect/people/${r.subjectUserId}`} className="underline-offset-4 hover:underline">{r.title}</Link>
                : r.kind === "project" && r.ventureId ? <Link href={`/connect/ventures/${r.ventureId}`} className="underline-offset-4 hover:underline">{r.title}</Link>
                : r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="underline-offset-4 hover:underline">{r.title}<span className="sr-only"> {t("opensNew")}</span></a> : r.title}
            </h2>
            {r.sub ? <p className="text-sm text-slate-700">{r.sub}</p> : null}
            <p className="border-l-4 border-violet-200 pl-3 text-[15px] leading-6 text-slate-900">„{r.comment}“</p>
            <p className="flex flex-wrap gap-1.5">{r.topics.map((x) => <span key={x} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">{t(`topics.${x}`)}</span>)}{r.region ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">{r.region}</span> : null}</p>
            <p className="text-[13px] text-slate-700">{t("by")} <b className="text-slate-950">{r.mine ? t("you") : r.authorName}</b></p>
            {!r.mine ? (
              <details className="mt-1">
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">{t("report.open")}</summary>
                <form action={reportRecommendationAction} className="mt-2 grid gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="text-sm font-semibold text-slate-900">{t("report.category")}
                    <select name="category" className={FIELD} defaultValue="other">{REC_REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{t(`report.categories.${c}`)}</option>)}</select>
                  </label>
                  <label className="text-sm font-semibold text-slate-900">{t("report.note")}
                    <textarea name="note" rows={2} maxLength={500} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-[15px]" />
                  </label>
                  <p className="text-xs leading-5 text-slate-600">{t("report.hint")}</p>
                  <SubmitButton label={t("report.send")} pendingLabel={t("report.sending")} className={`${BTN} self-start border border-slate-300 bg-white text-slate-950`} />
                </form>
              </details>
            ) : null}
          </li>
        ))}
      </ul>
      {filters.page > 1 || hasMore ? (
        <nav aria-label={t("pages")} className="mt-6 flex gap-3">
          {filters.page > 1 ? <Link href={pageHref(filters.page - 1)} className={`${BTN} border border-slate-300 bg-white`}>← {t("prev")}</Link> : null}
          {hasMore ? <Link href={pageHref(filters.page + 1)} className={`${BTN} border border-slate-300 bg-white`}>{t("next")} →</Link> : null}
        </nav>
      ) : null}
      <p className="mt-8 max-w-2xl text-xs leading-5 text-slate-600">{t("footnote")}</p>
    </main>
  );
}
