import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getOwnConnectProblems } from "@/features/connect/connectProblemData";

/**
 * Meine Probleme (seit 05.11.2026): was jemand auf dem Problembrett geschildert hat - Entwuerfe
 * eingeschlossen. Stand bis dahin auf der Uebersicht von "Mein Connect"; jetzt im Bereich
 * "Probleme", neben Problembrett und Arbeitsraeumen (`ConnectProblemsNavigation`).
 */
export default async function MyConnectProblemsPage() {
  const t = await getTranslations("connect");
  const { client, user } = await requireConnectMember("/connect/problems/mine");
  const problems = await getOwnConnectProblems(client, user.id);
  return <main className="mx-auto max-w-5xl px-5 py-10">
    <header className="brand-panel flex flex-wrap items-end justify-between gap-4 rounded-[28px] p-6 sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{t("problemsArea.mineTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white">{t("problemsArea.mineText")}</p>
      </div>
      <Link href="/connect/problems/new" className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-violet-800">{t("problems.create")}</Link>
    </header>
    {/* Geschilderte Probleme stehen hier und nicht in einer zweiten
        Uebersicht: Ein Ort fuer alles, was man eingestellt hat. Und ohne
        diesen Abschnitt waeren Entwuerfe nur ueber den direkten Link
        erreichbar - eine Funktion, die halb gebaut ist. */}
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("my.problemsTitle")}</h2>
        <Link href="/connect/problems/new" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline">{t("problems.create")}</Link>
      </div>
      {problems.length ? <div className="mt-3 space-y-3">{problems.map((problem) => (
        <article key={problem.id} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500">
                {t(`problems.intents.${problem.author_intent}`)}
                {problem.status !== "active" ? ` · ${t(`problems.shortStatuses.${problem.status}`)}` : null}
              </p>
              <h3 className="mt-2 font-semibold">{problem.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{t("problems.interestCount", { count: problem.interest_count })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/connect/problems/${problem.id}`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-2 text-sm">{t("actions.details")}</Link>
              <Link href={`/connect/problems/${problem.id}/edit`} className="inline-flex min-h-11 items-center rounded-full border border-slate-200 px-3 py-2 text-sm">{t("actions.edit")}</Link>
            </div>
          </div>
        </article>
      ))}</div> : <p className="mt-2 text-sm text-slate-500">{t("my.problemsEmpty")}</p>}
    </section>
  </main>;
}
