import { ConnectPagination } from "@/features/connect/ConnectPagination";
import { CONNECT_PAGE_SIZE } from "@/features/connect/connectBrowsePage";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getConnectProfilesByUserIds } from "@/features/connect/connectData";
import { getActiveConnectProblems } from "@/features/connect/connectProblemData";
import { CONNECT_GEOGRAPHIC_SCOPES, CONNECT_PROBLEM_INTENTS } from "@/features/connect/connectTypes";
import { CONNECT_ERROR_KEYS } from "@/features/connect/connectFeedbackKeys";
import { ProblemTypewriter } from "@/features/connect/ProblemTypewriter";
import { knownKey } from "@/i18n/knownKey";

const card = "min-w-0 break-words rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6";
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
  const problemsRows = await getActiveConnectProblems(client, filters);
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
      <header className="brand-panel rounded-[28px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{t("problemHub.nav")}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">{t("problemHub.title")}</h1>
        <div className="mt-5 max-w-2xl space-y-3 leading-7 text-white">
          {(["opening", "purpose", "possibilities", "closing"] as const).map((paragraph) => (
            <p key={paragraph}>{t(`problemHub.${paragraph}`)}</p>
          ))}
        </div>
        {problems.length ? (
          <ProblemTypewriter
            lines={problems.slice(0, 5).map((problem) => problem.title)}
            label={t("problemHub.nowOnBoard")}
          />
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="#probleme" className={`${action} bg-white text-violet-800 hover:bg-violet-50`}>{t("problemHub.discover")}</Link>
          <Link href="/connect/problems/new" className={`${action} border border-white/60 bg-white/15 text-white hover:bg-white/25`}>{t("problemHub.create")}</Link>
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
          <section aria-label={t("problemHub.discover")} className="problem-stage mt-6">
            <p className="problem-stage__hint">{t("problemHub.boardHint")}</p>
            <div className="problem-board">
              {problems.map((problem, index) => {
                const author = problem.author_user_id ? authors.get(problem.author_user_id) : undefined;
                return (
                  <article
                    key={problem.id}
                    className="problem-note"
                    data-intent={problem.author_intent}
                    style={{ "--i": index } as React.CSSProperties}
                  >
                    <p className="problem-note__tag">{t(`problems.intents.${problem.author_intent}`)}</p>
                    <h3 className="problem-note__title">
                      <Link href={`/connect/problems/${problem.id}`}>{problem.title}</Link>
                    </h3>
                    <p className="problem-note__body line-clamp-4">{problem.description}</p>
                    {problem.topics.length ? (
                      <ul aria-label={t("form.topics")} className="problem-note__topics">
                        {problem.topics.map((topic) => <li key={topic}>{topic}</li>)}
                      </ul>
                    ) : null}
                    <div className="problem-note__foot">
                      <span>{problem.author_user_id === null
                        ? t("problems.formerMember")
                        : author?.display_name ?? t("problems.unknownAuthor")}</span>
                      {/* Nur die Zahlen, nie die Namen - und nie als Sortierkriterium. */}
                      <span className="problem-note__counts">
                        {problem.confirmation_count > 0 ? (
                          <span>{t("problems.confirmationsCount", { count: problem.confirmation_count })}</span>
                        ) : null}
                        <span>{t("problems.interestCount", { count: problem.interest_count })}</span>
                      </span>
                    </div>
                    {problem.locations.length || problem.geographic_scope ? (
                      <p className="problem-note__meta">
                        {[...problem.locations, ...(problem.geographic_scope ? [t(`scopes.${problem.geographic_scope}`)] : [])].join(" · ")}
                      </p>
                    ) : null}
                    <Link href={`/connect/problems/${problem.id}`} className="problem-note__open">{t("problemHub.view")}</Link>
                  </article>
                );
              })}
            </div>
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
