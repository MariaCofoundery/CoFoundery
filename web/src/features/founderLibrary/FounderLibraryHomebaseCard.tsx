import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function FounderLibraryHomebaseCard({ teamId }: { teamId: string }) {
  const t = await getTranslations("founderLibrary.homebase");

  // Sekundaer seit Phase 9.4B: eine schlichte Zeile unter "Zum Nachschlagen".
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="founder-library-homebase-title">
      <div>
        <h3 id="founder-library-homebase-title" className="text-sm font-semibold text-slate-950">{t("title")}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t("description")}</p>
      </div>
      <Link href={`/teams/${encodeURIComponent(teamId)}/founder-library`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{t("action")}</Link>
    </section>
  );
}
