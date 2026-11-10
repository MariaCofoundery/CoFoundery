import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { adminListRecommendations } from "@/features/recommendations/recommendationsData";
import { adminDecideRecommendationAction } from "@/features/recommendations/recommendationsActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Empfehlungen pruefen: neue Eintraege (Software, Organisation, Projekt, zugestimmte Personen) und gemeldete Eintraege.
 * Ein Mensch entscheidet, nichts wird automatisch freigegeben. Gemeldete Eintraege sind bis zur Entscheidung nicht sichtbar.
 */
export default async function AdminRecommendationsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const client = await requirePlatformAdmin();
  const t = await getTranslations("connect.recommendations");
  const [query, items] = await Promise.all([searchParams, adminListRecommendations(client, "review")]);
  return (
    <main className="work-ui mx-auto flex w-full max-w-[960px] flex-col gap-6 px-6 pb-16 pt-9">
      <header>
        <Link href="/admin" className="inline-flex min-h-11 items-center text-sm text-slate-600 underline-offset-4 hover:underline">← {t("admin.back")}</Link>
        <h1 className="font-brand text-[2rem] font-semibold leading-tight text-slate-950">{t("admin.title")}</h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-7 text-slate-700">{t("admin.intro")}</p>
      </header>
      {query.ok === "1" ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("admin.done")}</p> : null}
      <p className="text-sm text-slate-700">{t("admin.count", { count: items.length })}</p>
      <ul className="grid gap-4">
        {items.map((r) => (
          <li key={r.id} className={`rounded-2xl border bg-white p-5 ${r.reportCount > 0 ? "border-rose-300" : "border-slate-200"}`}>
            <p className="flex flex-wrap items-center gap-2 text-xs font-bold"><span className="rounded-full bg-violet-100 px-3 py-1 text-violet-900">{t(`kinds.${r.kind}`)}</span>{r.reportCount > 0 ? <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-900">{t("admin.reports", { count: r.reportCount })}</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{t("admin.new")}</span>}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">{r.title}</h2>
            {r.sub ? <p className="text-sm text-slate-700">{r.sub}</p> : null}
            {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex min-h-9 items-center break-all text-sm font-semibold text-violet-800 underline underline-offset-2">{r.url}</a> : null}
            <p className="mt-2 border-l-4 border-violet-200 pl-3 text-[15px] leading-6 text-slate-900">„{r.comment}“</p>
            <p className="mt-2 text-[13px] text-slate-700">{t("by")} {r.authorName || "–"} · {r.topics.map((x) => t(`topics.${x}`)).join(", ") || "–"}{r.region ? ` · ${r.region}` : ""}</p>
            <p className="mt-1 text-xs text-slate-600">{t("admin.checkHint")}</p>
            <form action={adminDecideRecommendationAction} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={r.id} />
              <label className="min-w-56 flex-1"><span className="sr-only">{t("admin.note")}</span><input name="note" maxLength={300} placeholder={t("admin.note")} className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-[15px]" /></label>
              <SubmitButton intent="approve" fieldName="decision" label={t("admin.approve")} pendingLabel={t("admin.saving")} className="inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white" />
              <SubmitButton intent="remove" fieldName="decision" label={t("admin.remove")} pendingLabel={t("admin.saving")} className="inline-flex min-h-11 items-center rounded-xl border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-900" />
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
