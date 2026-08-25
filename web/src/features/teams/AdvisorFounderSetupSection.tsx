import { getTranslations } from "next-intl/server";
import {
  FOUNDER_SETUP_CATEGORY_KEYS,
  FOUNDER_SETUP_CATALOG,
} from "@/features/teams/founderSetupCatalog";
import type {
  AdvisorConfirmedFounderSetupItem,
  AdvisorFounderSetupAccessState,
} from "@/features/teams/founderSetupAdvisorAccessModel";
import { safeDocumentationHref } from "@/features/teams/founderSetupModel";
import { getPresentationLocale } from "@/i18n/presentationLocale";

export async function AdvisorFounderSetupSection({
  items,
  access,
  locale,
}: {
  items: AdvisorConfirmedFounderSetupItem[];
  access: AdvisorFounderSetupAccessState;
  locale: string;
}) {
  const t = await getTranslations("teams.setup");
  const byKey = new Map(items.map((item) => [item.itemKey, item]));
  const dateFormatter = new Intl.DateTimeFormat(getPresentationLocale(locale), {
    dateStyle: "medium",
  });

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      aria-labelledby="advisor-founder-setup-title"
    >
      <h2 id="advisor-founder-setup-title" className="text-lg font-semibold text-slate-950">
        {t("advisorView.title")}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {t("advisorView.subtitle")}
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
          {t(`advisorView.accessStatuses.${access.status}`)}
        </span>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t(`advisorView.accessDescriptions.${access.status}`)}
        </p>
      </div>

      {access.status === "active" && items.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
          {t("advisorView.empty")}
        </p>
      ) : null}

      {access.status === "active" && items.length > 0 ? <div className="mt-5 grid gap-5">
        {FOUNDER_SETUP_CATEGORY_KEYS.map((category) => {
          const categoryItems = FOUNDER_SETUP_CATALOG
            .filter((catalogItem) => catalogItem.category === category)
            .flatMap((catalogItem) => {
              const item = byKey.get(catalogItem.key);
              return item ? [item] : [];
            });
          if (categoryItems.length === 0) return null;
          return (
            <section key={category} aria-labelledby={`advisor-setup-category-${category}`}>
              <h3
                id={`advisor-setup-category-${category}`}
                className="text-sm font-semibold text-slate-900"
              >
                {t(`categories.${category}`)}
              </h3>
              <div className="mt-3 grid gap-3">
                {categoryItems.map((item) => {
                  const href = safeDocumentationHref(item.documentationReference);
                  return (
                    <article
                      key={item.itemKey}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-950">
                          {t(`items.${item.itemKey}.title`)}
                        </h4>
                        <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                          {t(`statuses.${item.resolutionStatus}`)}
                        </span>
                      </div>
                      {item.note ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {item.note}
                        </p>
                      ) : null}
                      {item.documentationReference ? (
                        <p className="mt-3 text-sm text-slate-600">
                          <span className="font-medium text-slate-700">
                            {t("advisorView.documentationReference")}: {" "}
                          </span>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-4"
                            >
                              {item.documentationReference} ↗
                            </a>
                          ) : item.documentationReference}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs text-slate-500">
                        {t("advisorView.confirmedAt", {
                          date: dateFormatter.format(new Date(item.confirmedAt)),
                        })}
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div> : null}
    </section>
  );
}
