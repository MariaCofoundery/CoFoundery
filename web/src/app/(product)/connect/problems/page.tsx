import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectProfilesByUserIds } from "@/features/connect/connectData";
import { getActiveConnectProblems } from "@/features/connect/connectProblemData";
import { CONNECT_GEOGRAPHIC_SCOPES, CONNECT_PROBLEM_INTENTS } from "@/features/connect/connectTypes";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { knownKey } from "@/i18n/knownKey";

const card = "rounded-3xl border border-slate-200 bg-white p-6";
const field =
  "min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const action = "inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold";

/**
 * Das Problembrett.
 *
 * Sortiert ausschliesslich nach Aktualitaet. Keine Sortierung nach Zuspruch,
 * keine Hervorhebung des Meistbeachteten - das waere eine Rangliste, und genau
 * die soll hier nicht entstehen.
 */
export default async function ConnectProblemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, filters] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client } = await requireConnectMember("/connect/problems");
  const problems = await getActiveConnectProblems(client, filters);
  const authors = await getConnectProfilesByUserIds(
    client,
    problems.map((problem) => problem.author_user_id).filter((id): id is string => id !== null)
  );

  const isFiltered = ["q", "intent", "geographic_scope"].some(
    (key) => (filters[key] ?? "").trim().length > 0
  );
  const errorKey = knownKey(filters.error, CONNECT_ERROR_KEYS);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/connect" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">
        ← {t("navigation.overview")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("problems.title")}</h1>
      <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("problems.text")}</p>

      {errorKey ? (
        <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/connect/problems/new" className={`${action} bg-[color:var(--brand-primary)]`}>
          {t("problems.create")}
        </Link>
      </div>

      {/* Wozu das Brett da ist.
          Der erste Absatz steht offen, weil ohne ihn niemand weiss, warum hier
          Probleme statt Ideen stehen. Der Rest ist eingeklappt: Wer das einmal
          gelesen hat, will es beim zweiten Besuch nicht wieder ueber der Liste
          haben. */}
      <section className={`${card} mt-6 border-violet-100 bg-violet-50/40`}>
        <h2 className="text-lg font-semibold">{t("problems.usageTitle")}</h2>
        <p className="mt-2 leading-7 text-slate-700">{t("problems.usageLead")}</p>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold text-violet-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
            {t("problems.usageWaysTitle")}
          </summary>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            {(["read", "join", "write"] as const).map((way) => (
              <li key={way} className="flex gap-3">
                <span aria-hidden className="text-violet-700">
                  ·
                </span>
                <span>{t(`problems.usageWays.${way}`)}</span>
              </li>
            ))}
          </ul>

          {/* Die Einschraenkung gehoert dazu, nicht ans Ende einer AGB:
              Ein Brett, das Geschaeftsideen verspricht, waere unehrlich. */}
          <h3 className="mt-5 text-sm font-semibold text-slate-900">
            {t("problems.usageCaveatTitle")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{t("problems.usageCaveat")}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{t("problems.usageNext")}</p>
        </details>
      </section>

      <section className={`${card} mt-6`}>
        <h2 className="text-lg font-semibold">{t("filters.title")}</h2>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            className={`${field} sm:col-span-2 lg:col-span-3`}
            placeholder={t("problems.searchPlaceholder")}
            aria-label={t("problems.searchPlaceholder")}
          />
          <select name="intent" defaultValue={filters.intent || ""} className={field} aria-label={t("problems.intentLabel")}>
            <option value="">{t("problems.allIntents")}</option>
            {CONNECT_PROBLEM_INTENTS.map((value) => (
              <option key={value} value={value}>
                {t(`problems.intents.${value}`)}
              </option>
            ))}
          </select>
          <select
            name="geographic_scope"
            defaultValue={filters.geographic_scope || ""}
            className={field}
            aria-label={t("filters.scope")}
          >
            <option value="">{t("filters.allScopes")}</option>
            {CONNECT_GEOGRAPHIC_SCOPES.map((value) => (
              <option key={value} value={value}>
                {t(`scopes.${value}`)}
              </option>
            ))}
          </select>
          <button type="submit" className={`${action} border border-slate-200`}>
            {t("filters.apply")}
          </button>
        </form>
      </section>

      {problems.length ? (
        <section aria-label={t("problems.title")} className="mt-6 space-y-4">
          {problems.map((problem) => {
            const author = problem.author_user_id ? authors.get(problem.author_user_id) : undefined;
            return (
              <article key={problem.id} className={card}>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-700">
                  {t(`problems.intents.${problem.author_intent}`)} · {t(`scopes.${problem.geographic_scope}`)}
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  <Link href={`/connect/problems/${problem.id}`} className="hover:underline">
                    {problem.title}
                  </Link>
                </h3>
                <p className="mt-2 line-clamp-3 leading-7 text-slate-700">{problem.description}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <span>{problem.author_user_id === null
                    ? t("problems.formerMember")
                    : author?.display_name ?? t("problems.unknownAuthor")}</span>
                  {/* Nur die Zahlen, nie die Namen - und nie als Sortierkriterium. */}
                  <span className="flex flex-wrap gap-x-3">
                    {problem.confirmation_count > 0 ? (
                      <span>
                        {t("problems.confirmationsCount", { count: problem.confirmation_count })}
                      </span>
                    ) : null}
                    <span>{t("problems.interestCount", { count: problem.interest_count })}</span>
                  </span>
                </div>
                {problem.locations.length || problem.topics.length ? (
                  <p className="mt-3 text-sm text-slate-500">
                    {[...problem.locations, ...problem.topics].join(" · ")}
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className={`${card} mt-6 text-center`}>
          <h2 className="text-xl font-semibold">
            {t(isFiltered ? "problems.emptyFiltered" : "problems.emptyFirst")}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t(isFiltered ? "problems.emptyFilteredText" : "problems.emptyFirstText")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {isFiltered ? (
              <Link href="/connect/problems" className={`${action} border border-slate-200`}>
                {t("empty.reset")}
              </Link>
            ) : null}
            <Link href="/connect/problems/new" className={`${action} bg-[color:var(--brand-primary)]`}>
              {t("problems.create")}
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
