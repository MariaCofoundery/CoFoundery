import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { OrgTeamProgram } from "@/features/advisor/teamProgramData";

/**
 * Das Programm auf einen Blick: Zaehler und Filter, keine Wertung.
 *
 * Gezaehlt wird, was die aufrufende Person sehen darf (der Inhaber alle
 * Programme, eine Bezugsperson ihre eigenen). Gefiltert wird nach Batch und
 * Kategorie; sortiert wird alphabetisch nach Teamname, nie nach Ergebnissen.
 */
export async function OrgProgramOverview({
  orgId,
  programs,
  batch,
  category,
}: {
  orgId: string;
  programs: OrgTeamProgram[];
  batch: string | null;
  category: string | null;
}) {
  const t = await getTranslations("advisor.teamProgram");
  const active = programs.filter((program) => program.isActive);
  const current = active.filter((program) => !program.isAlumni);
  const alumni = active.filter((program) => program.isAlumni);
  const count = (values: (string | null)[]) => {
    const map = new Map<string, number>();
    for (const value of values) if (value) map.set(value, (map.get(value) ?? 0) + 1);
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  };
  const batches = count(active.map((program) => program.batch));
  const categories = count(active.map((program) => program.category));
  const shown = active.filter(
    (program) => (!batch || program.batch === batch) && (!category || program.category === category),
  );
  const href = (nextBatch: string | null, nextCategory: string | null) => {
    const params = new URLSearchParams({ org: orgId });
    if (nextBatch) params.set("batch", nextBatch);
    if (nextCategory) params.set("category", nextCategory);
    return `/advisor/organisation?${params.toString()}`;
  };
  const chip = (selected: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${
      selected ? "brand-here font-semibold" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
    }`;

  if (programs.length === 0) return null;

  return (
    <section aria-labelledby="org-dash-title" className="grid gap-4">
      <div>
        <h2 id="org-dash-title" className="text-xl font-semibold text-slate-950">{t("dashTitle")}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-600">{t("dashText")}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [t("dashTeams"), current.length],
          [t("dashBatches"), batches.length],
          [t("dashCategories"), categories.length],
          [t("dashAlumni"), alumni.length],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <dd className="text-2xl font-extrabold tracking-tight text-slate-950">{value}</dd>
            <dt className="mt-0.5 text-xs leading-5 text-slate-600">{label}</dt>
          </div>
        ))}
      </dl>

      {batches.length > 0 ? (
        <nav aria-label={t("dashByBatch")} className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("dashByBatch")}</span>
          <Link href={href(null, category)} aria-current={!batch ? "page" : undefined} className={chip(!batch)}>{t("dashAll")}</Link>
          {batches.map(([name, n]) => (
            <Link key={name} href={href(name, category)} aria-current={batch === name ? "page" : undefined} className={chip(batch === name)}>
              {name} ({n})
            </Link>
          ))}
        </nav>
      ) : null}
      {categories.length > 0 ? (
        <nav aria-label={t("dashByCategory")} className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("dashByCategory")}</span>
          <Link href={href(batch, null)} aria-current={!category ? "page" : undefined} className={chip(!category)}>{t("dashAll")}</Link>
          {categories.map(([name, n]) => (
            <Link key={name} href={href(batch, name)} aria-current={category === name ? "page" : undefined} className={chip(category === name)}>
              {name} ({n})
            </Link>
          ))}
        </nav>
      ) : null}

      {shown.length === 0 ? (
        <p className="text-sm text-slate-600">{active.length === 0 ? t("dashEmpty") : t("dashNone")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((program) => (
            <li key={program.programId}>
              <Link href={`/advisor/programm/${program.programId}`} className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 hover:border-violet-300">
                <span className="font-semibold text-slate-900">{program.teamName ?? t("unnamedTeam")}</span>
                <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>{program.batch ?? t("dashNoBatch")}</span>
                  <span>· {program.category ?? t("dashNoCategory")}</span>
                  {program.isAlumni ? <span className="rounded-full bg-violet-50 px-2 font-semibold text-violet-800">{t("dashAlumni")}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
