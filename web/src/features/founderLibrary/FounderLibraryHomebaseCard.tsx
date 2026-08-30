import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function FounderLibraryHomebaseCard({ teamId }: { teamId: string }) {
  const t = await getTranslations("founderLibrary.homebase");

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-slate-50 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6" aria-labelledby="founder-library-homebase-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="founder-library-homebase-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{t("status")}</span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t("description")}</p>
        </div>
        <Link href={`/teams/${encodeURIComponent(teamId)}/founder-library`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">{t("action")}</Link>
      </div>
    </section>
  );
}
