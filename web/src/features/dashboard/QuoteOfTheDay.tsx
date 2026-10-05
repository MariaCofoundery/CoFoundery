import { getTranslations } from "next-intl/server";
import { quoteIndexFor } from "@/features/dashboard/quoteDayIndex";

/**
 * Zitat des Tages (Phase 11.5): klein, ruhig, kuratiert - kein Zufall, keine KI.
 * Founder- und Advisor-Dashboard nutzen dieselbe Komponente und denselben Satz.
 */
export async function QuoteOfTheDay({ className = "" }: { className?: string }) {
  const t = await getTranslations("common.quoteOfTheDay");
  return (
    <figure className={`flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 ${className}`}>
      <span aria-hidden="true" className="mt-0.5 text-2xl leading-none text-violet-400">“</span>
      <div>
        <figcaption className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("eyebrow")}</figcaption>
        <blockquote className="mt-1 text-sm leading-6 text-slate-700">{t(`quotes.q${quoteIndexFor(new Date())}`)}</blockquote>
      </div>
    </figure>
  );
}
