import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function FounderLibraryHomebaseCard({ teamId }: { teamId: string }) {
  const t = await getTranslations("founderLibrary.homebase");

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6" aria-labelledby="founder-library-homebase-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="founder-library-homebase-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t("description")}</p>
        </div>
        <Link href={`/teams/${encodeURIComponent(teamId)}/founder-library`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">{t("action")}</Link>
      </div>
    </section>
  );
}
