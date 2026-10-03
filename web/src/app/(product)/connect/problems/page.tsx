import { ConnectPagination } from "@/features/connect/ConnectPagination";
import { CONNECT_PAGE_SIZE } from "@/features/connect/connectBrowsePage";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { ConnectTabs } from "@/features/connect/ConnectTabs";
import { getConnectTabCounts } from "@/features/connect/connectPeopleData";
import { getConnectProfilesByUserIds } from "@/features/connect/connectData";
import { getActiveConnectProblems } from "@/features/connect/connectProblemData";
import { CONNECT_GEOGRAPHIC_SCOPES, CONNECT_PROBLEM_INTENTS } from "@/features/connect/connectTypes";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { knownKey } from "@/i18n/knownKey";

const card = "min-w-0 break-words rounded-3xl border border-slate-200 bg-white p-5 sm:p-6";
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
  const { client, user } = await requireConnectMember("/connect/problems");
  const [problemsRows, tabCounts] = await Promise.all([
    getActiveConnectProblems(client, filters),
    getConnectTabCounts(client, user.id),
  ]);
  const problems = problemsRows.slice(0, CONNECT_PAGE_SIZE);
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
      <header className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-cyan-50/50 p-5 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-700">{t("problemHub.nav")}</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{t("problemHub.title")}</h1>
        <div className="mt-5 max-w-2xl space-y-3 leading-7 text-slate-700">
          {(["opening", "purpose", "possibilities", "closing"] as const).map((paragraph) => (
            <p key={paragraph}>{t(`problemHub.${paragraph}`)}</p>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="#probleme" className={`${action} bg-slate-900 text-white hover:bg-slate-800`}>{t("problemHub.discover")}</Link>
          <Link href="/connect/problems/new" className={`${action} border border-slate-200 bg-white hover:bg-slate-50`}>{t("problemHub.create")}</Link>
        </div>
      </header>

      <section aria-labelledby="problem-process-title" className="mt-6 rounded-2xl bg-slate-50 p-5">
        <h2 id="problem-process-title" className="font-semibold">{t("problemHub.processTitle")}</h2>
        <ol className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-sm font-medium text-slate-700">
          {(["notice", "perspectives", "together", "possibility"] as const).map((step, index) => (
            <li key={step} className="flex gap-3">
              {index > 0 ? <span aria-hidden="true" className="text-violet-600">→</span> : null}
              <span>{t(`problemHub.steps.${step}`)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm leading-6 text-slate-600">{t("problemHub.workspaceHint")}</p>
        <Link href="/connect/workspaces" className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline underline-offset-4">{t("problemHub.workspaces")}</Link>
      </section>

      <section id="probleme" aria-labelledby="problem-list-title" className="mt-8 scroll-mt-24">
        <h2 id="problem-list-title" className="mb-4 text-2xl font-semibold">{t("problemHub.discover")}</h2>
        <ConnectTabs active="problems" counts={tabCounts} />
        {errorKey ? <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${errorKey}`)}</p> : null}

        <section className={`${card} mt-6`}>
          <h3 className="text-lg font-semibold">{t("problemHub.filterTitle")}</h3>
          <form action="/connect/problems#probleme" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <section aria-label={t("problemHub.discover")} className="mt-6 space-y-4">
            {problems.map((problem) => {
              const author = problem.author_user_id ? authors.get(problem.author_user_id) : undefined;
              return (
                <article key={problem.id} className={card}>
                  <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-700">
                    {t(`problems.intents.${problem.author_intent}`)}
                  </p>
                  <h3 className="mt-2 break-words text-xl font-semibold">
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
                  {problem.locations.length || problem.geographic_scope ? (
                    <p className="mt-3 text-sm text-slate-500">
                      {[...problem.locations, ...(problem.geographic_scope ? [t(`scopes.${problem.geographic_scope}`)] : [])].join(" · ")}
                    </p>
                  ) : null}
                  {problem.topics.length ? (
                    <ul aria-label={t("form.topics")} className="mt-3 flex flex-wrap gap-2">
                      {problem.topics.map((topic) => <li key={topic} className="max-w-full rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{topic}</li>)}
                    </ul>
                  ) : null}
                  <Link href={`/connect/problems/${problem.id}`} className={`${action} mt-4 border border-slate-200 hover:bg-slate-50`}>{t("problemHub.view")}</Link>
                </article>
              );
            })}
          </section>
        ) : (
          <section className={`${card} mt-6 text-center`}>
            <h3 className="text-xl font-semibold">
              {t(isFiltered ? "problems.emptyFiltered" : "problems.emptyFirst")}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t(isFiltered ? "problems.emptyFilteredText" : "problems.emptyFirstText")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {isFiltered ? (
                <Link href="/connect/problems#probleme" className={`${action} border border-slate-200`}>
                  {t("empty.reset")}
                </Link>
              ) : null}
              <Link href="/connect/problems/new" className={`${action} bg-[color:var(--brand-primary)]`}>
                {t("problems.create")}
              </Link>
            </div>
          </section>
        )}
        <ConnectPagination path="/connect/problems" filters={filters} count={problemsRows.length} />
      </section>
    </main>
  );
}
