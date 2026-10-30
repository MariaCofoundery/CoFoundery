import { getTranslations } from "next-intl/server";
import { FOUNDER_SETUP_CATALOG, FOUNDER_SETUP_CATEGORY_KEYS } from "@/features/teams/founderSetupCatalog";
import type { AdvisorConfirmedFounderSetupItem } from "@/features/teams/founderSetupAdvisorAccessModel";
import { safeDocumentationHref } from "@/features/teams/founderSetupModel";
import { getPresentationLocale } from "@/i18n/presentationLocale";

/**
 * Das Founder Setup eines Programm-Teams, nur lesend: die gemeinsam bestaetigten Punkte.
 * Der Zugang kommt aus der Zustimmung zum Programm (get_program_confirmed_setup), nicht
 * aus einer Begleitbeziehung. Entwuerfe und Punkte, die nicht jede Person bestaetigt hat, fehlen.
 */
export async function ProgramSetupView({
  items,
  includesSetup,
  locale,
}: {
  items: AdvisorConfirmedFounderSetupItem[];
  includesSetup: boolean;
  locale: string;
}) {
  const t = await getTranslations("teams.setup");
  const tp = await getTranslations("advisor.teamProgram");
  const byKey = new Map(items.map((item) => [item.itemKey, item]));
  const dateFormatter = new Intl.DateTimeFormat(getPresentationLocale(locale), { dateStyle: "medium" });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="program-setup-title">
      <h2 id="program-setup-title" className="text-lg font-semibold text-slate-950">{tp("setupTitle")}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{includesSetup ? tp("setupText") : tp("setupNotIncluded")}</p>
      {includesSetup && items.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm leading-6 text-slate-600">{tp("setupEmpty")}</p>
      ) : null}
      {includesSetup && items.length > 0 ? (
        <div className="mt-5 grid gap-5">
          {FOUNDER_SETUP_CATEGORY_KEYS.map((category) => {
            const categoryItems = FOUNDER_SETUP_CATALOG
              .filter((catalogItem) => catalogItem.category === category)
              .flatMap((catalogItem) => {
                const item = byKey.get(catalogItem.key);
                return item ? [item] : [];
              });
            if (categoryItems.length === 0) return null;
            return (
              <section key={category}>
                <h3 className="text-sm font-semibold text-slate-900">{t(`categories.${category}`)}</h3>
                <div className="mt-3 grid gap-3">
                  {categoryItems.map((item) => {
                    const href = safeDocumentationHref(item.documentationReference);
                    return (
                      <article key={item.itemKey} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-950">{t(`items.${item.itemKey}.title`)}</h4>
                          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {t(`statuses.${item.resolutionStatus}`)}
                          </span>
                        </div>
                        {item.note ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.note}</p> : null}
                        {item.documentationReference ? (
                          <p className="mt-3 text-sm text-slate-600">
                            {href ? (
                              <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-4">{item.documentationReference} ↗</a>
                            ) : item.documentationReference}
                          </p>
                        ) : null}
                        <p className="mt-3 text-xs text-slate-500">{t("advisorView.confirmedAt", { date: dateFormatter.format(new Date(item.confirmedAt)) })}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
