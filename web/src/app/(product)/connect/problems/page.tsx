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
import { ProblemNight } from "@/features/connect/ProblemNight";
import { knownKey } from "@/i18n/knownKey";

const card = "problem-paper min-w-0 break-words p-5 sm:p-6";
const field = "problem-input";

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
    <ProblemNight>
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
      <header className="problem-hero">
        <p className="problem-hero__eyebrow">{t("problemHub.nav")}</p>
        <h1 className="problem-hero__title">{t("problemHub.title")}</h1>
        <p className="problem-hero__lead">{t("problemHub.opening")}</p>
        {problems.length ? (
          <ProblemTypewriter
            lines={problems.slice(0, 5).map((problem) => problem.title)}
            label={t("problemHub.nowOnBoard")}
          />
        ) : null}
        <div className="problem-hero__actions">
          <Link href="/connect/problems/new" className="problem-btn problem-btn--primary">{t("problemHub.create")}</Link>
          <Link href="#probleme" className="problem-btn problem-btn--ghost">{t("problemHub.discover")}</Link>
        </div>
        <details className="problem-hero__more">
          <summary>{t("problemHub.more")}</summary>
          {(["purpose", "possibilities", "closing"] as const).map((paragraph) => (
            <p key={paragraph}>{t(`problemHub.${paragraph}`)}</p>
          ))}
        </details>
      </header>

      <section aria-labelledby="problem-process-title" className="problem-glass mt-10">
        <h2 id="problem-process-title" className="problem-glass__title">{t("problemHub.processTitle")}</h2>
        <ol className="problem-steps">
          {(["notice", "perspectives", "together", "possibility"] as const).map((step, index) => (
            <li key={step}>
              <span aria-hidden="true" className="problem-steps__n">{index + 1}</span>
              <span>{t(`problemHub.steps.${step}`)}</span>
            </li>
          ))}
        </ol>
        <p className="problem-glass__note">{t("problemHub.workspaceHint")}</p>
        <Link href="/connect/workspaces" className="problem-glass__link">{t("problemHub.workspaces")}</Link>
      </section>

      <section id="probleme" aria-labelledby="problem-list-title" className="mt-12 scroll-mt-24">
        <h2 id="problem-list-title" className="text-2xl font-bold">{t("problemHub.discover")}</h2>
        {errorKey ? <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${errorKey}`)}</p> : null}

        <section aria-label={t("problemHub.filterTitle")} className="problem-glass mt-5">
          <form action="/connect/problems#probleme" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
            <input
              name="q"
              type="search"
              defaultValue={filters.q}
              className={`${field} sm:col-span-2 lg:col-span-1`}
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
            <button type="submit" className="problem-btn problem-btn--ghost justify-center">
              {t("filters.apply")}
            </button>
          </form>
        </section>

        {problems.length ? (
          <section aria-label={t("problemHub.discover")} className="mt-6">
            <p className="problem-board-wrap__hint">{t("problemHub.boardHint")}</p>
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
                <Link href="/connect/problems#probleme" className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold">
                  {t("empty.reset")}
                </Link>
              ) : null}
              <Link href="/connect/problems/new" className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold">
                {t("problems.create")}
              </Link>
            </div>
          </section>
        )}
        <ConnectPagination path="/connect/problems" filters={filters} count={problemsRows.length} />
      </section>
    </main>
    </ProblemNight>
  );
}
